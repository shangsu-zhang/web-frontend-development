// 应用初始化功能注释开始
/**
 * 维护导航、运营总览与全局操作；所有业务数据经统一服务访问。
 * @param {Window} global 浏览器窗口。
 * @returns {void} 绑定界面事件并加载地址锚点指定的页面。
 */
(function initializeApp(global) {
  'use strict';
  const service = global.parkingService;
  const ui = global.ParkingUI;
  const state = { summary: null, activeView: '', navigation: 0 };
  const titles = { overview: '运营总览', 'parking-records': '进出场记录', payments: '缴费记录', reports: '查询统计', vehicles: '车辆档案', owners: '车主档案', spaces: '车位管理', 'charge-rules': '收费规则', contracts: '月租合同', administrators: '管理员' };
  const dom = {};

  // 页面节点缓存功能注释开始
  /** @returns {void} 缓存总览节点，避免重复查询。 */
  function cacheDom() {
    ['page-title', 'last-sync', 'metric-grid', 'occupancy-percent', 'occupancy-trend', 'occupancy-progress', 'space-legend', 'space-map', 'arrivals-table', 'revenue-total', 'revenue-chart', 'revenue-labels', 'revenue-data', 'contract-list', 'dashboard-error', 'storage-label'].forEach(function cacheId(id) { dom[id] = document.getElementById(id); });
    dom.shell = document.querySelector('.app-shell');
    dom.sidebar = document.querySelector('.sidebar');
    dom.menuButton = document.querySelector('[data-action="toggle-menu"]');
  }
  // 页面节点缓存功能注释结束

  // 保存状态提示功能注释开始
  /** @returns {void} 展示当前模拟数据是否已保存，Java 模式隐藏演示重置按钮。 */
  function updateStorageLabel() {
    const status = service.getStorageStatus();
    dom['storage-label'].textContent = status.message;
    document.getElementById('service-label').textContent = status.mode === 'java' ? 'Java 服务模式' : '本地模拟服务';
    document.querySelector('[data-action="reset-demo"]').hidden = status.mode === 'java';
    document.querySelector('.user-chip small').textContent = status.mode === 'java' ? 'Java 服务模式' : '前端模拟模式';
  }
  // 保存状态提示功能注释结束

  // 运营指标显示功能注释开始
  /** @param {object} metrics 八表聚合指标。@returns {void} 渲染运营卡片。 */
  function renderMetrics(metrics) {
    const cards = [
      { label: '当前在场车辆', value: metrics.current_vehicles, icon: '↔', foot: '实时在场记录' },
      { label: '车位使用率', value: Math.round(metrics.occupied_spaces / Math.max(metrics.usable_spaces, 1) * 100) + '%', icon: 'P', foot: metrics.occupied_spaces + ' / ' + metrics.usable_spaces + ' 个启用车位' },
      { label: '今日已收款', value: ui.money(metrics.today_revenue), icon: '¥', foot: '按今日已支付流水汇总' },
      { label: '生效月租合同', value: metrics.active_contracts, icon: '□', foot: metrics.pending_payments + ' 笔待支付流水' }
    ];
    dom['metric-grid'].innerHTML = cards.map(function metricCard(card) {
      return '<article class="metric-card"><div class="metric-card-head"><p class="metric-label">' + ui.escape(card.label) + '</p><span class="metric-icon" aria-hidden="true">' + card.icon + '</span></div><p class="metric-value">' + ui.escape(card.value) + '</p><div class="metric-foot">' + ui.escape(card.foot) + '</div></article>';
    }).join('');
  }
  // 运营指标显示功能注释结束

  // 车位占用显示功能注释开始
  /** @param {object} occupancy 车位统计。@param {object[]} spaces 车位副本。@returns {void} 更新占用率与保留完整编号的车位图。 */
  function renderOccupancy(occupancy, spaces) {
    const percent = Math.round(occupancy.occupied / Math.max(occupancy.usable, 1) * 100);
    dom['occupancy-percent'].textContent = percent + '%';
    dom['occupancy-trend'].textContent = occupancy.occupied + ' 个占用';
    dom['occupancy-progress'].style.width = Math.min(percent, 100) + '%';
    dom['space-legend'].innerHTML = '<span><i class="legend-dot available"></i>可用 ' + (occupancy.usable - occupancy.occupied) + '</span><span><i class="legend-dot occupied"></i>占用 ' + occupancy.occupied + '</span><span><i class="legend-dot disabled"></i>停用 ' + occupancy.disabled + '</span>';
    dom['space-map'].innerHTML = spaces.map(function spaceCell(space) {
      const tone = space.space_status === '占用' ? 'occupied' : space.space_status === '停用' ? 'disabled' : '';
      return '<span class="space-cell ' + tone + '" title="' + ui.escape(space.space_code + ' · ' + space.space_status) + '">' + ui.escape(space.space_code) + '<small>' + ui.escape(space.space_status) + '</small></span>';
    }).join('');
  }
  // 车位占用显示功能注释结束

  // 在场车辆关联显示功能注释开始
  /** @param {object} summary 服务总览。@returns {void} 关联车辆、车位并显示前五条记录。 */
  function renderArrivals(summary) {
    const vehicleMap = new Map(summary.vehicles.map(function mapVehicle(row) { return [String(row.vehicle_id), row]; }));
    const spaceMap = new Map(summary.spaces.map(function mapSpace(row) { return [String(row.parking_space_id), row]; }));
    dom['arrivals-table'].innerHTML = summary.current_records.length ? summary.current_records.slice(0, 5).map(function arrivalRow(row) {
      const vehicle = vehicleMap.get(String(row.vehicle_id));
      const space = spaceMap.get(String(row.parking_space_id));
      return '<tr><td>' + ui.escape(vehicle ? vehicle.license_plate : row.vehicle_id) + '</td><td>' + ui.escape(space ? space.space_code : row.parking_space_id) + '</td><td>' + ui.escape(String(row.entry_time).slice(11, 16)) + '</td><td>' + ui.badge(row.parking_type) + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="empty-state">暂无在场车辆</td></tr>';
  }
  // 在场车辆关联显示功能注释结束

  // 真实流水趋势显示功能注释开始
  /** @param {object[]} history 根据已支付流水实时生成的日收入。@returns {void} 绘制柱形图和可访问数据表。 */
  function renderRevenue(history) {
    const max = Math.max.apply(null, history.map(function getAmount(row) { return Number(row.value); }).concat([1]));
    const total = history.reduce(function addAmount(sum, row) { return sum + Number(row.value); }, 0);
    dom['revenue-total'].textContent = ui.money(total);
    dom['revenue-chart'].innerHTML = history.map(function bar(row, index) {
      const height = Math.max(0, Number(row.value)) / max * 100;
      return '<span class="chart-bar ' + (index === history.length - 1 ? 'is-today' : '') + '" style="--bar-height:' + height + '%" data-value="' + ui.escape(ui.money(row.value)) + '" title="' + ui.escape(row.label + ' ' + ui.money(row.value)) + '"></span>';
    }).join('');
    dom['revenue-labels'].innerHTML = history.map(function chartLabel(row) { return '<span>' + ui.escape(row.label) + '</span>'; }).join('');
    dom['revenue-chart'].setAttribute('aria-label', '近七日已支付收入合计 ' + ui.money(total) + '，明细见下方数据表');
    dom['revenue-data'].innerHTML = ui.table([{ label: '日期', key: 'label' }, { label: '已支付收入', render: function amountCell(row) { return ui.money(row.value); } }], history);
  }
  // 真实流水趋势显示功能注释结束

  // 合同提醒显示功能注释开始
  /** @param {object[]} contracts 未来30天到期合同。@param {object[]} vehicles 车辆副本。@returns {void} 显示实际业务日期对应的到期提醒。 */
  function renderContracts(contracts, vehicles) {
    const vehicleMap = new Map(vehicles.map(function vehiclePair(row) { return [String(row.vehicle_id), row]; }));
    const today = new Date(ui.today() + 'T00:00:00');
    dom['contract-list'].innerHTML = contracts.length ? contracts.map(function contractRow(contract) {
      const vehicle = vehicleMap.get(String(contract.vehicle_id));
      const plate = vehicle ? vehicle.license_plate : '未知车辆';
      const days = Math.max(0, Math.round((new Date(contract.end_date + 'T00:00:00') - today) / 86400000));
      return '<div class="contract-row"><div class="contract-person"><span class="contract-avatar">' + ui.escape(plate.slice(-2)) + '</span><span><strong>' + ui.escape(plate) + '</strong><small>' + ui.escape(contract.contract_no) + ' · ' + ui.money(contract.monthly_rent) + '/月</small></span></div><div class="contract-date"><strong>' + days + ' 天后到期</strong><small>' + ui.escape(contract.end_date) + '</small></div></div>';
    }).join('') : '<p class="page-description">未来 30 天暂无有效合同到期</p>';
  }
  // 合同提醒显示功能注释结束

  // 运营总览加载功能注释开始
  /** @param {boolean} refreshed 是否主动刷新。@returns {Promise<void>} 完成读取和渲染，失败时保留重试入口。 */
  async function loadDashboard(refreshed) {
    dom['last-sync'].textContent = '数据加载中…';
    dom['metric-grid'].setAttribute('aria-busy', 'true');
    dom['dashboard-error'].hidden = true;
    try {
      const summary = await service.getDashboardSummary();
      state.summary = summary;
      renderMetrics(summary.metrics);
      renderOccupancy(summary.occupancy, summary.spaces);
      renderArrivals(summary);
      renderRevenue(summary.revenue_history);
      renderContracts(summary.expiring_contracts, summary.vehicles);
      dom['last-sync'].textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      if (refreshed) ui.notify('运营数据已刷新');
    } catch (error) {
      dom['last-sync'].textContent = '加载失败';
      dom['dashboard-error'].hidden = false;
      dom['dashboard-error'].innerHTML = ui.escape(error.message || '数据读取失败') + ' <button type="button" class="button button-secondary button-small" data-action="refresh">重新加载</button>';
    } finally {
      dom['metric-grid'].setAttribute('aria-busy', 'false');
      updateStorageLabel();
    }
  }
  // 运营总览加载功能注释结束

  // 移动导航开合功能注释开始
  /** @param {boolean} open 是否打开。@returns {void} 同步隐藏导航的焦点可达性。 */
  function setMenu(open) {
    const mobile = global.matchMedia('(max-width: 720px)').matches;
    dom.shell.classList.toggle('menu-open', open && mobile);
    dom.menuButton.setAttribute('aria-expanded', String(open && mobile));
    dom.menuButton.setAttribute('aria-label', open && mobile ? '关闭导航' : '打开导航');
    dom.sidebar.inert = mobile && !open;
    if (!mobile) dom.sidebar.removeAttribute('inert');
  }
  // 移动导航开合功能注释结束

  // 页面导航功能注释开始
  /** @param {string} requested 视图ID。@param {boolean} updateHash 是否新增历史锚点。@returns {Promise<void>} 加载并显示业务页。 */
  async function switchView(requested, updateHash) {
    const view = Object.prototype.hasOwnProperty.call(titles, requested) ? requested : 'overview';
    const token = ++state.navigation;
    state.activeView = view;
    if (updateHash !== false && global.location.hash !== '#' + view) global.history.pushState(null, '', '#' + view);
    document.querySelectorAll('[data-panel]').forEach(function togglePanel(panel) { panel.classList.toggle('is-visible', panel.dataset.panel === view); });
    document.querySelectorAll('[data-view]').forEach(function toggleNav(link) {
      const active = link.dataset.view === view;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    dom['page-title'].textContent = titles[view];
    document.title = titles[view] + ' · ParkPilot 停车场管理';
    setMenu(false);
    const panel = document.getElementById(view);
    if (view === 'overview') return loadDashboard(false);
    panel.setAttribute('aria-busy', 'true');
    try {
      const mount = global.ParkingPages && global.ParkingPages[view];
      if (typeof mount !== 'function') throw new Error('页面脚本未加载，请检查源码文件是否完整');
      await mount(panel);
      if (token === state.navigation) dom['last-sync'].textContent = '数据已更新';
    } catch (error) {
      panel.innerHTML = '<div class="panel"><h1>' + ui.escape(titles[view]) + '</h1><div class="notice notice-error" role="alert">' + ui.escape(error.message) + '</div><button type="button" class="button button-secondary button-small" data-action="refresh">重新加载</button></div>';
    } finally {
      panel.setAttribute('aria-busy', 'false');
      updateStorageLabel();
    }
  }
  // 页面导航功能注释结束

  // 总览导出功能注释开始
  /** @returns {Promise<void>} 导出当前服务真实指标与七日流水汇总。 */
  async function exportOverview() {
    const summary = await service.getDashboardSummary();
    const rows = [['当前在场车辆', summary.metrics.current_vehicles], ['启用车位', summary.metrics.usable_spaces], ['占用车位', summary.metrics.occupied_spaces], ['今日已收款', summary.metrics.today_revenue], ['生效月租合同', summary.metrics.active_contracts], ['待支付流水', summary.metrics.pending_payments]];
    summary.revenue_history.forEach(function exportDay(row) { rows.push([row.label + ' 已支付收入', row.value]); });
    ui.exportCsv('停车场运营总览-' + ui.today() + '.csv', ['指标', '数值'], rows);
    ui.notify('运营报表已导出');
  }
  // 总览导出功能注释结束

  // 全局点击处理功能注释开始
  /** @param {MouseEvent} event 点击事件。@returns {Promise<void>} 执行导航、刷新、登记、导出或演示重置。 */
  async function handleClick(event) {
    const link = event.target.closest('[data-view], [data-view-link]');
    const action = event.target.closest('[data-action]');
    if (link) {
      event.preventDefault();
      const returnFocus = dom.menuButton.getAttribute('aria-expanded') === 'true';
      await switchView(link.dataset.view || link.dataset.viewLink, true);
      if (returnFocus) dom.menuButton.focus();
      return;
    }
    if (!action) return;
    try {
      if (action.dataset.action === 'toggle-menu') setMenu(!dom.shell.classList.contains('menu-open'));
      if (action.dataset.action === 'refresh') {
        action.disabled = true;
        await (state.activeView === 'overview' ? loadDashboard(true) : switchView(state.activeView, false));
      }
      if (action.dataset.action === 'export') await exportOverview();
      if (action.dataset.action === 'check-in') {
        await switchView('parking-records', true);
        if (typeof global.ParkingOpenEntry === 'function') await global.ParkingOpenEntry();
      }
      if (action.dataset.action === 'reset-demo' && global.confirm('重置将删除本浏览器保存的演示修改并恢复初始样例，是否继续？')) {
        service.resetDemoData();
        await switchView(state.activeView, false);
        ui.notify('演示数据已恢复，新增与编辑记录已清除');
      }
    } catch (error) {
      ui.notify(error.message || '操作失败，请重试');
    } finally {
      action.disabled = false;
    }
  }
  // 全局点击处理功能注释结束

  // 全局事件绑定功能注释开始
  /** @returns {void} 绑定一次全局事件；各模块自行管理局部表单与表格。 */
  function bindEvents() {
    document.addEventListener('click', handleClick);
    global.addEventListener('hashchange', function restoreHash() { switchView(global.location.hash.slice(1), false); });
    global.addEventListener('parking-data-changed', function refreshAfterChange() {
      updateStorageLabel();
      if (state.activeView === 'overview') loadDashboard(false);
    });
    document.addEventListener('keydown', function closeMenu(event) {
      if (event.key === 'Escape' && dom.shell.classList.contains('menu-open')) { setMenu(false); dom.menuButton.focus(); }
    });
    document.querySelector('.main-content').addEventListener('click', function closeMenuOutside(event) {
      if (!event.target.closest('[data-action="toggle-menu"]') && dom.shell.classList.contains('menu-open')) setMenu(false);
    });
    global.matchMedia('(max-width: 720px)').addEventListener('change', function adaptMenu() { setMenu(false); });
  }
  // 全局事件绑定功能注释结束

  cacheDom();
  bindEvents();
  setMenu(false);
  switchView(global.location.hash.slice(1) || 'overview', false);
})(window);
// 应用初始化功能注释结束
