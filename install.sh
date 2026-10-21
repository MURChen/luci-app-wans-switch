#!/bin/sh
# 出口切换插件安装脚本（在路由器上以 root 执行）
# 用法: sh install.sh

set -e

BASE=$(cd "$(dirname "$0")" && pwd)
[ -d "$BASE/root" ] || BASE="$PWD"
[ -d "$BASE/root" ] || { echo "找不到 root/ 目录，请在插件目录内执行" >&2; exit 1; }

if [ "$(id -u)" != "0" ]; then
	echo "请用 root 执行" >&2
	exit 1
fi

echo "==> 复制文件"
cp -r "$BASE/root/." /

chmod 755 /usr/sbin/wansel /usr/sbin/wansel-daemon /etc/init.d/wansel
chmod 644 /usr/lib/wansel/common.sh
chmod 644 /usr/share/luci/menu.d/luci-app-wans-switch.json
chmod 644 /usr/share/rpcd/acl.d/luci-app-wans-switch.json
chmod 644 /www/luci-static/resources/view/wan_switch/overview.js

echo "==> 启用服务"
/etc/init.d/wansel enable
/etc/init.d/wansel restart 2>/dev/null || /etc/init.d/wansel start

echo "==> 重载 rpcd 权限"
/etc/init.d/rpcd reload

echo "==> 清理 LuCI 菜单缓存"
rm -f /tmp/luci-indexcache*

echo
if ! command -v conntrack >/dev/null 2>&1; then
	echo "提示: 未安装 conntrack，'清理连接' 功能不可用。"
	echo "      需要时执行: opkg update && opkg install conntrack"
	echo
fi

echo "安装完成。"
echo "请重新登录 LuCI（权限在登录时快照），然后打开 网络 -> 出口切换。"
