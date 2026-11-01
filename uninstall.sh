#!/bin/sh
# 出口切换插件卸载脚本（在路由器上以 root 执行）
# 用法: sh uninstall.sh
#
# 执行顺序:
#   1. 停止并禁用所有服务
#   2. 撤销对 OpenClash / dnsmasq 的外部改动
#   3. 删除插件文件与配置
#   4. 重载 rpcd / dnsmasq

set -e

if [ "$(id -u)" != "0" ]; then
	echo "请用 root 执行" >&2
	exit 1
fi

echo "==> 停止服务"
for s in wansel wansel-switchd wansel-egress wansel-egress-watchdog; do
	[ -x "/etc/init.d/$s" ] || continue
	/etc/init.d/$s stop 2>/dev/null || true
	/etc/init.d/$s disable 2>/dev/null || true
done

echo "==> 撤销外部改动"
# 关闭 OpenClash hook（会同时从 hook 脚本里移除我们的段落）
if [ -x /usr/sbin/wansel-egress ]; then
	/usr/sbin/wansel-egress hook off 2>/dev/null || true
	/usr/sbin/wansel-egress cleanup 2>/dev/null || true
fi

# 清理 dnsmasq 配置里的 nftset 标记块
if [ -f /etc/dnsmasq.conf ]; then
	cp /etc/dnsmasq.conf "/tmp/dnsmasq.conf.$$" 2>/dev/null || true
	awk '
		/# >>> wansel-egress nftset >>>/ { skip = 1; next }
		/# <<< wansel-egress nftset <<</ { skip = 0; next }
		!skip { print }
	' /etc/dnsmasq.conf > "/tmp/dnsmasq.new.$$" && \
		mv "/tmp/dnsmasq.new.$$" /etc/dnsmasq.conf
fi

echo "==> 删除文件"
rm -f /usr/sbin/wansel
rm -f /usr/sbin/wansel-daemon
rm -f /usr/sbin/wansel-switchd
rm -f /usr/sbin/wansel-egress
rm -f /usr/sbin/wansel-egress-watchdog
rm -f /etc/init.d/wansel
rm -f /etc/init.d/wansel-switchd
rm -f /etc/init.d/wansel-egress
rm -f /etc/init.d/wansel-egress-watchdog
rm -rf /usr/lib/wansel
rm -f /usr/share/luci/menu.d/luci-app-wans-switch.json
rm -f /usr/share/rpcd/acl.d/luci-app-wans-switch.json
rm -f /www/luci-static/resources/view/wan_switch/overview.js
rm -f /www/luci-static/resources/view/wan_switch/egress.js
rmdir /www/luci-static/resources/view/wan_switch 2>/dev/null || true

echo "==> 删除配置"
rm -rf /etc/wansel
rm -f /etc/config/wansel_egress
rm -rf /var/run/wansel-egress
rm -rf /tmp/wansel

echo "==> 重载服务"
rm -f /tmp/luci-indexcache*
/etc/init.d/rpcd reload 2>/dev/null || true
/etc/init.d/dnsmasq restart 2>/dev/null || true

echo
echo "卸载完成。"
echo "请重新登录 LuCI 让菜单变化生效。"
