#!/bin/sh
# wansel - 公共函数（WAN / 安卓 USB 共享 出口切换）
# 供 /usr/sbin/wansel 与 /usr/sbin/wansel-daemon 使用
#
# 接口不写死：所有 netifd 接口通过 ubus 动态发现，
# 按 l3_device / 接口名分类为 lan / wan / usb。

STATE_DIR="/tmp/wansel"
STATE_FILE="$STATE_DIR/active"          # 当前选择: wan | usb
STATUS_FILE="$STATE_DIR/status.json"    # daemon 写给前端的状态缓存
PROBE_FILE="$STATE_DIR/probe"           # 最近一次探测结果
EVENTS_FILE="$STATE_DIR/events"         # 事件日志
IFACES_CACHE="$STATE_DIR/ifaces.json"
IFACES_TS="$STATE_DIR/ifaces.ts"

SETTINGS_DIR="/etc/wansel"
SETTINGS_FILE="$SETTINGS_DIR/settings"  # 持久设置
TRAFFIC_FILE="$SETTINGS_DIR/traffic"    # 5G 流量累计（持久）

WANSEL_VERSION="1.3"
WANSEL_REPO="https://github.com/MURChen/luci-app-wans-switch"

OVERRIDE_METRIC=0
PROBE_NET="223.5.5.5"
CACHE_TTL=5

mkdir -p "$STATE_DIR" "$SETTINGS_DIR" 2>/dev/null

# ---------- 接口发现 ----------
# 缓存 5 秒的 ubus dump，避免前端每次轮询都重复调用
dump_cached() {
	local now ts
	now=$(date +%s)
	ts=$(cat "$IFACES_TS" 2>/dev/null || echo 0)
	case "$ts" in ''|*[!0-9]*) ts=0 ;; esac
	if [ -f "$IFACES_CACHE" ] && [ $((now - ts)) -lt "$CACHE_TTL" ]; then
		cat "$IFACES_CACHE"
	else
		ubus call network.interface dump > "$IFACES_CACHE" 2>/dev/null
		echo "$now" > "$IFACES_TS"
		cat "$IFACES_CACHE"
	fi
}

# 所有接口名
iface_names() {
	dump_cached | jsonfilter -e '@.interface[*].interface' 2>/dev/null
}

