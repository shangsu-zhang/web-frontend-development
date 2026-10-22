// 查询统计页面功能注释开始
/**
 * 按停车场数据库查询说明计算 11 个只读查询结果，并通过统一数据服务读取数据。
 * @param {Window} global 浏览器全局对象。
 * @returns {void} 注册统计页面渲染函数。
 */
(function registerReportPage(global) {
  'use strict';

  const resources = ['administrators', 'vehicle_owners', 'vehicles', 'parking_spaces', 'rental_contracts', 'parking_records', 'payment_records'];
  const pageSize = 10;
  const definitions = [
    { id: 'single-1', group: '单表查询', name: '当前在场的临时车辆', source: 'parking_record' },
    { id: 'single-2', group: '单表查询', name: '未来 30 天内到期的有效月租合同', source: 'rental_contract' },
    { id: 'single-3', group: '单表查询', name: '指定日期已支付的缴费流水', source: 'payment_record' },
    { id: 'multi-1', group: '多表查询', name: '在场车辆、车主和车位', source: 'parking_record、vehicle、vehicle_owner、parking_space' },
    { id: 'multi-2', group: '多表查询', name: '按月租合同统计已支付金额', source: 'rental_contract、vehicle、vehicle_owner、payment_record' },
    { id: 'multi-3', group: '多表查询', name: '按日期和缴费类型统计收入', source: 'payment_record、administrator' },
    { id: 'stat-1', group: '统计查询', name: '按区域统计车位数量与占用情况', source: 'parking_space' },
    { id: 'stat-2', group: '统计查询', name: '车辆停车次数、累计时长与费用', source: 'vehicle、vehicle_owner、parking_record' },
    { id: 'stat-3', group: '统计查询', name: '已支付收入总览', source: 'payment_record' },
    { id: 'stat-4', group: '统计查询', name: '管理员业务办理量统计', source: 'administrator、parking_record、rental_contract、payment_record' },
    { id: 'stat-5', group: '统计查询', name: '本月每日收入统计', source: 'payment_record' }
  ];

  // 日期和 HTML 工具功能注释开始
  /** HTML 编码用户可控字段，供报表表格和状态反馈安全使用。@param {*} value 原始数据。@returns {string} HTML 文本编码结果。 */
  function escape(value) {
    return global.ParkingUI.escape(value == null ? '' : value);
  }

  /** 将本地日期偏移指定天数，避免将日期解释成 UTC。@param {string} value YYYY-MM-DD 日期。@param {number} days 偏移天数。@returns {string} YYYY-MM-DD 日期。 */
  function addDays(value, days) {
    const parts = value.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] + days);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  /** 生成金额格式化值供表格和 CSV 同时复用。@param {number|string} value 金额。@returns {string} 两位小数金额。 */
  function money(value) {
    return global.ParkingUI.money(value);
  }

  /** 对日期范围执行闭区间筛选，日期端点均包含。@param {string} date 行日期。@param {string} from 起始日期。@param {string} to 截止日期。@returns {boolean} 是否在范围内。 */
  function inDateRange(date, from, to) {
    const day = String(date || '').slice(0, 10);
    return Boolean(day && (!from || day >= from) && (!to || day <= to));
  }
  // 日期和 HTML 工具功能注释结束

  // 报表计算功能注释开始
  /** 依照查询说明计算单表、多表和统计结果，保留 SQL 的连接及条件聚合口径。@param {object} data 八表中用于查询的资源集合。@param {object} filters 筛选日期、类型与办理管理员。@param {string} today 当前业务日期。@returns {object[][]} 11 组按 SQL 字段顺序排列的报表数据。 */
  function calculate(data, filters, today) {
    const vehicles = new Map(data.vehicles.map((row) => [String(row.vehicle_id), row]));
    const owners = new Map(data.vehicle_owners.map((row) => [String(row.owner_id), row]));
    const spaces = new Map(data.parking_spaces.map((row) => [String(row.parking_space_id), row]));
    const admins = new Map(data.administrators.map((row) => [String(row.administrator_id), row]));
    const onLotTemporary = data.parking_records.filter((row) => row.parking_type === '临时停车' && row.record_status === '在场' && row.exit_time == null)
      .sort((a, b) => String(a.entry_time).localeCompare(String(b.entry_time)))
      .map((row) => ({ parking_record_id: row.parking_record_id, vehicle_id: row.vehicle_id, parking_space_id: row.parking_space_id, entry_time: row.entry_time, record_status: row.record_status }));

    const expiry30 = data.rental_contracts.filter((row) => row.contract_status === '生效' && row.end_date >= today && row.end_date <= addDays(today, 30))
      .sort((a, b) => String(a.end_date).localeCompare(String(b.end_date)))
      .map((row) => ({ rental_contract_id: row.rental_contract_id, contract_no: row.contract_no, vehicle_id: row.vehicle_id, start_date: row.start_date, end_date: row.end_date, monthly_rent: Number(row.monthly_rent) }));

    const paymentDate = filters.date || today;
    const dailyPayments = data.payment_records.filter((row) => row.payment_status === '已支付' && row.paid_at && String(row.paid_at).slice(0, 10) === paymentDate)
      .sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)))
      .map((row) => ({ payment_no: row.payment_no, payment_type: row.payment_type, amount_due: Number(row.amount_due), amount_paid: Number(row.amount_paid), payment_method: row.payment_method, paid_at: row.paid_at }));

    const currentVehicles = data.parking_records.filter((record) => record.record_status === '在场' && record.exit_time == null).map((record) => {
      const vehicle = vehicles.get(String(record.vehicle_id));
      const owner = vehicle && owners.get(String(vehicle.owner_id));
      const space = spaces.get(String(record.parking_space_id));
      return vehicle && owner && space ? { license_plate: vehicle.license_plate, owner_name: owner.name, space_code: space.space_code, area: space.area, entry_time: record.entry_time, parking_type: record.parking_type } : null;
    }).filter(Boolean).sort((a, b) => String(a.area).localeCompare(String(b.area), 'zh-CN') || String(a.space_code).localeCompare(String(b.space_code), 'zh-CN', { numeric: true }));

    const paidByContract = new Map();
    data.payment_records.filter((row) => row.payment_status === '已支付').forEach((payment) => {
      const key = String(payment.rental_contract_id);
      const aggregate = paidByContract.get(key) || { paid_amount: 0, paid_count: 0 };
      aggregate.paid_amount += Number(payment.amount_paid);
      aggregate.paid_count += 1;
      paidByContract.set(key, aggregate);
    });
    const contractPayments = data.rental_contracts.map((contract) => {
      const vehicle = vehicles.get(String(contract.vehicle_id));
      const owner = vehicle && owners.get(String(vehicle.owner_id));
      const paid = paidByContract.get(String(contract.rental_contract_id)) || { paid_amount: 0, paid_count: 0 };
      return vehicle && owner ? { contract_no: contract.contract_no, license_plate: vehicle.license_plate, owner_name: owner.name, monthly_rent: Number(contract.monthly_rent), paid_amount: paid.paid_amount, paid_count: paid.paid_count, end_date: contract.end_date } : null;
    }).filter(Boolean).sort((a, b) => String(a.end_date).localeCompare(String(b.end_date))).map(({ end_date, ...row }) => row);

    const revenueGroups = new Map();
    data.payment_records.filter((row) => row.payment_status === '已支付' && row.paid_at && inDateRange(row.paid_at, filters.from, filters.to) && (!filters.type || row.payment_type === filters.type) && (!filters.administrator || String(row.handled_by_administrator_id) === filters.administrator)).forEach((payment) => {
      const admin = admins.get(String(payment.handled_by_administrator_id));
      if (!admin) return;
      const day = String(payment.paid_at).slice(0, 10);
      const key = day + '|' + payment.payment_type + '|' + admin.administrator_id;
      const aggregate = revenueGroups.get(key) || { payment_date: day, payment_type: payment.payment_type, administrator_name: admin.name, payment_count: 0, revenue_amount: 0, administrator_id: admin.administrator_id };
      aggregate.payment_count += 1;
      aggregate.revenue_amount += Number(payment.amount_paid);
      revenueGroups.set(key, aggregate);
    });
    const dailyRevenueByTypeAdmin = Array.from(revenueGroups.values()).sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)) || String(a.payment_type).localeCompare(String(b.payment_type), 'zh-CN') || a.administrator_id - b.administrator_id).map(({ administrator_id, ...row }) => row);

    const spaceGroups = new Map();
    data.parking_spaces.forEach((space) => {
      const aggregate = spaceGroups.get(space.area) || { area: space.area, total_spaces: 0, occupied_spaces: 0, available_spaces: 0, disabled_spaces: 0 };
      aggregate.total_spaces += 1;
      if (space.space_status === '占用') aggregate.occupied_spaces += 1;
      if (space.space_status === '可用') aggregate.available_spaces += 1;
      if (space.space_status === '停用') aggregate.disabled_spaces += 1;
      spaceGroups.set(space.area, aggregate);
    });
    const occupancyByArea = Array.from(spaceGroups.values()).map((row) => Object.assign(row, { occupancy_rate: Number((row.occupied_spaces * 100 / row.total_spaces).toFixed(2)) })).sort((a, b) => String(a.area).localeCompare(String(b.area), 'zh-CN'));

    const recordsByVehicle = new Map();
    data.parking_records.forEach((record) => {
      const aggregate = recordsByVehicle.get(String(record.vehicle_id)) || { parking_count: 0, total_duration_minutes: 0, total_amount_due: 0 };
      aggregate.parking_count += 1;
      aggregate.total_duration_minutes += Number(record.duration_minutes || 0);
      aggregate.total_amount_due += Number(record.amount_due || 0);
      recordsByVehicle.set(String(record.vehicle_id), aggregate);
    });
    const vehicleUsage = data.vehicles.map((vehicle) => {
      const owner = owners.get(String(vehicle.owner_id));
      const totals = recordsByVehicle.get(String(vehicle.vehicle_id)) || { parking_count: 0, total_duration_minutes: 0, total_amount_due: 0 };
      return owner ? { license_plate: vehicle.license_plate, owner_name: owner.name, ...totals } : null;
    }).filter(Boolean).sort((a, b) => b.parking_count - a.parking_count || String(a.license_plate).localeCompare(String(b.license_plate), 'zh-CN', { numeric: true }));

    const paidByType = new Map();
    data.payment_records.filter((row) => row.payment_status === '已支付').forEach((payment) => {
      const aggregate = paidByType.get(payment.payment_type) || { payment_type: payment.payment_type, payment_count: 0, total_amount_paid: 0 };
      aggregate.payment_count += 1;
      aggregate.total_amount_paid += Number(payment.amount_paid);
      paidByType.set(payment.payment_type, aggregate);
    });
    const paidTotals = Array.from(paidByType.values()).sort((a, b) => String(a.payment_type).localeCompare(String(b.payment_type), 'zh-CN'));
    if (paidTotals.length) paidTotals.push({ payment_type: '全部类型', payment_count: paidTotals.reduce((sum, row) => sum + row.payment_count, 0), total_amount_paid: paidTotals.reduce((sum, row) => sum + row.total_amount_paid, 0) });

    const administratorTotals = data.administrators.map((admin) => {
      const handledRecords = data.parking_records.filter((row) => String(row.handled_by_administrator_id) === String(admin.administrator_id)).length;
      const handledContracts = data.rental_contracts.filter((row) => String(row.handled_by_administrator_id) === String(admin.administrator_id)).length;
      const paid = data.payment_records.filter((row) => String(row.handled_by_administrator_id) === String(admin.administrator_id) && row.payment_status === '已支付');
      return { employee_no: admin.employee_no, name: admin.name, role: admin.role, parking_record_count: handledRecords, rental_contract_count: handledContracts, paid_payment_count: paid.length, collected_amount: paid.reduce((sum, row) => sum + Number(row.amount_paid), 0) };
    }).sort((a, b) => b.collected_amount - a.collected_amount);

    const month = filters.month || today.slice(0, 7);
    const monthFirst = month + '-01';
    const nextMonthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1);
    const nextMonth = nextMonthDate.getFullYear() + '-' + String(nextMonthDate.getMonth() + 1).padStart(2, '0') + '-01';
    const monthGroups = new Map();
    data.payment_records.filter((row) => row.payment_status === '已支付' && row.paid_at && row.paid_at >= monthFirst && row.paid_at < nextMonth && (!filters.type || row.payment_type === filters.type) && (!filters.administrator || String(row.handled_by_administrator_id) === filters.administrator)).forEach((payment) => {
      const day = String(payment.paid_at).slice(0, 10);
      const aggregate = monthGroups.get(day) || { date: day, temporary_revenue: 0, rental_revenue: 0, daily_revenue: 0 };
      if (payment.payment_type === '临停停车费') aggregate.temporary_revenue += Number(payment.amount_paid);
      if (payment.payment_type === '月租费') aggregate.rental_revenue += Number(payment.amount_paid);
      aggregate.daily_revenue += Number(payment.amount_paid);
      monthGroups.set(day, aggregate);
    });
    const monthRevenue = Array.from(monthGroups.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));

    return [onLotTemporary, expiry30, dailyPayments, currentVehicles, contractPayments, dailyRevenueByTypeAdmin, occupancyByArea, vehicleUsage, paidTotals, administratorTotals, monthRevenue];
  }
  // 报表计算功能注释结束

  // 列定义功能注释开始
  /** 提供与查询说明 SELECT 列一致的表头、键和导出字段。@param {object} ui 公共 UI 工具。@returns {object[][]} 11 组列配置。 */
  function columnSets(ui) {
    const text = (label, key) => ({ label: label, key: key });
    const amount = (label, key) => ({ label: label, render: (row) => escape(money(row[key])) });
    const percent = (label, key) => ({ label: label, render: (row) => escape(Number(row[key]).toFixed(2) + '%') });
    return [
      [text('停车记录 ID', 'parking_record_id'), text('车辆 ID', 'vehicle_id'), text('车位 ID', 'parking_space_id'), text('入场时间', 'entry_time'), { label: '记录状态', render: (row) => ui.badge(row.record_status) }],
      [text('合同 ID', 'rental_contract_id'), text('合同编号', 'contract_no'), text('车辆 ID', 'vehicle_id'), text('开始日期', 'start_date'), text('结束日期', 'end_date'), amount('月租金额', 'monthly_rent')],
      [text('缴费流水号', 'payment_no'), text('缴费类型', 'payment_type'), amount('应收金额', 'amount_due'), amount('实收金额', 'amount_paid'), text('支付方式', 'payment_method'), text('支付时间', 'paid_at')],
      [text('车牌号', 'license_plate'), text('车主姓名', 'owner_name'), text('车位编号', 'space_code'), text('区域', 'area'), text('入场时间', 'entry_time'), text('停车类型', 'parking_type')],
      [text('合同编号', 'contract_no'), text('车牌号', 'license_plate'), text('车主姓名', 'owner_name'), amount('月租金额', 'monthly_rent'), amount('已支付金额', 'paid_amount'), text('已支付笔数', 'paid_count')],
      [text('缴费日期', 'payment_date'), text('缴费类型', 'payment_type'), text('办理管理员', 'administrator_name'), text('缴费笔数', 'payment_count'), amount('收入金额', 'revenue_amount')],
      [text('区域', 'area'), text('车位总数', 'total_spaces'), text('占用数', 'occupied_spaces'), text('可用数', 'available_spaces'), text('停用数', 'disabled_spaces'), percent('占用率', 'occupancy_rate')],
      [text('车牌号', 'license_plate'), text('车主姓名', 'owner_name'), text('停车次数', 'parking_count'), text('累计时长（分钟）', 'total_duration_minutes'), amount('累计应收金额', 'total_amount_due')],
      [text('缴费类型', 'payment_type'), text('已支付笔数', 'payment_count'), amount('已收金额', 'total_amount_paid')],
      [text('员工编号', 'employee_no'), text('管理员', 'name'), text('岗位', 'role'), text('停车记录数', 'parking_record_count'), text('合同数', 'rental_contract_count'), text('已支付笔数', 'paid_payment_count'), amount('收款金额', 'collected_amount')],
      [text('日期', 'date'), amount('临停收入', 'temporary_revenue'), amount('月租收入', 'rental_revenue'), amount('当日总收入', 'daily_revenue')]
    ];
  }
  // 列定义功能注释结束

  // 报表页面渲染和交互功能注释开始
  /** 将当前结果转换为转义表格 HTML，且展示查询无结果状态。@param {object[]} columns 列定义。@param {object[]} rows 业务结果。@param {number} page 当前页。@param {object} ui 公共 UI。@returns {string} 表格分页视图 HTML。 */
  function renderTable(columns, rows, page, ui) {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const visible = rows.slice((page - 1) * pageSize, page * pageSize);
    const table = visible.length ? ui.table(columns, visible) : '<div class="empty-state">该筛选条件下没有结果。请检查日期、管理员或状态。</div>';
    return table + '<div class="pager"><span>共 ' + rows.length + ' 条，第 ' + page + ' / ' + pages + ' 页</span><button type="button" class="button button-small button-secondary" data-report-action="previous"' + (page <= 1 ? ' disabled' : '') + '>上一页</button><button type="button" class="button button-small button-secondary" data-report-action="next"' + (page >= pages ? ' disabled' : '') + '>下一页</button><button type="button" class="button button-secondary" data-report-action="export">导出当前查询 CSV</button></div>';
  }

  /** 生成查询页面、加载资源、应用筛选，并支持 11 组查询切换及导出。@param {HTMLElement} container 页面容器。@returns {Promise<void>} 完成首次数据加载。 */
  async function mountReports(container) {
    const ui = global.ParkingUI;
    const data = {};
    const state = { selected: 0, page: 1, date: ui.today(), from: '', to: '', month: ui.today().slice(0, 7), type: '', administrator: '' };
    let results = [];
    let columns = [];
    let currentRows = [];

    // 单项查询结果渲染功能注释开始
    /** 更新当前结果表和分页控件，筛选前先核验日期输入。@returns {void} 替换报表视图 DOM。 */
    function renderSelected() {
      const definition = definitions[state.selected];
      const controls = definition.id === 'single-3' ? '<label class="field">支付日期<input type="date" name="date" value="' + escape(state.date) + '" required></label>' : '';
      const rangeControls = definition.id === 'multi-3' ? '<label class="field">起始日期<input type="date" name="from" value="' + escape(state.from) + '"></label><label class="field">截止日期<input type="date" name="to" value="' + escape(state.to) + '"></label><label class="field">缴费类型<select name="type"><option value="">全部类型</option><option value="临停停车费"' + (state.type === '临停停车费' ? ' selected' : '') + '>临停停车费</option><option value="月租费"' + (state.type === '月租费' ? ' selected' : '') + '>月租费</option></select></label>' + administratorControl() : '';
      const monthControls = definition.id === 'stat-5' ? '<label class="field">统计月份<input type="month" name="month" value="' + escape(state.month) + '" required></label><label class="field">缴费类型<select name="type"><option value="">全部类型</option><option value="临停停车费"' + (state.type === '临停停车费' ? ' selected' : '') + '>临停停车费</option><option value="月租费"' + (state.type === '月租费' ? ' selected' : '') + '>月租费</option></select></label>' + administratorControl() : '';
      currentRows = results[state.selected];
      columns = columnSets(ui)[state.selected];
      const tabs = definitions.map((item, index) => {
        return '<button type="button" class="report-tab" data-report="' + index + '" aria-pressed="' + (index === state.selected) + '">' + escape(item.group.slice(0, 2) + ' ' + (index + 1)) + '</button>';
      }).join('');
      container.innerHTML = '<section class="panel"><div class="module-heading"><div><h1>查询统计</h1><p>11 项查询口径与数据库查询说明一致；结果由当前停车业务数据实时计算。</p></div><button type="button" class="button button-secondary" data-report-action="refresh">刷新数据</button></div><div class="toolbar report-tabs" aria-label="数据库查询和统计案例">' + tabs + '</div><div class="notice"><strong>' + escape(definition.group + ' · ' + definition.name) + '</strong><br>SQL 来源表：' + escape(definition.source) + '。当前结果 ' + currentRows.length + ' 条。</div>' +
        '<form class="toolbar" data-report-filter>' + controls + rangeControls + monthControls + '<button class="button button-primary" type="submit">应用筛选</button><button class="button button-secondary" type="button" data-report-action="reset">重置筛选</button></form>' + renderTable(columns, currentRows, state.page, ui) + '</section>';
    }
    // 单项查询结果渲染功能注释结束

    // 办理员选项功能注释开始
    /** 为多表收入统计提供安全的管理员筛选项。@returns {string} 管理员筛选控件 HTML。 */
    function administratorControl() {
      return '<label class="field">办理管理员<select name="administrator"><option value="">全部管理员</option>' + data.administrators.map((row) => '<option value="' + escape(row.administrator_id) + '"' + (state.administrator === String(row.administrator_id) ? ' selected' : '') + '>' + escape(row.name + ' · ' + row.employee_no) + '</option>').join('') + '</select></label>';
    }
    // 办理员选项功能注释结束

    // 报表过滤提交功能注释开始
    /** 读取日期、月份、类型和办理员过滤值并重新计算对应查询。@param {SubmitEvent} event 表单事件。@returns {void} 更新结果或提示范围错误。 */
    container.onsubmit = function applyReportFilters(event) {
      if (!event.target.matches('[data-report-filter]')) return;
      event.preventDefault();
      const values = new FormData(event.target);
      const from = String(values.get('from') || '');
      const to = String(values.get('to') || '');
      const month = String(values.get('month') || '');
      if (from && to && from > to) return ui.notify('起始日期不能晚于截止日期。');
      if (month && !/^\d{4}-\d{2}$/.test(month)) return ui.notify('请选择有效的统计月份。');
      if (values.has('date')) state.date = String(values.get('date'));
      if (values.has('from')) state.from = from;
      if (values.has('to')) state.to = to;
      if (values.has('month')) state.month = month;
      if (values.has('type')) state.type = String(values.get('type') || '');
      if (values.has('administrator')) state.administrator = String(values.get('administrator') || '');
      state.page = 1;
      results = calculate(data, state, ui.today());
      renderSelected();
    };
    // 报表过滤提交功能注释结束

    // 报表按钮事件功能注释开始
    /** 委托处理查询切换、分页、重置、刷新和安全 CSV 导出。@param {MouseEvent} event 点击事件。@returns {Promise<void>} 处理结果。 */
    container.onclick = async function handleReportClick(event) {
      const query = event.target.closest('[data-report]');
      if (query && container.contains(query)) {
        state.selected = Number(query.dataset.report);
        state.page = 1;
        return renderSelected();
      }
      const button = event.target.closest('[data-report-action]');
      if (!button || !container.contains(button) || button.disabled) return;
      const action = button.dataset.reportAction;
      if (action === 'refresh') return loadReports();
      if (action === 'reset') {
        state.date = ui.today(); state.from = ''; state.to = ''; state.month = ui.today().slice(0, 7); state.type = ''; state.administrator = ''; state.page = 1;
        results = calculate(data, state, ui.today());
        return renderSelected();
      }
      if (action === 'previous' || action === 'next') {
        const pages = Math.max(1, Math.ceil(currentRows.length / pageSize));
        state.page = Math.min(pages, Math.max(1, state.page + (action === 'next' ? 1 : -1)));
        return renderSelected();
      }
      if (action === 'export') {
        const rawValue = (row, column) => column.key ? row[column.key] : column.render ? column.render(row).replace(/<[^>]*>/g, '') : '';
        ui.exportCsv('停车场查询-' + definitions[state.selected].id + '-' + ui.today() + '.csv', columns.map((column) => column.label), currentRows.map((row) => columns.map((column) => rawValue(row, column))));
        return ui.notify('当前查询结果 CSV 已导出。');
      }
    };
    // 报表按钮事件功能注释结束

    // 数据加载功能注释开始
    /** 并行读取报表所需的表；失败信息留在页面并提供刷新按钮。@returns {Promise<void>} 加载和计算结果。 */
    async function loadReports() {
      container.innerHTML = '<section class="panel"><h2>查询统计</h2><p>正在读取停车业务数据……</p></section>';
      try {
        const loaded = await Promise.all(resources.map((resource) => ui.all(resource)));
        resources.forEach((resource, index) => { data[resource] = loaded[index]; });
        results = calculate(data, state, ui.today());
        renderSelected();
      } catch (error) {
        container.innerHTML = '<section class="panel"><h2>查询统计</h2><p class="notice" role="alert">数据加载失败：' + escape(error.message || error) + '</p><button type="button" class="button button-primary" data-report-action="refresh">重试</button></section>';
      }
    }
    // 数据加载功能注释结束

    await loadReports();
  }
  // 报表页面渲染和交互功能注释结束

  global.ParkingPages = global.ParkingPages || {};
  global.ParkingPages.reports = mountReports;
})(window);
// 查询统计页面功能注释结束
