'use strict';
'require view';
'require fs';
'require poll';
'require ui';
'require dom';

var WANSEL = '/usr/sbin/wansel';

var CSS = [
'.wansel-root{max-width:1100px;margin:0 auto}',
'.wansel-root h3{background:transparent!important;border:0!important;padding:0!important;margin:0 0 12px!important;font-size:15px;font-weight:600}',

'.wansel-hero{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:14px;',
'background:linear-gradient(135deg,rgba(47,179,68,.16),rgba(47,179,68,.03));',
'border:1px solid rgba(47,179,68,.30);margin-bottom:18px}',
'.wansel-hero-icon{font-size:26px;line-height:1}',
'.wansel-hero-main{flex:1;min-width:0}',
'.wansel-hero-title{font-size:13px;color:var(--text-color-medium,#666)}',
'.wansel-hero-value{font-size:22px;font-weight:600;margin-top:2px}',
'.wansel-hero-sub{font-size:12px;color:var(--text-color-medium,#777);margin-top:2px;font-family:monospace}',

'.wansel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px}',
'@media(max-width:680px){.wansel-grid{grid-template-columns:1fr}}',

'.wansel-card{border:2px solid var(--border-color-low,#e0e0e0);border-radius:14px;padding:16px 18px;',
'background:var(--background-color-high,#fff);transition:border-color .25s,box-shadow .25s,transform .2s;',
'display:flex;flex-direction:column;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,.04)}',
'.wansel-card:hover{transform:translateY(-2px)}',
'.wansel-card.is-active{border-color:#2fb344;box-shadow:0 0 0 4px rgba(47,179,68,.14),0 8px 24px rgba(47,179,68,.12)}',
'.wansel-card.is-down{opacity:.55}',

'.wansel-card-head{display:flex;align-items:center;gap:10px}',
'.wansel-dot{width:10px;height:10px;border-radius:50%;background:#bbb;flex:none}',
'.wansel-dot.on{background:#2fb344;box-shadow:0 0 0 3px rgba(47,179,68,.20)}',
'.wansel-card-title{flex:1;min-width:0}',
'.wansel-card-name{font-size:17px;font-weight:600}',
'.wansel-card-sub{font-size:12px;color:var(--text-color-medium,#777);margin-top:2px;font-family:monospace}',
'.wansel-badge{font-size:11px;padding:3px 8px;border-radius:999px;background:rgba(47,179,68,.16);color:#2fb344;font-weight:600}',

'.wansel-rows{display:flex;flex-direction:column;gap:6px}',
'.wansel-row{display:flex;justify-content:space-between;font-size:13px}',
'.wansel-row span{color:var(--text-color-medium,#777)}',
'.wansel-row b{font-weight:500;font-family:monospace}',
'.wansel-card-foot{margin-top:auto}',
'.wansel-card-foot .btn{width:100%}',

'.wansel-panel{border:1px solid var(--border-color-low,#e6e6e6);border-radius:14px;padding:16px 18px;',
'margin-bottom:16px;background:var(--background-color-high,#fff);box-shadow:0 1px 2px rgba(0,0,0,.04)}',

/* ===== 暗色：卡片/面板改成灰色 ===== */
'.wansel-dark .wansel-card,.wansel-dark .wansel-panel{background:#2b2b2b;border-color:#3d3d3d;box-shadow:none}',
'.wansel-dark .wansel-card.is-active{border-color:#2fb344;box-shadow:0 0 0 4px rgba(47,179,68,.18)}',
'.wansel-dark .wansel-card-sub,.wansel-dark .wansel-row span{color:#a0a0a0}',
'.wansel-dark .wansel-table th{border-color:#3d3d3d;color:#a0a0a0}',
'.wansel-dark .wansel-table td{border-color:#333}',
'.wansel-dark .wansel-switch-row,.wansel-dark .wansel-quota-row{border-color:#333}',
'.wansel-dark .wansel-input{background:#1f1f1f!important;color:#eee!important;border-color:#4a4a4a!important}',

'.wansel-table{width:100%;border-collapse:collapse;font-size:13px}',
'.wansel-table th{text-align:left;font-weight:500;color:var(--text-color-medium,#777);padding:6px 8px;border-bottom:1px solid var(--border-color-low,#e6e6e6)}',
'.wansel-table td{padding:8px;border-bottom:1px solid var(--border-color-low,#f0f0f0)}',
'.wansel-state{color:#999}',
'.wansel-state.on{color:#2fb344}',

'.wansel-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--border-color-low,#f0f0f0)}',
'.wansel-switch-row:last-child{border-bottom:none}',
'.wansel-switch-text{flex:1;min-width:0}',
'.wansel-switch-title{font-size:14px;font-weight:500}',
'.wansel-switch-desc{font-size:12px;color:var(--text-color-medium,#888);margin-top:3px;line-height:1.5}',

'.wansel-switch{position:relative;display:inline-block;width:46px;height:26px;flex:none;cursor:pointer}',
'.wansel-switch input{opacity:0;width:0;height:0;position:absolute;margin:0}',
'.wansel-slider{position:absolute;inset:0;border-radius:999px;background:rgba(130,130,130,.45);transition:background .25s}',
'.wansel-slider::before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;',
'background:#fff;transition:transform .25s;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
'.wansel-switch input:checked + .wansel-slider{background:#2fb344}',
'.wansel-switch input:checked + .wansel-slider::before{transform:translateX(20px)}',

'.wansel-sub-title{font-size:13px;font-weight:600;margin:18px 0 8px;color:var(--text-color-medium,#777)}',
'.wansel-field-row{display:flex;align-items:center;gap:12px;padding:6px 0;flex-wrap:wrap}',
'.wansel-field-row > label{flex:none;min-width:120px;font-size:13px;display:flex;align-items:center;gap:6px}',
'.wansel-field-row input[type=text],.wansel-field-row input[type=number],.wansel-field-row select{',
'padding:5px 8px;border-radius:6px;border:1px solid var(--border-color-low,#ccc);',
'background:var(--background-color-high,#fff);color:var(--text-color-high,#222);font-size:13px}',
'.wansel-check input{width:16px;height:16px;margin:0;vertical-align:middle}',
'.wansel-save-row{padding-top:14px;margin-top:6px;border-top:1px solid var(--border-color-low,#f0f0f0)}',

'.wansel-select-row{display:flex;align-items:center;gap:10px;padding:8px 0}',
'.wansel-select-row label{flex:none;width:120px;font-size:13px}',

'.wansel-traffic-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:6px}',
'.wansel-traffic-title{font-size:13px;color:var(--text-color-medium,#777)}',
'.wansel-traffic-value{font-size:20px;font-weight:600;font-family:monospace}',
'.wansel-progress{height:10px;border-radius:999px;background:var(--border-color-low,#eee);overflow:hidden;margin:8px 0}',
'.wansel-progress > div{height:100%;background:linear-gradient(90deg,#2fb344,#7fd34e);border-radius:999px;transition:width .4s}',
'.wansel-progress > .wansel-bar-warn{background:linear-gradient(90deg,#f39c12,#f7c948)}',
'.wansel-progress > .wansel-bar-danger{background:linear-gradient(90deg,#e74c3c,#ff7b6b)}',

'.wansel-quota-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:14px;',
'border-top:1px solid var(--border-color-low,#f0f0f0)}',
'.wansel-quota-row label{font-size:13px;color:var(--text-color-medium,#777);min-width:auto}',

'.wansel-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}',
'@media(max-width:680px){.wansel-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
'.wansel-stat{border:1px solid var(--border-color-low,#e6e6e6);border-radius:10px;padding:10px 12px;text-align:center}',
'.wansel-stat-label{font-size:12px;color:var(--text-color-medium,#888)}',
'.wansel-stat-value{font-size:20px;font-weight:600;font-family:monospace;margin-top:4px}',
'.wansel-dark .wansel-stat{border-color:#3d3d3d}',

'.wansel-events{max-height:280px;overflow:auto;font-size:12px}',
'.wansel-event{display:flex;gap:10px;padding:6px 0;border-bottom:1px dashed var(--border-color-low,#f0f0f0);align-items:baseline}',
'.wansel-event-time{color:var(--text-color-medium,#999);font-family:monospace;flex:none}',
'.wansel-event-kind{flex:none;padding:0 6px;border-radius:4px;font-size:11px;line-height:18px}',
'.k-switch{background:rgba(47,179,68,.14);color:#2fb344}',
'.k-auto{background:rgba(255,152,0,.16);color:#e67e22}',
'.k-fail{background:rgba(244,67,54,.14);color:#e74c3c}',
'.k-warn{background:rgba(255,193,7,.16);color:#c08a00}',
'.k-info{background:rgba(33,150,243,.14);color:#1e88e5}',
'.k-boot,.k-flush{background:rgba(130,130,130,.14);color:#999}',
'.wansel-muted{color:var(--text-color-medium,#888);font-size:13px}',

'.wansel-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;',
'padding:14px 4px 2px;font-size:12px;color:var(--text-color-medium,#999);',
'border-top:1px solid var(--border-color-low,#e6e6e6);margin-top:6px;flex-wrap:wrap}',
'.wansel-footer a{color:#2fb344;text-decoration:none}',
'.wansel-footer a:hover{text-decoration:underline}',
'.wansel-dark .wansel-footer{border-color:#333}'
].join('');