ifstat()      { [ -n "$1" ] || return 1; dump_cached | jsonfilter -e "@.interface[@.interface=\"$1\"]" 2>/dev/null; }
iface_dev()   { [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@.l3_device' 2>/dev/null; }
iface_up()    { [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@.up' 2>/dev/null; }
iface_proto() { [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@.proto' 2>/dev/null; }
iface_ip()    { [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null; }
iface_metric(){ [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@.metric' 2>/dev/null; }
iface_dns()   { [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@["dns-server"][0]' 2>/dev/null; }
iface_device(){ [ -n "$1" ] || return 1; ifstat "$1" | jsonfilter -e '@.device' 2>/dev/null; }

# 找 USB 共享接口（不要求 up，用于自动挂载）
find_usb_iface() {
	local n dev
	for n in $(iface_names); do
		case "$n" in loopback) continue ;; esac
		case "$n" in *tether*|*usb*) echo "$n"; return ;; esac
		dev=$(iface_device "$n")
		case "$dev" in usb*|rndis*|cdc*|enx*) echo "$n"; return ;; esac
	done
}

# 尝试挂载 USB 共享；$1=force 忽略 60 秒冷却
usb_autoup_try() {
	local force="$1" now last_ts uif kdev d drv
	now=$(date +%s)
	last_ts=$(cat "$STATE_DIR/usb_autoup_last" 2>/dev/null || echo 0)
	case "$last_ts" in ''|*[!0-9]*) last_ts=0 ;; esac
	if [ "$force" != "force" ] && [ $((now - last_ts)) -lt 60 ]; then
		return 0
	fi

	uif=$(find_usb_iface)

	# 内核层找 USB 网卡（不依赖设备名，按驱动判断）
	kdev=""
	for d in /sys/class/net/*; do
		drv=$(readlink "$d/device/driver" 2>/dev/null)
		case "$drv" in
			*rndis*|*cdc*|*usbnet*) kdev=$(basename "$d"); break ;;
		esac
	done

	if [ -n "$uif" ]; then
		# 接口存在但底层设备不在（手机没插/没共享）
		if [ -z "$(iface_device "$uif")" ] && [ -z "$kdev" ]; then
			echo "USB 共享设备未连接"
			return 1
		fi
		if [ "$(iface_up "$uif")" != "true" ] || [ -z "$(iface_ip "$uif")" ]; then
			ifup "$uif" >/dev/null 2>&1
			echo "$now" > "$STATE_DIR/usb_autoup_last"
			add_event info "USB 共享：接口 $uif 未就绪，已尝试挂载"
			echo "已尝试挂载接口 $uif"
		else
			echo "接口 $uif 已就绪"
		fi
	elif [ -n "$kdev" ]; then
		if [ -x /etc/init.d/gl-tethering ]; then
			/etc/init.d/gl-tethering restart >/dev/null 2>&1
			echo "$now" > "$STATE_DIR/usb_autoup_last"
			add_event info "USB 共享：检测到 $kdev，已重启 gl-tethering"
			echo "已重启 gl-tethering（设备 $kdev）"
		else
			echo "检测到 $kdev，但没有可用的 gl-tethering"
			return 1
		fi
	else
		echo "未检测到 USB 共享设备"
		return 1
	fi
}

# 网关：从这个接口的 main 表默认路由里取
# （jsonfilter 在本固件上不支持 @.route[@.target=...] 条件过滤，只用 ip route）
iface_gw() {
	local dev gw
	dev=$(iface_dev "$1")
	[ -n "$dev" ] || return 1
	gw=$(ip -4 route show default dev "$dev" 2>/dev/null \
		| sed -n 's/.* via \([^ ]*\).*/\1/p' | head -1)
	[ -n "$gw" ] && echo "$gw"
}

# 分类：lan / usb / wan / other
classify_iface() {
	local n="$1" dev="$2"
	case "$n" in
		loopback) echo "other"; return ;;
		lan)      echo "lan";   return ;;
	esac
	case "$dev" in
		br-lan|br-*) echo "lan"; return ;;
		usb*|rndis*|cdc*|enx*) echo "usb"; return ;;
	esac
	case "$n" in
		*tether*|*usb*) echo "usb"; return ;;
	esac
	echo "wan"
}

# 所有 IPv4 接口的 JSON 列表（供前端显示）
interfaces_json() {
	local n dev up proto ip gw metric kind first=1
	printf "["
	for n in $(iface_names); do
		dev=$(iface_dev "$n")
		[ -n "$dev" ] || continue
		case "$n" in loopback) continue ;; esac
		ip=$(iface_ip "$n")
		[ -n "$ip" ] || continue
		up=$(iface_up "$n")
		proto=$(iface_proto "$n")
		gw=$(iface_gw "$n")
		metric=$(iface_metric "$n")
		kind=$(classify_iface "$n" "$dev")
		[ $first -eq 1 ] || printf ","
		first=0
		printf '{"name":"%s","device":"%s","up":%d,"proto":"%s","ip":"%s","gw":"%s","metric":"%s","kind":"%s"}' \
			"$(json_esc "$n")" "$(json_esc "$dev")" \
			$([ "$up" = "true" ] && echo 1 || echo 0) \
			"$(json_esc "$proto")" "$(json_esc "$ip")" \
			"$(json_esc "$gw")" "$(json_esc "$metric")" "$kind"
	done
	printf "]"
}

# 解析实际使用的接口（优先用户手动指定，否则按分类自动选）
# WAN 候选优先级：wan 名字 > pppoe > eth 设备 > 其他 > wwan
wan_candidate_score() {
	local n="$1" dev="$2" proto="$3"
	case "$n" in
		wan)   echo 100; return ;;
		wwan)  echo 10;  return ;;
	esac
	case "$proto" in
		pppoe) echo 90; return ;;
	esac
	case "$dev" in
		pppoe*|ppp*) echo 90; return ;;
		eth*)        echo 80; return ;;
	esac
	echo 50
}

