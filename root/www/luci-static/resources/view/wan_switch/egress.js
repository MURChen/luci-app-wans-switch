'use strict';
'require view';
'require fs';
'require poll';
'require ui';
'require dom';

var EGRESS = '/usr/sbin/wansel-egress';

var CSS = [
'.wansel-root{max-width:1100px;margin:0 auto}',
'.wansel-root h3{background:transparent!important;border:0!important;padding:0!important;margin:0 0 12px!important;font-size:15px;font-weight:600}',

'.wansel-panel{border:1px solid var(--border-color-low,#e6e6e6);border-radius:14px;padding:16px 18px;',
'margin-bottom:16px;background:var(--background-color-high,#fff);box-shadow:0 1px 2px rgba(0,0,0,.04)}',

'.wansel-dark .wansel-panel{background:#2b2b2b;border-color:#3d3d3d;box-shadow:none}',
'.wansel-dark .wansel-table th{border-color:#3d3d3d;color:#a0a0a0}',
'.wansel-dark .wansel-table td{border-color:#333}',
'.wansel-dark .wansel-row span{color:#a0a0a0}',
'.wansel-dark .wansel-input{background:#1f1f1f!important;color:#eee!important;border-color:#4a4a4a!important}',
'.wansel-dark .wansel-stat-card{background:#333;border-color:#444}',

'.wansel-table{width:100%;border-collapse:collapse;font-size:13px}',
'.wansel-table th{text-align:left;font-weight:500;color:var(--text-color-medium,#777);padding:6px 8px;border-bottom:1px solid var(--border-color-low,#e6e6e6)}',
'.wansel-table td{padding:8px;border-bottom:1px solid var(--border-color-low,#f0f0f0)}',
'.wansel-mono{font-family:monospace}',

'.wansel-via{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}',
'.wansel-via-default{background:rgba(130,130,130,.15);color:#888}',
'.wansel-via-wan{background:rgba(47,179,68,.16);color:#2fb344}',
'.wansel-via-usb{background:rgba(33,150,243,.16);color:#2196f3}',

'.wansel-form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
'.wansel-input{padding:6px 10px;border-radius:8px;border:1px solid var(--border-color-low,#ccc);background:var(--background-color-high,#fff);font-size:13px}',
'.wansel-form .wansel-input:nth-of-type(1){flex:2;min-width:180px}',
'.wansel-form select{flex:1;min-width:110px}',

'.wansel-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}',
'.wansel-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}',
'@media(max-width:760px){.wansel-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}',
'.wansel-stat-card{background:var(--background-color-low,#f7f7f7);border:1px solid var(--border-color-low,#eee);border-radius:12px;padding:10px 14px}',
'.wansel-stat-label{font-size:11px;color:var(--text-color-medium,#888)}',
'.wansel-stat-value{font-size:18px;font-weight:600;margin-top:2px}',
'.wansel-stat-sub{font-size:11px;color:var(--text-color-medium,#999);margin-top:2px;font-family:monospace}',

'.wansel-switch{position:relative;display:inline-block;width:46px;height:26px;flex:none;cursor:pointer}',
'.wansel-switch input{opacity:0;width:0;height:0;position:absolute;margin:0}',
'.wansel-slider{position:absolute;inset:0;border-radius:999px;background:rgba(130,130,130,.45);transition:background .25s}',
'.wansel-slider::before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;',
'background:#fff;transition:transform .25s;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
'.wansel-switch input:checked + .wansel-slider{background:#2fb344}',
'.wansel-switch input:checked + .wansel-slider::before{transform:translateX(20px)}',

'.wansel-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--border-color-low,#f0f0f0)}',
'.wansel-switch-row:last-child{border-bottom:none}',
'.wansel-dark .wansel-switch-row{border-color:#333}',
'.wansel-switch-desc{font-size:12px;color:var(--text-color-medium,#888);margin-top:3px}',

'.wansel-empty{padding:18px;text-align:center;color:var(--text-color-medium,#999);font-size:13px}',
'.wansel-hint{font-size:12px;color:var(--text-color-medium,#888);margin-top:8px;line-height:1.6}'
].join('\n');