function clear(el) {
	while (el.firstChild)
		el.removeChild(el.firstChild);
}

function fmtLat(v) {
	if (v === null || v === undefined || v === '')
		return '--';
	return v + ' ms';
}

function fmtBytes(n) {
	n = Number(n) || 0;
	if (n < 1024) return n + ' B';
	if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
	if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
	return (n / 1073741824).toFixed(2) + ' GB';
}

function kindLabel(k) {
	switch (k) {
	case 'lan': return _('局域网');
	case 'wan': return _('宽带候选');
	case 'usb': return _('USB 共享候选');
	default:    return _('其他');
	}
}

function inputEl(type, cls, width) {
	return E('input', {
		'type': type,
		'class': 'wansel-input ' + (cls || ''),
		'style': width ? ('width:' + width) : ''
	});
}

return view.extend({
	load: function() {
		return fs.exec(WANSEL, ['status']).catch(function() {
			return { code: -1, stdout: '', stderr: '' };
		});
	},

	render: function(res) {
		var st = {};
		try { st = JSON.parse((res && res.stdout) || '{}'); } catch (e) {}

		var self = this;

		this.root = E('div', { 'class': 'wansel-root' }, [
			E('style', {}, [CSS]),
			E('h2', {}, [_('出口切换')]),
			E('div', { 'class': 'cbi-map-descr' }, [
				_('在宽带与安卓 USB 共享之间切换默认出口。接口为自动发现，可在「接口检测」中手动指定。')
			])
		]);

		// 暗色主题检测
		try {
			var bg = getComputedStyle(document.body).backgroundColor;
			var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
			if (m && (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 < 140)
				this.root.classList.add('wansel-dark');
			else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
				this.root.classList.add('wansel-dark');
		} catch (e) {}

		this.heroEl = E('div', { 'class': 'wansel-hero' });
		this.noteEl = E('div', { 'class': 'wansel-muted', 'style': 'margin:-10px 0 16px' });
		this.gridEl = E('div', { 'class': 'wansel-grid' });
		this.ifaceEl = E('div', { 'class': 'wansel-panel' });
		this.ctrlEl = E('div', { 'class': 'wansel-panel' });
		this.conntrackEl = E('div', { 'class': 'wansel-panel' });
		this.trafficEl = E('div', { 'class': 'wansel-panel' });
		this.configEl = E('div', { 'class': 'wansel-panel' });
		this.eventsEl = E('div', { 'class': 'wansel-panel' });

		this.root.appendChild(this.heroEl);
		this.root.appendChild(this.noteEl);
		this.root.appendChild(this.gridEl);
		this.root.appendChild(this.ifaceEl);
		this.root.appendChild(this.ctrlEl);
		this.root.appendChild(this.conntrackEl);
		this.root.appendChild(this.trafficEl);
		this.root.appendChild(this.configEl);
		this.root.appendChild(this.eventsEl);

		this.footerEl = E('div', { 'class': 'wansel-footer' });
		this.root.appendChild(this.footerEl);

		this.state = st;
		this.paint();

		poll.add(function() {
			return fs.exec(WANSEL, ['status']).then(function(r) {
				try { self.state = JSON.parse((r && r.stdout) || '{}'); }
				catch (e) { return; }
				self.paint();
			}).catch(function() {});
		}, 10);

		return this.root;
	},

	paint: function() {
		var st = this.state || {};
		this.paintHero(st);
		this.paintNote(st);
		this.paintCards(st);
		this.paintInterfaces(st);
		this.paintControls(st);
		this.paintConntrack(st);
		this.paintTraffic(st);
		this.paintConfig(st);
		this.paintEvents(st);
		this.paintFooter(st);
	},

	// ---------- 页脚：版本号 + 仓库链接 ----------
	paintFooter: function(st) {
		clear(this.footerEl);
		this.footerEl.appendChild(E('span', {}, [
			'luci-app-wans-switch v' + (st.version || '?')
		]));
		this.footerEl.appendChild(E('a', {
			'href': st.repo || 'https://github.com/MURChen/luci-app-wans-switch',
			'target': '_blank',
			'rel': 'noopener'
		}, ['GitHub · MURChen/luci-app-wans-switch']));
	},

	// ---------- 清理连接跟踪 ----------
	paintConntrack: function(st) {
		var self = this;
		clear(this.conntrackEl);
		this.conntrackEl.appendChild(E('h3', {}, [_('清理连接跟踪')]));

		var ct = st.conntrack || {};
		var items = [
			[_('总连接'), ct.total],
			[_('宽带'), ct.wan],
			[_('USB 共享'), ct.usb],
			[_('局域网'), ct.lan]
		];

		var grid = E('div', { 'class': 'wansel-stat-grid' });
		items.forEach(function(it) {
			grid.appendChild(E('div', { 'class': 'wansel-stat' }, [
				E('div', { 'class': 'wansel-stat-label' }, [it[0]]),
				E('div', { 'class': 'wansel-stat-value' }, [String(it[1] || 0)])
			]));
		});
		this.conntrackEl.appendChild(grid);

		var btn = E('button', {
			'class': 'btn cbi-button cbi-button-reset',
			'click': ui.createHandlerFn(this, function() {
				if (!st.has_conntrack) {
					self.notify(_('未安装 conntrack，请先执行: opkg update && opkg install conntrack'), 'error');
					return Promise.resolve();
				}
				if (!confirm(_('确定清理所有现有连接吗？这会让局域网设备和代理连接短暂重连。')))
					return Promise.resolve();
				return fs.exec(WANSEL, ['flush']).then(function(r) {
					self.notify(r.stdout || r.stderr, r.code === 0 ? 'info' : 'error');
					return self.refresh();
				});
			})
		}, [_('清理全部连接')]);

		this.conntrackEl.appendChild(btn);
	},

	refresh: function() {
		var self = this;
		return fs.exec(WANSEL, ['status']).then(function(r) {
			try { self.state = JSON.parse((r && r.stdout) || '{}'); } catch (e) {}
			self.paint();
		}).catch(function() {});
	},

	notify: function(msg, type) {
		ui.addNotification(null, E('p', {}, [msg]), type || 'info');
	},

	paintHero: function(st) {
		clear(this.heroEl);
		var active = st.active === 'usb' ? 'usb' : 'wan';
		var d = st[active] || {};
		var isUsb = active === 'usb';

		this.heroEl.appendChild(E('div', { 'class': 'wansel-hero-icon' }, [isUsb ? '📶' : '🌐']));
		this.heroEl.appendChild(E('div', { 'class': 'wansel-hero-main' }, [
			E('div', { 'class': 'wansel-hero-title' }, [_('当前默认出口')]),
			E('div', { 'class': 'wansel-hero-value' }, [isUsb ? _('5G / USB 共享') : _('宽带')]),
			E('div', { 'class': 'wansel-hero-sub' }, [
				(d.name || '--') + ' · ' + (d.dev || '--') + (d.ip ? ' · ' + d.ip : '')
			])
		]));
		this.heroEl.appendChild(E('span', { 'class': 'wansel-badge' }, [
			st.auto === 1 ? _('自动切换已开') : _('自动切换已关')
		]));
	},

	paintNote: function(st) {
		clear(this.noteEl);
		this.noteEl.appendChild(E('span', {}, [
			'ℹ ',
			_('IPv6 未随出口切换')
		]));
	},

	paintCards: function(st) {
		clear(this.gridEl);
		var active = st.active === 'usb' ? 'usb' : 'wan';
		this.gridEl.appendChild(this.makeCard(st, 'wan', active));
		this.gridEl.appendChild(this.makeCard(st, 'usb', active));
	},

	makeCard: function(st, which, active) {
		var self = this;
		var data = st[which] || {};
		var isActive = (active === which);
		var up = data.up === 1;
		var isUsb = which === 'usb';

		var card = E('div', {
			'class': 'wansel-card' + (isActive ? ' is-active' : '') + (up ? '' : ' is-down')
		});

		card.appendChild(E('div', { 'class': 'wansel-card-head' }, [
			E('span', { 'class': 'wansel-dot' + (up ? ' on' : '') }),
			E('div', { 'class': 'wansel-card-title' }, [
				E('div', { 'class': 'wansel-card-name' }, [isUsb ? _('5G / USB 共享') : _('宽带')]),
				E('div', { 'class': 'wansel-card-sub' }, [
					(data.name || '--') + ' · ' + (data.dev || '--')
				])
			]),
			isActive ? E('span', { 'class': 'wansel-badge' }, [_('使用中')]) : ''
		]));

		var rows = E('div', { 'class': 'wansel-rows' });
		rows.appendChild(this.row(_('IP'), data.ip || '--'));
		rows.appendChild(this.row(_('网关'), data.gw || '--'));
		rows.appendChild(this.row(_('网关延迟'), fmtLat(data.lat_gw)));
		rows.appendChild(this.row(_('公网延迟'), fmtLat(data.lat_net)));
		card.appendChild(rows);

		var btnAttrs = {
			'class': 'btn cbi-button ' + (isActive ? 'cbi-button-apply' : 'cbi-button-action'),
			'click': ui.createHandlerFn(this, function() {
				return self.doSwitch(which);
			})
		};
		if (isActive || !up)
			btnAttrs.disabled = true;

		card.appendChild(E('div', { 'class': 'wansel-card-foot' }, [
			E('button', btnAttrs, [
				isActive ? _('当前出口') : (up ? _('切换到此') : _('不可用'))
			])
		]));

		return card;
	},

	row: function(label, value) {
		return E('div', { 'class': 'wansel-row' }, [
			E('span', {}, [label]),
			E('b', {}, [value])
		]);
	},

	paintInterfaces: function(st) {
		clear(this.ifaceEl);
		this.ifaceEl.appendChild(E('h3', {}, [_('接口检测')]));

		var list = st.interfaces || [];
		if (!list.length) {
			this.ifaceEl.appendChild(E('p', { 'class': 'wansel-muted' }, [_('未检测到任何 IPv4 接口。')]));
			return;
		}

		var table = E('table', { 'class': 'wansel-table' }, [
			E('tr', {}, [
				E('th', {}, [_('接口')]),
				E('th', {}, [_('设备')]),
				E('th', {}, [_('类型')]),
				E('th', {}, [_('IP')]),
				E('th', {}, [_('状态')]),
				E('th', {}, [_('当前用途')])
			])
		]);

		list.forEach(function(it) {
			var isWan = st.wan && st.wan.name === it.name;
			var isUsb = st.usb && st.usb.name === it.name;
			var use = isWan ? _('宽带') : (isUsb ? _('5G') : '');

			table.appendChild(E('tr', {}, [
				E('td', {}, [E('b', {}, [it.name])]),
				E('td', {}, [it.device || '--']),
				E('td', {}, [kindLabel(it.kind)]),
				E('td', {}, [it.ip || '--']),
				E('td', {}, [
					E('span', { 'class': 'wansel-state' + (it.up ? ' on' : '') }, [
						it.up ? _('在线') : _('离线')
					])
				]),
				E('td', {}, [use])
			]));
		});

		this.ifaceEl.appendChild(table);
		this.ifaceEl.appendChild(this.selectRow(_('宽带接口'), list, st.wan_manual, 'wan'));
		this.ifaceEl.appendChild(this.selectRow(_('USB 接口'), list, st.usb_manual, 'usb'));
	},

	selectRow: function(label, list, current, kind) {
		var self = this;
		var sel = E('select', {
			'class': 'cbi-input-select',
			'change': function(ev) {
				fs.exec(WANSEL, ['set', kind, ev.target.value]).then(function(r) {
					if (r.code !== 0)
						self.notify(r.stderr || r.stdout || _('设置失败'), 'error');
					return self.refresh();
				}).catch(function(e) {
					self.notify(e.message || e, 'error');
				});
			}
		}, [
			E('option', { 'value': '' }, [_('自动识别')])
		]);

		list.forEach(function(it) {
			var opt = E('option', { 'value': it.name }, [
				it.name + ' (' + (it.device || '?') + ')'
			]);
			if (it.name === current)
				opt.selected = true;
			sel.appendChild(opt);
		});

		return E('div', { 'class': 'wansel-select-row' }, [
			E('label', {}, [label]),
			sel
		]);
	},

	// ---------- 自动故障切换 ----------
	paintControls: function(st) {
		var self = this;
		var cfg = st.config || {};

		if (this.controlsBuilt) {
			if (this.autoInput)
				this.autoInput.checked = (st.auto === 1);
			if (this.usbInput)
				this.usbInput.checked = (cfg.usb_autoup === 1);
			if (this.switchInput)
				this.switchInput.checked = (cfg.switch_enable === 1);
			this.updateGwHint(st);
			return;
		}

		clear(this.ctrlEl);
		this.ctrlEl.appendChild(E('h3', {}, [_('自动故障切换')]));

		var autoRow = this.switchRow(
			_('启用自动故障切换'),
			_('接口断开或连续探测失败时，自动切到另一条线路。'),
			st.auto === 1,
			function(checked) {
				fs.exec(WANSEL, ['auto', checked ? 'on' : 'off'])
					.then(function() { self.refresh(); })
					.catch(function(e) { self.notify(e.message || e, 'error'); });
			}
		);
		this.autoInput = autoRow.querySelector('input');
		this.ctrlEl.appendChild(autoRow);

		var usbRow = this.switchRow(
			_('自动挂载 USB 共享'),
			_('检测到 USB 网卡但接口未就绪时，自动尝试拉起接口（60 秒冷却）。'),
			cfg.usb_autoup === 1,
			function(checked) {
				fs.exec(WANSEL, ['config', 'usb_autoup=' + (checked ? 1 : 0)])
					.then(function() { self.refresh(); })
					.catch(function(e) { self.notify(e.message || e, 'error'); });
			}
		);
		this.usbInput = usbRow.querySelector('input');
		this.ctrlEl.appendChild(usbRow);

		var swRow = this.switchRow(
			_('物理拨动开关'),
			_('GL.iNet 开关拨到开 = 切到 5G，关 = 切回宽带（仅 GL 固件有效，其他固件自动忽略）。'),
			cfg.switch_enable === 1,
			function(checked) {
				fs.exec(WANSEL, ['config', 'switch_enable=' + (checked ? 1 : 0)])
					.then(function() { self.refresh(); })
					.catch(function(e) { self.notify(e.message || e, 'error'); });
			}
		);
		this.switchInput = swRow.querySelector('input');
		this.ctrlEl.appendChild(swRow);

		var mountBtn = E('button', {
			'class': 'btn cbi-button',
			'click': ui.createHandlerFn(this, function() {
				return fs.exec(WANSEL, ['usbmount']).then(function(r) {
					self.notify(r.stdout || r.stderr || _('已执行'), r.code === 0 ? 'info' : 'error');
					return self.refresh();
				}).catch(function(e) {
					self.notify(e.message || e, 'error');
				});
			})
		}, [_('立即挂载')]);

		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [mountBtn]));

		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-sub-title' }, [_('探测方式')]));

		var gwChk = E('input', { 'type': 'checkbox' });
		gwChk.checked = cfg.probe_gw === 1;
		var gwInput = inputEl('text', '', '220px');
		gwInput.placeholder = _('留空=自动获取网关');
		gwInput.value = cfg.probe_gw_target || '';
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', { 'class': 'wansel-check' }, [gwChk, _(' Ping 网关')]),
			gwInput
		]));
		this.gwHint = E('div', { 'class': 'wansel-muted', 'style': 'font-size:12px;padding-left:132px;margin:-2px 0 4px' });
		this.ctrlEl.appendChild(this.gwHint);

		var netChk = E('input', { 'type': 'checkbox' });
		netChk.checked = cfg.probe_net === 1;
		var netInput = inputEl('text', '', '220px');
		netInput.placeholder = '223.5.5.5';
		netInput.value = cfg.probe_net_target || '223.5.5.5';
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', { 'class': 'wansel-check' }, [netChk, _(' Ping 外网')]),
			netInput
		]));

		var thrInput = inputEl('number', '', '100px');
		thrInput.min = '1';
		thrInput.max = '20';
		thrInput.value = cfg.fail_threshold || 3;
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', {}, [_('连续失败次数')]),
			thrInput
		]));

		var ivInput = inputEl('number', '', '100px');
		ivInput.min = '3';
		ivInput.max = '120';
		ivInput.value = cfg.probe_interval || 10;
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', {}, [_('探测间隔 (秒)')]),
			ivInput
		]));

		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-sub-title' }, [_('恢复策略')]));

		var recChk = E('input', { 'type': 'checkbox' });
		recChk.checked = cfg.auto_recover === 1;
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', { 'class': 'wansel-check' }, [recChk, _(' 断线恢复后自动切回原线路')])
		]));

		var connSel = E('select', { 'class': 'wansel-input' }, [
			E('option', { 'value': 'flush' }, [_('全部断开（清空连接）')]),
			E('option', { 'value': 'new' }, [_('仅新连接（已有连接不动）')]),
			E('option', { 'value': 'keep' }, [_('不断线恢复（尽量保留连接）')])
		]);
		connSel.value = cfg.recover_conn || 'flush';
		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [
			E('label', {}, [_('恢复时连接处理')]),
			connSel
		]));

		var saveBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, function() {
				var thr = parseInt(thrInput.value, 10);
				if (!thr || thr < 1 || thr > 20) {
					self.notify(_('连续失败次数需在 1-20 之间'), 'error');
					return Promise.resolve();
				}
				var iv = parseInt(ivInput.value, 10);
				if (!iv || iv < 3 || iv > 120) {
					self.notify(_('探测间隔需在 3-120 秒之间'), 'error');
					return Promise.resolve();
				}
				return fs.exec(WANSEL, ['config',
					'probe_gw=' + (gwChk.checked ? 1 : 0),
					'probe_gw_target=' + gwInput.value.trim(),
					'probe_net=' + (netChk.checked ? 1 : 0),
					'probe_net_target=' + netInput.value.trim(),
					'fail_threshold=' + String(thr),
					'probe_interval=' + String(iv),
					'auto_recover=' + (recChk.checked ? 1 : 0),
					'recover_conn=' + connSel.value
				]).then(function(r) {
					self.notify(r.stdout || _('已保存'), r.code === 0 ? 'info' : 'error');
					return self.refresh();
				});
			})
		}, [_('保存设置')]);

		this.ctrlEl.appendChild(E('div', { 'class': 'wansel-save-row' }, [saveBtn]));

		this.updateGwHint(st);
		this.controlsBuilt = true;
	},

	updateGwHint: function(st) {
		if (!this.gwHint)
			return;
		var wg = (st.wan && st.wan.gw) || '--';
		var ug = (st.usb && st.usb.gw) || '--';
		this.gwHint.textContent = _('自动获取') + '：' + _('宽带') + ' ' + wg + ' / USB ' + ug;
	},

	switchRow: function(title, desc, checked, onchange) {
		var input = E('input', {
			'type': 'checkbox',
			'change': function(ev) { onchange(ev.target.checked); }
		});
		input.checked = !!checked;

		return E('div', { 'class': 'wansel-switch-row' }, [
			E('div', { 'class': 'wansel-switch-text' }, [
				E('div', { 'class': 'wansel-switch-title' }, [title]),
				E('div', { 'class': 'wansel-switch-desc' }, [desc])
			]),
			E('label', { 'class': 'wansel-switch' }, [
				input,
				E('span', { 'class': 'wansel-slider' })
			])
		]);
	},

	// ---------- 5G 流量 ----------
	paintTraffic: function(st) {
		var self = this;
		var t = st.traffic || {};
		var base = Number(t.base_gb) || 0;
		var total = base * 1073741824 + (Number(t.rx) || 0) + (Number(t.tx) || 0);
		var quota = Number(t.quota_gb) || 200;
		var quotaBytes = quota * 1073741824;
		var pct = quotaBytes > 0 ? Math.min(100, (total / quotaBytes) * 100) : 0;

		if (!this.trafficBuilt) {
			clear(this.trafficEl);
			this.trafficEl.appendChild(E('h3', {}, [_('5G 流量')]));

			this.trafficHead = E('div', { 'class': 'wansel-traffic-head' });
			this.trafficBar = E('div', { 'class': 'wansel-progress' }, [
				E('div', { 'style': 'width:0%' })
			]);
			this.trafficSub = E('div', { 'class': 'wansel-muted' });

			this.baseInput = inputEl('number', '', '110px');
			this.baseInput.min = '0';
			this.baseInput.step = '0.1';
			this.baseInput.value = base;
			this.baseInput.placeholder = '0';

			this.quotaInput = inputEl('number', '', '110px');
			this.quotaInput.min = '1';
			this.quotaInput.step = '1';
			this.quotaInput.value = quota;

			var saveBtn = E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'click': ui.createHandlerFn(this, function() {
					var q = parseInt(self.quotaInput.value, 10);
					var b = parseFloat(self.baseInput.value);
					if (!q || q < 1) {
						self.notify(_('请输入有效额度（正整数 GB）'), 'error');
						return Promise.resolve();
					}
					if (isNaN(b) || b < 0)
						b = 0;
					return fs.exec(WANSEL, ['quota', String(q)]).then(function() {
						return fs.exec(WANSEL, ['config', 'traffic_base_gb=' + String(Math.round(b))]);
					}).then(function() {
						self.notify(_('流量设置已保存'), 'info');
						return self.refresh();
					});
				})
			}, [_('保存流量设置')]);

			var resetBtn = E('button', {
				'class': 'btn cbi-button',
				'click': ui.createHandlerFn(this, function() {
					if (!confirm(_('确定重置本月流量统计吗？')))
						return Promise.resolve();
					return fs.exec(WANSEL, ['reset-traffic']).then(function(r) {
						self.notify(r.stdout || _('已重置'), 'info');
						return self.refresh();
					});
				})
			}, [_('重置统计')]);

			this.trafficEl.appendChild(this.trafficHead);
			this.trafficEl.appendChild(this.trafficBar);
			this.trafficEl.appendChild(this.trafficSub);
			this.trafficEl.appendChild(E('div', { 'class': 'wansel-quota-row' }, [
				E('label', {}, [_('本月已使用 (GB)')]),
				this.baseInput,
				E('label', {}, [_('月额度 (GB)')]),
				this.quotaInput,
				saveBtn,
				resetBtn
			]));
			this.trafficBuilt = true;
		}

		clear(this.trafficHead);
		this.trafficHead.appendChild(E('span', { 'class': 'wansel-traffic-title' }, [
			(t.month || '--') + ' · ' + _('本月已使用')
		]));
		this.trafficHead.appendChild(E('span', { 'class': 'wansel-traffic-value' }, [
			(total / 1073741824).toFixed(2) + ' / ' + quota + ' GB'
		]));

		var bar = this.trafficBar.firstChild;
		bar.style.width = pct.toFixed(1) + '%';
		bar.className = (pct >= 100 ? 'wansel-bar-danger' : (pct >= 80 ? 'wansel-bar-warn' : ''));

		this.trafficSub.textContent =
			_('路由器统计') + ' ' + fmtBytes((Number(t.rx) || 0) + (Number(t.tx) || 0)) +
			' · ' + _('手动补录') + ' ' + base + ' GB' +
			' · ' + _('剩余') + ' ' + ((Math.max(0, quotaBytes - total)) / 1073741824).toFixed(2) + ' GB';
	},

	// ---------- 配置导入导出 ----------
	paintConfig: function(st) {
		var self = this;
		if (this.configBuilt)
			return;
		clear(this.configEl);
		this.configEl.appendChild(E('h3', {}, [_('配置导入导出')]));

		this.configEl.appendChild(E('div', { 'class': 'wansel-muted', 'style': 'margin-bottom:12px' }, [
			_('导出当前所有设置，或从文件恢复（仅包含自动切换与流量相关设置，不含流量统计数值）。')
		]));

		var exportBtn = E('button', {
			'class': 'btn cbi-button',
			'click': ui.createHandlerFn(this, function() {
				return fs.exec(WANSEL, ['export']).then(function(r) {
					if (r.code !== 0) {
						self.notify(r.stderr || _('导出失败'), 'error');
						return;
					}
					var blob = new Blob([r.stdout], { type: 'text/plain' });
					var a = document.createElement('a');
					a.href = URL.createObjectURL(blob);
					a.download = 'wansel-config.txt';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
					self.notify(_('配置已导出'), 'info');
				}).catch(function(e) {
					self.notify(e.message || e, 'error');
				});
			})
		}, [_('导出配置')]);

		var fileInput = E('input', {
			'type': 'file',
			'accept': '.txt,.conf,.cfg',
			'style': 'display:none'
		});
		fileInput.addEventListener('change', function(ev) {
			var f = ev.target.files[0];
			if (!f) return;
			var reader = new FileReader();
			reader.onload = function() {
				fs.write('/tmp/wansel/import.txt', String(reader.result)).then(function() {
					return fs.exec(WANSEL, ['import', '/tmp/wansel/import.txt']);
				}).then(function(r) {
					self.notify(r.stdout || r.stderr || _('已导入'), r.code === 0 ? 'info' : 'error');
					return self.refresh();
				}).catch(function(e) {
					self.notify(e.message || e, 'error');
				});
			};
			reader.readAsText(f);
			ev.target.value = '';
		});

		var importBtn = E('button', {
			'class': 'btn cbi-button',
			'click': function() { fileInput.click(); }
		}, [_('导入配置')]);

		this.configEl.appendChild(fileInput);
		this.configEl.appendChild(E('div', { 'class': 'wansel-field-row' }, [exportBtn, importBtn]));
		this.configBuilt = true;
	},

	// ---------- 事件 ----------
	paintEvents: function(st) {
		clear(this.eventsEl);
		this.eventsEl.appendChild(E('h3', {}, [_('事件')]));

		var events = st.events || [];
		if (!events.length) {
			this.eventsEl.appendChild(E('p', { 'class': 'wansel-muted' }, [_('暂无事件。')]));
			return;
		}

		var box = E('div', { 'class': 'wansel-events' });

		events.slice().reverse().forEach(function(ev) {
			var kind = ev.kind || 'info';
			var label = {
				switch: _('切换'), auto: _('自动'), fail: _('故障'),
				warn: _('警告'), info: _('提示'), boot: _('启动'), flush: _('清理')
			}[kind] || kind;

			box.appendChild(E('div', { 'class': 'wansel-event' }, [
				E('span', { 'class': 'wansel-event-time' }, [ev.time || '']),
				E('span', { 'class': 'wansel-event-kind k-' + kind }, [label]),
				E('span', {}, [ev.msg || ''])
			]));
		});

		this.eventsEl.appendChild(box);
	},

	doSwitch: function(which) {
		var self = this;
		var isUsb = which === 'usb';

		if (!confirm(isUsb
			? _('切换后会消耗手机流量，确定切到 5G 吗？')
			: _('确定切回宽带吗？')))
			return Promise.resolve();

		return fs.exec(WANSEL, ['switch', which]).then(function(r) {
			if (r.code !== 0) {
				self.notify(r.stderr || r.stdout || _('切换失败'), 'error');
				return;
			}
			self.notify(r.stdout || _('已切换'), 'info');
		}).catch(function(e) {
			self.notify((e && e.message) || e || _('切换失败'), 'error');
			if (e && /Permission|Access denied|not found/i.test(String(e)))
				self.notify(_('权限未生效：请执行 /etc/init.d/rpcd reload 后重新登录 LuCI'), 'error');
		}).then(function() {
			return self.refresh();
		});
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