resolve_wan_if() {
	local manual n dev proto score best="" bestscore=-1
	manual=$(get_setting wan_if "")
	if [ -n "$manual" ] && [ -n "$(iface_dev "$manual")" ]; then
		echo "$manual"; return
	fi
	for n in $(iface_names); do
		dev=$(iface_dev "$n")
		[ -n "$dev" ] || continue
		[ "$(classify_iface "$n" "$dev")" = "wan" ] || continue
		[ -n "$(iface_ip "$n")" ] || continue
		proto=$(iface_proto "$n")
		score=$(wan_candidate_score "$n" "$dev" "$proto")
		if [ "$score" -gt "$bestscore" ]; then
			bestscore=$score
			best="$n"
		fi
	done
	[ -n "$best" ] && echo "$best"
}

resolve_usb_if() {
	local manual n
	manual=$(get_setting usb_if "")
	if [ -n "$manual" ] && [ -n "$(iface_dev "$manual")" ]; then
		echo "$manual"; return
	fi
	for n in $(iface_names); do
		[ -n "$(iface_dev "$n")" ] || continue
		[ "$(classify_iface "$n" "$(iface_dev "$n")")" = "usb" ] || continue
		[ -n "$(iface_ip "$n")" ] || continue
		echo "$n"; return
	done
	echo ""
}

# ---------- 状态 ----------
current_active() {
	local a
	a=$(head -1 "$STATE_FILE" 2>/dev/null | tr -d '\r\n')
	[ "$a" = "usb" ] || a="wan"
	echo "$a"
}

set_active() { echo "$1" > "$STATE_FILE"; }

# ---------- 设置 ----------
get_setting() {
	local key="$1" def="$2" v=""
	if [ -f "$SETTINGS_FILE" ]; then
		v=$(grep "^$key=" "$SETTINGS_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
	fi
	if [ -n "$v" ]; then echo "$v"; else echo "$def"; fi
}

# 读取必须是整数的设置，非法值回退默认
num_setting() {
	local v
	v=$(get_setting "$1" "$2")
	case "$v" in
		''|*[!0-9]*) echo "$2" ;;
		*) echo "$v" ;;
	esac
}

set_setting() {
	local key="$1" val="$2"
	[ -f "$SETTINGS_FILE" ] || : > "$SETTINGS_FILE"
	grep -v "^$key=" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" 2>/dev/null
	echo "$key=$val" >> "$SETTINGS_FILE.tmp"
	mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
}

json_esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/ /g'; }

# ---------- 事件 ----------
add_event() {
	local ts
	ts=$(date '+%m-%d %H:%M:%S')
	echo "$ts|$1|$2" >> "$EVENTS_FILE"
	if [ "$(wc -l < "$EVENTS_FILE" 2>/dev/null || echo 0)" -gt 100 ]; then
		tail -n 100 "$EVENTS_FILE" > "$EVENTS_FILE.tmp" && mv "$EVENTS_FILE.tmp" "$EVENTS_FILE"
	fi
}

events_json() {
	[ -f "$EVENTS_FILE" ] || { echo "[]"; return; }
	tail -n 30 "$EVENTS_FILE" 2>/dev/null | awk -F'|' '
		BEGIN { printf "["; first = 1 }
		{
			msg = $3
			gsub(/\\/, "\\\\", msg)
			gsub(/"/, "\\\"", msg)
			if (!first) printf ","
			first = 0
			printf "{\"time\":\"%s\",\"kind\":\"%s\",\"msg\":\"%s\"}", $1, $2, msg
		}
		END { printf "]" }
	'
}