function badge(via) {
	var map = {
		'default': [ '跟随默认', 'wansel-via-default' ],
		'wan': [ '宽带', 'wansel-via-wan' ],
		'usb': [ '5G', 'wansel-via-usb' ]
	};
	var m = map[via] || [ via, 'wansel-via-default' ];
	return E('span', { 'class': 'wansel-via ' + m[1] }, [ m[0] ]);
}

function fmtBytes(n) {
	n = parseInt(n) || 0;
	if (n < 1024) return n + ' B';
	if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
	if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
	return (n / 1073741824).toFixed(2) + ' GB';
}

return view.extend({
	load: function() {
		return Promise.all([
			this.callList(),
			this.callStatus()
		]);
	},

	callList: function() {
		return fs.exec(EGRESS, [ 'list' ]).then(function(r) {
			try { return JSON.parse(r.stdout || '{"rules":[]}'); }
			catch (e) { return { rules: [] }; }
		}).catch(function() { return { rules: [] }; });
	},

	callStatus: function() {
		return fs.exec(EGRESS, [ 'status' ]).then(function(r) {
			try { return JSON.parse(r.stdout || '{}'); }
			catch (e) { return {}; }
		}).catch(function() { return {}; });
	},

	callConnections: function(filter) {
		return fs.exec(EGRESS, [ 'connections', filter || 'all' ]).then(function(r) {
			var lines = (r.stdout || '').split('\n').filter(function(l) { return l.trim(); });
			return lines.map(function(l) {
				var p = l.split('|');
				return {
					proto: p[0], src: p[1], dst: p[2], dport: p[3],
					bytes: parseInt(p[4]) || 0, via: p[5]
				};
			});
		}).catch(function() { return []; });
	},

	render: function(data) {
		var self = this;
		var rules = (data[0] && data[0].rules) || [];
		var st = data[1] || {};

		var root = E('div', { 'class': 'wansel-root' }, [
			E('style', {}, CSS),

			E('h2', {}, [ '策略出口' ]),

			E('div', { 'class': 'wansel-panel' }, [
				E('h3', {}, [ '出口状态' ]),
				E('div', { 'class': 'wansel-stats' }, [
					E('div', { 'class': 'wansel-stat-card' }, [
						E('div', { 'class': 'wansel-stat-label' }, [ '宽带' ]),
						E('div', { 'class': 'wansel-stat-value', 'id': 'ws-wan-ip' },
							[ st.wan_up === true ? '在线' : '离线' ]),
						E('div', { 'class': 'wansel-stat-sub', 'id': 'ws-wan-counter' },
							[ '命中: ' + (st.wan_counter || '0 0') ])
					]),
					E('div', { 'class': 'wansel-stat-card' }, [
						E('div', { 'class': 'wansel-stat-label' }, [ '5G' ]),
						E('div', { 'class': 'wansel-stat-value', 'id': 'ws-usb-ip' },
							[ st.usb_up === true ? '在线' : '离线' ]),
						E('div', { 'class': 'wansel-stat-sub', 'id': 'ws-usb-counter' },
							[ '命中: ' + (st.usb_counter || '0 0') ])
					]),
					E('div', { 'class': 'wansel-stat-card' }, [
						E('div', { 'class': 'wansel-stat-label' }, [ '宽带 IP 数 (v4/v6)' ]),
						E('div', { 'class': 'wansel-stat-value', 'id': 'ws-wan-count' },
							[ String(st.wan_count || 0) + ' / ' + String(st.wan_count6 || 0) ])
					]),
					E('div', { 'class': 'wansel-stat-card' }, [
						E('div', { 'class': 'wansel-stat-label' }, [ '5G IP 数 (v4/v6)' ]),
						E('div', { 'class': 'wansel-stat-value', 'id': 'ws-usb-count' },
							[ String(st.usb_count || 0) + ' / ' + String(st.usb_count6 || 0) ])
					])
				])
			]),

			E('div', { 'class': 'wansel-panel' }, [
				E('h3', {}, [ '快速填充' ]),
				E('div', { 'class': 'wansel-form' }, [
					E('select', { 'class': 'wansel-input', 'id': 'ws-preset', 'style': 'flex:1;min-width:160px' }, [
						E('option', { 'value': 'netease' }, [ '网易云音乐' ])
					]),
					E('select', { 'class': 'wansel-input', 'id': 'ws-preset-via', 'style': 'flex:1;min-width:110px' }, [
						E('option', { 'value': 'wan' }, [ '宽带' ]),
						E('option', { 'value': 'usb' }, [ '5G' ]),
						E('option', { 'value': 'default' }, [ '跟随默认' ])
					]),
					E('select', { 'class': 'wansel-input', 'id': 'ws-preset-family', 'style': 'flex:1;min-width:130px' }, [
						E('option', { 'value': 'both' }, [ 'IPv4+IPv6' ]),
						E('option', { 'value': 'ipv4' }, [ '仅 IPv4' ]),
						E('option', { 'value': 'ipv6' }, [ '仅 IPv6' ])
					]),
					E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': ui.createHandlerFn(this, function() { return self.handlePreset(); }) }, [ '一键填充' ])
				]),
				E('div', { 'class': 'wansel-hint' }, [
					'填充后只是写入规则，还需要点下面的「应用并重启 DNS」才会生效。'
				])
			]),

			E('div', { 'class': 'wansel-panel' }, [
				E('h3', {}, [ '规则列表' ]),
				E('table', { 'class': 'wansel-table' }, [
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ '类型' ]),
						E('th', {}, [ '值' ]),
						E('th', {}, [ '出口' ]),
						E('th', {}, [ '协议' ]),
						E('th', {}, [ '' ])
					])]),
					E('tbody', { 'id': 'ws-rule-body' },
						rules.length ? rules.map(function(r) { return self.renderRuleRow(r); }) :
							[ E('tr', {}, [ E('td', { 'colspan': '5', 'class': 'wansel-empty' }, [ '还没有规则' ]) ]) ])
				]),
				E('div', { 'class': 'wansel-form', 'style': 'margin-top:14px' }, [
					E('select', { 'class': 'wansel-input', 'id': 'ws-type' }, [
						E('option', { 'value': 'domain' }, [ '域名' ]),
						E('option', { 'value': 'ip' }, [ 'IP / CIDR' ])
					]),
					E('input', { 'class': 'wansel-input', 'id': 'ws-value', 'placeholder': '例如 music.126.net 或 36.150.226.93' }),
					E('select', { 'class': 'wansel-input', 'id': 'ws-via' }, [
						E('option', { 'value': 'default' }, [ '跟随默认' ]),
						E('option', { 'value': 'wan' }, [ '宽带' ]),
						E('option', { 'value': 'usb' }, [ '5G' ])
					]),
					E('select', { 'class': 'wansel-input', 'id': 'ws-family' }, [
						E('option', { 'value': 'both' }, [ 'IPv4+IPv6' ]),
						E('option', { 'value': 'ipv4' }, [ '仅 IPv4' ]),
						E('option', { 'value': 'ipv6' }, [ '仅 IPv6' ])
					]),
					E('button', { 'class': 'btn cbi-button cbi-button-add', 'click': ui.createHandlerFn(this, function() { return self.handleAdd(); }) }, [ '添加' ])
				]),
				E('div', { 'class': 'wansel-hint' }, [
					'「仅 IPv4」会让 dnsmasq 过滤该域名的 AAAA 记录，强制只解析 IPv4。'
				]),
				E('div', { 'class': 'wansel-actions' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, function() { return self.handleApply(false); }) }, [ '应用规则' ]),
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, function() { return self.handleApply(true); }) }, [ '应用并重启 DNS' ])
				]),
				E('div', { 'class': 'wansel-hint' }, [
					'「应用规则」只更新 nft 集合和路由，不重启 DNS；新加的域名要等「应用并重启 DNS」后才会开始解析收集。'
				])
			]),

			E('div', { 'class': 'wansel-panel' }, [
				E('h3', {}, [ 'OpenClash 集成' ]),
				E('div', { 'class': 'wansel-switch-row' }, [
					E('div', {}, [
						E('div', {}, [ '防火墙重载后自动重建规则' ]),
						E('div', { 'class': 'wansel-switch-desc' }, [
							'开启后，OpenClash 每次重载防火墙都会调用 wansel-egress apply，避免规则被清掉。'
						])
					]),
					E('label', { 'class': 'wansel-switch' }, [
						E('input', {
							'type': 'checkbox',
							'id': 'ws-hook',
							'checked': String(st.openclash_hook) === '1',
							'change': ui.createHandlerFn(this, function(ev) { return self.handleHook(ev); })
						}),
						E('span', { 'class': 'wansel-slider' })
					])
				])
			]),

			E('div', { 'class': 'wansel-panel' }, [
				E('h3', {}, [ '流量出口' ]),
				E('div', { 'class': 'wansel-form' }, [
					E('select', { 'class': 'wansel-input', 'id': 'ws-filter', 'change': ui.createHandlerFn(this, function() { return self.refreshConnections(); }) }, [
						E('option', { 'value': 'all' }, [ '全部连接' ]),
						E('option', { 'value': 'wan' }, [ '只看宽带' ]),
						E('option', { 'value': 'usb' }, [ '只看 5G' ]),
						E('option', { 'value': 'default' }, [ '只看跟随默认' ]),
						E('option', { 'value': 'matched' }, [ '只看规则命中' ])
					]),
					E('span', { 'class': 'wansel-hint', 'id': 'ws-conn-count', 'style': 'margin-top:0' }, [ '' ])
				]),
				E('table', { 'class': 'wansel-table', 'style': 'margin-top:10px' }, [
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ '协议' ]),
						E('th', {}, [ '源' ]),
						E('th', {}, [ '目的' ]),
						E('th', {}, [ '端口' ]),
						E('th', {}, [ '流量' ]),
						E('th', {}, [ '出口' ])
					])]),
					E('tbody', { 'id': 'ws-conn-body' }, [
						E('tr', {}, [ E('td', { 'colspan': '6', 'class': 'wansel-empty' }, [ '加载中…' ]) ])
					])
				])
			])
		]);

		try {
			var bg = getComputedStyle(document.body).backgroundColor;
			var mm = bg.match(/[0-9]+/g);
			if (mm && (Number(mm[0]) + Number(mm[1]) + Number(mm[2])) / 3 < 140)
				root.classList.add("wansel-dark");
			else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
				root.classList.add("wansel-dark");
		} catch (e) {}

		poll.add(function() {
			return self.refreshStatus(root);
		}, 5);

		poll.add(function() {
			return self.refreshConnections(root);
		}, 10);

		this.refreshConnections(root);

		return root;
	},

	renderRuleRow: function(r) {
		var self = this;
		var famLabel = { both: 'IPv4+IPv6', ipv4: '仅 IPv4', ipv6: '仅 IPv6' };
		return E('tr', { 'data-value': r.value }, [
			E('td', {}, [ r.type === 'domain' ? '域名' : 'IP' ]),
			E('td', { 'class': 'wansel-mono' }, [ r.value ]),
			E('td', {}, [ badge(r.via) ]),
			E('td', {}, [ famLabel[r.family] || 'IPv4+IPv6' ]),
			E('td', {}, [
				E('button', { 'class': 'btn cbi-button cbi-button-remove', 'click': ui.createHandlerFn(this, function() { return self.handleDel(r.value); }) }, [ '删除' ])
			])
		]);
	},

	handlePreset: function() {
		var preset = document.getElementById('ws-preset').value;
		var via = document.getElementById('ws-preset-via').value;
		var family = document.getElementById('ws-preset-family').value;

		return fs.exec(EGRESS, [ 'preset', 'apply', preset, via, family ]).then(function(r) {
			ui.addNotification(null, E('p', {}, [ (r.stdout || '已填充').trim() ]), 'info');
			return this.refreshRules();
		}.bind(this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, [ '填充失败: ' + e ]), 'danger');
		});
	},

	handleAdd: function() {
		var type = document.getElementById('ws-type').value;
		var value = (document.getElementById('ws-value').value || '').trim();
		var via = document.getElementById('ws-via').value;
		var famEl = document.getElementById('ws-family');
		var family = famEl ? famEl.value : 'both';

		if (!value) {
			ui.addNotification(null, E('p', {}, [ '请输入域名或 IP' ]), 'warning');
			return;
		}

		var args = [ 'add', type, value, via, family ];
		return fs.exec(EGRESS, args).then(function(r) {
			ui.addNotification(null, E('p', {}, [ (r.stdout || '已添加').trim() ]), 'info');
			return this.refreshRules();
		}.bind(this));
	},

	handleDel: function(value) {
		if (!confirm('删除规则 ' + value + ' ?'))
			return;

		return fs.exec(EGRESS, [ 'del', value ]).then(function() {
			return this.refreshRules();
		}.bind(this));
	},

	handleApply: function(withDns) {
		ui.showModal('应用规则', [
			E('p', { 'class': 'spinning' }, [ withDns ? '正在应用并重启 DNS…' : '正在应用规则…' ])
		]);

		return fs.exec(EGRESS, withDns ? [ 'apply', 'dns' ] : [ 'apply' ]).then(function(r) {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, [ (r.stdout || '已应用').trim() ]), 'info');
		}).catch(function(e) {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, [ '应用失败: ' + e ]), 'danger');
		});
	},

	handleHook: function(ev) {
		var on = ev.target.checked;
		return fs.exec(EGRESS, [ 'hook', on ? 'on' : 'off' ]).then(function(r) {
			ui.addNotification(null, E('p', {}, [ (r.stdout || '').trim() ]), 'info');
		});
	},

	handleFilter: function() {
		this.refreshConnections(document.querySelector('.wansel-root'));
	},

	refreshRules: function() {
		return this.callList().then(function(d) {
			var body = document.getElementById('ws-rule-body');
			if (!body) return;
			while (body.firstChild) body.removeChild(body.firstChild);
			var rules = d.rules || [];
			if (!rules.length) {
				body.appendChild(E('tr', {}, [ E('td', { 'colspan': '4', 'class': 'wansel-empty' }, [ '还没有规则' ]) ]));
				return;
			}
			for (var i = 0; i < rules.length; i++)
				body.appendChild(this.renderRuleRow(rules[i]));
		}.bind(this));
	},

	refreshStatus: function(root) {
		return this.callStatus().then(function(st) {
			var set = function(id, txt) {
				var el = document.getElementById(id);
				if (el) el.textContent = txt;
			};
			set('ws-wan-ip', st.wan_up === true ? '在线' : '离线');
			set('ws-usb-ip', st.usb_up === true ? '在线' : '离线');
			set('ws-wan-counter', '命中: ' + (st.wan_counter || '0 0'));
			set('ws-usb-counter', '命中: ' + (st.usb_counter || '0 0'));
			set('ws-wan-count', String(st.wan_count || 0) + ' / ' + String(st.wan_count6 || 0));
			set('ws-usb-count', String(st.usb_count || 0) + ' / ' + String(st.usb_count6 || 0));

			var hook = document.getElementById('ws-hook');
			if (hook) hook.checked = String(st.openclash_hook) === '1';
		});
	},

	refreshConnections: function(root) {
		var sel = document.getElementById('ws-filter');
		var filter = sel ? sel.value : 'all';
		return this.callConnections(filter).then(function(list) {
			var body = document.getElementById('ws-conn-body');
			if (!body) return;
			while (body.firstChild) body.removeChild(body.firstChild);

			var countEl = document.getElementById('ws-conn-count');
			if (countEl) countEl.textContent = '共 ' + list.length + ' 条';

			if (!list.length) {
				body.appendChild(E('tr', {}, [ E('td', { 'colspan': '6', 'class': 'wansel-empty' }, [ '没有连接' ]) ]));
				return;
			}

			for (var i = 0; i < Math.min(list.length, 100); i++) {
				var c = list[i];
				body.appendChild(E('tr', {}, [
					E('td', {}, [ c.proto ]),
					E('td', { 'class': 'wansel-mono' }, [ c.src ]),
					E('td', { 'class': 'wansel-mono' }, [ c.dst ]),
					E('td', { 'class': 'wansel-mono' }, [ c.dport ]),
					E('td', {}, [ fmtBytes(c.bytes) ]),
					E('td', {}, [ badge(c.via) ])
				]));
			}
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