# ---------- 探测 ----------
latency() {
	[ -n "$1" ] && [ -n "$2" ] || return 1
	ping -c 1 -W 1 -I "$1" "$2" 2>/dev/null | sed -n 's/.*time=\([0-9.]*\).*/\1/p' | head -1
}

probe_gw() {
	[ -n "$1" ] && [ -n "$2" ] || return 1
	ping -c 1 -W 1 -I "$1" "$2" >/dev/null 2>&1
}

# ---------- 路由 ----------
effective_dev() {
	ip -4 route get "$PROBE_NET" 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p' | head -1
}

remove_all_overrides() {
	local d
	for d in $(ip -4 route show default metric "$OVERRIDE_METRIC" 2>/dev/null \
			| sed -n 's/.* dev \([^ ]*\).*/\1/p'); do
		[ -n "$d" ] && ip route del default dev "$d" metric "$OVERRIDE_METRIC" 2>/dev/null
	done
}

apply_override() {
	local ifc="$1" dev gw ip
	dev=$(iface_dev "$ifc")
	gw=$(iface_gw "$ifc")
	ip=$(iface_ip "$ifc")
	[ -n "$dev" ] && [ -n "$gw" ] || return 1

	if [ "$(effective_dev)" = "$dev" ] && \
	   ip -4 route show default metric "$OVERRIDE_METRIC" 2>/dev/null | grep -q "via $gw dev $dev"; then
		return 0
	fi

	remove_all_overrides
	ip route add default via "$gw" dev "$dev" src "$ip" metric "$OVERRIDE_METRIC" 2>/dev/null
}

sync_routes() {
	local active usb_if
	active=$(current_active)
	if [ "$active" = "usb" ]; then
		usb_if=$(resolve_usb_if)
		[ -n "$usb_if" ] && apply_override "$usb_if"
	else
		remove_all_overrides
	fi
}

# ---------- conntrack ----------
lan_cidr() {
	local dev c
	dev=$(iface_dev lan)
	[ -n "$dev" ] || dev="br-lan"
	c=$(ip -4 route show dev "$dev" scope link 2>/dev/null | awk '{print $1}' | head -1)
	[ -n "$c" ] && echo "$c"
}

flush_conntrack() {
	local cidr ip ifn
	command -v conntrack >/dev/null 2>&1 || return 1

	cidr=$(lan_cidr)

	if [ -n "$cidr" ]; then
		conntrack -D -s "$cidr" >/dev/null 2>&1
		conntrack -D -d "$cidr" >/dev/null 2>&1
	fi

	# 2. 路由器自身各出口的连接：
	#    openclash 连节点、dnsmasq/mosdns 上游 DNS、NTP、opkg 更新等
	for ifn in $(resolve_wan_if) $(resolve_usb_if); do
		[ -n "$ifn" ] || continue
		ip=$(iface_ip "$ifn")
		[ -n "$ip" ] && conntrack -D -s "$ip" >/dev/null 2>&1
	done

	return 0
}

# 连接数统计：总 / 宽带 / USB / 局域网
conntrack_stats() {
	local wan_ip usb_ip lan_ip lan_prefix out
	command -v conntrack >/dev/null 2>&1 || { echo "0 0 0 0"; return; }

	wan_ip=$(iface_ip "$(resolve_wan_if)")
	usb_ip=$(iface_ip "$(resolve_usb_if)")
	lan_ip=$(iface_ip lan)

	# LAN 网段 192.168.x.0/24 -> 前缀 192.168.x.
	lan_prefix=$(lan_cidr)
	lan_prefix="${lan_prefix%/*}"
	lan_prefix="${lan_prefix%.*}"
	[ -n "$lan_prefix" ] && lan_prefix="${lan_prefix}."

	out=$(conntrack -L 2>/dev/null | awk -v w="$wan_ip" -v u="$usb_ip" -v l="$lan_prefix" -v li="$lan_ip" '
		{
			n++
			if (w != "" && index($0, "src=" w " ") > 0) wc++
			if (u != "" && index($0, "src=" u " ") > 0) uc++
			if (l != "" && index($0, "src=" l) > 0) {
				# 排除设备访问路由器本身（目的地址是 LAN 网关）
				if (li == "" || index($0, "dst=" li " ") == 0) lc++
			}
		}
		END { print n+0, wc+0, uc+0, lc+0 }')

	[ -n "$out" ] && echo "$out" || echo "0 0 0 0"
}

# ---------- 流量累计 ----------
traffic_get() {
	[ -f "$TRAFFIC_FILE" ] || { echo ""; return; }
	grep "^$1=" "$TRAFFIC_FILE" 2>/dev/null | head -1 | cut -d= -f2-
}

traffic_set_all() {
	{
		echo "month=$1"
		echo "rx=$2"
		echo "tx=$3"
		echo "last_rx=$4"
		echo "last_tx=$5"
	} > "$TRAFFIC_FILE.tmp" && mv "$TRAFFIC_FILE.tmp" "$TRAFFIC_FILE"
}

# ---------- 状态 JSON ----------
build_status_json() {
	local active auto wan_if usb_if wan_dev wan_up wan_ip wan_gw usb_dev usb_up usb_ip usb_gw
	local wan_gw_ms wan_net_ms usb_gw_ms usb_net_ms tr_month tr_rx tr_tx probe_iv

	active=$(current_active)
	auto=$(num_setting auto 1)

	wan_if=$(resolve_wan_if)
	usb_if=$(resolve_usb_if)

	wan_dev=$(iface_dev "$wan_if")
	wan_up=$(iface_up "$wan_if")
	wan_ip=$(iface_ip "$wan_if")
	wan_gw=$(iface_gw "$wan_if")

	usb_dev=$(iface_dev "$usb_if")
	usb_up=$(iface_up "$usb_if")
	usb_ip=$(iface_ip "$usb_if")
	usb_gw=$(iface_gw "$usb_if")

	wan_gw_ms=""; wan_net_ms=""; usb_gw_ms=""; usb_net_ms=""
	if [ -f "$PROBE_FILE" ]; then
		wan_gw_ms=$(grep '^wan_gw_ms=' "$PROBE_FILE" 2>/dev/null | cut -d= -f2-)
		wan_net_ms=$(grep '^wan_net_ms=' "$PROBE_FILE" 2>/dev/null | cut -d= -f2-)
		usb_gw_ms=$(grep '^usb_gw_ms=' "$PROBE_FILE" 2>/dev/null | cut -d= -f2-)
		usb_net_ms=$(grep '^usb_net_ms=' "$PROBE_FILE" 2>/dev/null | cut -d= -f2-)
	fi

	tr_month=$(traffic_get month)
	tr_rx=$(traffic_get rx); [ -n "$tr_rx" ] || tr_rx=0
	tr_tx=$(traffic_get tx); [ -n "$tr_tx" ] || tr_tx=0

	local tr_quota tr_base
	tr_quota=$(get_setting quota_gb 200)
	case "$tr_quota" in ''|*[!0-9]*) tr_quota=200 ;; esac
	tr_base=$(get_setting traffic_base_gb 0)
	case "$tr_base" in ''|*[!0-9]*) tr_base=0 ;; esac

	probe_iv=$(get_setting probe_interval 10)
	case "$probe_iv" in ''|*[!0-9]*) probe_iv=10 ;; esac

	# GL.iNet 物理拨动开关当前状态（非 GL 固件为 unknown）
	local sw_state=""
	if [ -f /lib/functions/gl_util.sh ]; then
		sw_state=$(. /lib/functions/gl_util.sh; get_switch_button_status 2>/dev/null)
	fi
	case "$sw_state" in
		on|off) ;;
		*) sw_state="unknown" ;;
	esac

	local rc
	rc=$(get_setting recover_conn flush)
	case "$rc" in flush|new|keep) ;; *) rc=flush ;; esac

	local ct_total ct_wan ct_usb ct_lan ct_stats
	ct_stats=$(conntrack_stats)
	ct_total=$(echo "$ct_stats" | awk '{print $1}')
	ct_wan=$(echo "$ct_stats" | awk '{print $2}')
	ct_usb=$(echo "$ct_stats" | awk '{print $3}')
	ct_lan=$(echo "$ct_stats" | awk '{print $4}')
	[ -n "$ct_total" ] || ct_total=0
	[ -n "$ct_wan" ] || ct_wan=0
	[ -n "$ct_usb" ] || ct_usb=0
	[ -n "$ct_lan" ] || ct_lan=0

	cat <<EOF
{
  "active": "$active",
  "auto": $auto,
  "version": "$WANSEL_VERSION",
  "repo": "$WANSEL_REPO",
  "flush_on_switch": $(num_setting flush_on_switch 1),
  "lan_cidr": "$(json_esc "$(lan_cidr)")",
  "has_conntrack": $(command -v conntrack >/dev/null 2>&1 && echo 1 || echo 0),
  "wan_if": "$(json_esc "$wan_if")",
  "usb_if": "$(json_esc "$usb_if")",
  "wan_manual": "$(json_esc "$(get_setting wan_if "")")",
  "usb_manual": "$(json_esc "$(get_setting usb_if "")")",
  "wan": {
    "name": "$(json_esc "$wan_if")",
    "dev": "$(json_esc "$wan_dev")",
    "up": $([ "$wan_up" = "true" ] && echo 1 || echo 0),
    "ip": "$(json_esc "$wan_ip")",
    "gw": "$(json_esc "$wan_gw")",
    "lat_gw": "$(json_esc "$wan_gw_ms")",
    "lat_net": "$(json_esc "$wan_net_ms")"
  },
  "usb": {
    "name": "$(json_esc "$usb_if")",
    "dev": "$(json_esc "$usb_dev")",
    "up": $([ "$usb_up" = "true" ] && echo 1 || echo 0),
    "ip": "$(json_esc "$usb_ip")",
    "gw": "$(json_esc "$usb_gw")",
    "lat_gw": "$(json_esc "$usb_gw_ms")",
    "lat_net": "$(json_esc "$usb_net_ms")"
  },
  "config": {
    "probe_gw": $(num_setting probe_gw 1),
    "probe_gw_target": "$(json_esc "$(get_setting probe_gw_target "")")",
    "probe_net": $(num_setting probe_net 1),
    "probe_net_target": "$(json_esc "$(get_setting probe_net_target "223.5.5.5")")",
    "fail_threshold": $(num_setting fail_threshold 3),
    "auto_recover": $(num_setting auto_recover 0),
    "recover_conn": "$rc",
    "probe_interval": $probe_iv,
    "usb_autoup": $(num_setting usb_autoup 1),
    "switch_enable": $(num_setting switch_enable 1),
    "switch_on_target": "$(get_setting switch_on_target "usb")",
    "switch_off_target": "$(get_setting switch_off_target "wan")",
    "switch_state": "$sw_state"
  },
  "traffic": { "month": "$(json_esc "$tr_month")", "rx": $tr_rx, "tx": $tr_tx, "quota_gb": $tr_quota, "base_gb": $tr_base },
  "conntrack": { "total": $ct_total, "wan": $ct_wan, "usb": $ct_usb, "lan": $ct_lan },
  "interfaces": $(interfaces_json),
  "events": $(events_json)
}
EOF
}
