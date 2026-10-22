// 停车运营页面功能注释开始
/**
 * 注册停车、月租和缴费页面；数据仅经 parkingService 读写，兼容未来 Java 接口。
 * @param {Window} global 浏览器全局对象。
 * @returns {void} 注册页面渲染函数。
 */
(function registerOperationPages(global) {
  'use strict';

  const resources = ['administrators', 'vehicle_owners', 'vehicles', 'parking_spaces', 'charge_rules', 'rental_contracts', 'parking_records', 'payment_records'];
  const methods = ['现金', '微信', '支付宝', '银行卡'];
  const pageSize = 8;

  // 基础字段转换功能注释开始
  /** 将界面日期时间转换为数据库 DATETIME；可选空值保留为 null。@param {string} value 控件值。@returns {string|null} 数据库时间。 */
  function sqlTime(value) {
    if (!value) return null;
    const normalized = String(value).replace('T', ' ');
    return normalized.length === 16 ? normalized + ':00' : normalized;
  }

  /** 将数据库时间转换为 datetime-local 控件值。@param {string} value 数据库时间。@returns {string} 控件时间。 */
  function inputTime(value) {
    return value ? String(value).replace(' ', 'T').slice(0, 16) : '';
  }

  /** 计算指定日期的下一天，避免 UTC 日期转换引起时区偏移。@param {string} value YYYY-MM-DD。@returns {string} 下一日。 */
  function nextDay(value) {
    const parts = value.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  /** 生成可编辑的建议业务编号，唯一约束仍由服务校验。@param {string} prefix 编号前缀。@returns {string} 建议编号。 */
  function businessNo(prefix) {
    return prefix + '-' + new Date().getTime();
  }

  /** 将字符串数组转换为统一下拉选项。@param {string[]} values 原始枚举。@returns {object[]} 下拉选项。 */
  function enumOptions(values) {
    return values.map((value) => ({ value: value, label: value }));
  }

  /** 根据主键取得关联数据；缺失引用显示回退信息。@param {object[]} rows 资源数组。@param {string} key 主键名。@param {number|string} id 主键值。@returns {object} 关联记录。 */
  function linked(rows, key, id) {
    return rows.find((row) => String(row[key]) === String(id)) || {};
  }

  /** 构建安全操作按钮，动态主键统一转义。@param {object} ui 公共 UI。@param {string} action 操作名。@param {number} id 主键。@param {string} label 按钮名称。@param {boolean} danger 是否危险操作。@returns {string} 按钮 HTML。 */
  function actionButton(ui, action, id, label, danger) {
    return '<button type="button" class="button button-small ' + (danger ? 'button-danger' : 'button-secondary') + '" data-action="' + ui.escape(action) + '" data-id="' + ui.escape(id) + '">' + ui.escape(label) + '</button>';
  }

  /** 返回当前启用管理员的表单配置。@param {object} context 页面上下文。@returns {object} 管理员字段。 */
  function administratorField(context) {
    return { name: 'handled_by_administrator_id', label: '办理管理员', type: 'select', required: true, options: context.data.administrators.filter((row) => row.account_status === '启用').map((row) => ({ value: row.administrator_id, label: row.name + '（' + row.employee_no + '）' })) };
  }

  /** 创建标准可选备注字段。@returns {object} 数据库 remark 配置。 */
  function remarkField() {
    return { name: 'remark', label: '备注', type: 'textarea', maxLength: 200 };
  }
  // 基础字段转换功能注释结束

  // 关联展示与列表功能注释开始
  /** 为业务行补充车牌、车主、车位和办理人，原始字段保持不变。@param {object} context 页面上下文。@param {object} row 原始行。@returns {object} 展示行。 */
  function decorate(context, row) {
    const data = context.data;
    const parking = linked(data.parking_records, 'parking_record_id', row.parking_record_id);
    const contract = linked(data.rental_contracts, 'rental_contract_id', row.rental_contract_id);
    const vehicle = linked(data.vehicles, 'vehicle_id', row.vehicle_id || parking.vehicle_id || contract.vehicle_id);
    const owner = linked(data.vehicle_owners, 'owner_id', vehicle.owner_id);
    const space = linked(data.parking_spaces, 'parking_space_id', row.parking_space_id || parking.parking_space_id);
    const admin = linked(data.administrators, 'administrator_id', row.handled_by_administrator_id);
    const rule = linked(data.charge_rules, 'charge_rule_id', row.charge_rule_id);
    return Object.assign({}, row, {
      _vehicle: vehicle.license_plate || '车辆 #' + (row.vehicle_id || parking.vehicle_id || contract.vehicle_id || '—'),
      _owner: owner.name || '—', _phone: owner.phone || '—', _space: space.space_code || '—',
      _administrator: admin.name || '管理员 #' + row.handled_by_administrator_id,
      _rule: rule.rule_name || '—', _contract: contract.contract_no || '—',
      _association: row.payment_type === '临停停车费' ? '停车 #' + row.parking_record_id : contract.contract_no || '—'
    });
  }

  /** 生成列表筛选栏下拉选项，包含全部选项。@param {object} ui UI 工具。@param {string[]} values 枚举。@param {string} selected 当前值。@returns {string} option HTML。 */
  function filterOptions(ui, values, selected) {
    return '<option value="">全部</option>' + values.map((value) => '<option value="' + ui.escape(value) + '"' + (value === selected ? ' selected' : '') + '>' + ui.escape(value) + '</option>').join('');
  }

  /** 按筛选状态生成分页列表；日期筛选使用本页明确标注的业务日期字段。@param {object} context 页面上下文。@returns {void} 更新列表 DOM。 */
  function renderList(context) {
    const ui = context.ui;
    const config = context.config;
    const state = context.state;
    const today = ui.today();
    let rows = context.data[config.resource].map((row) => decorate(context, row));
    rows = rows.filter((row) => {
      const date = String(row[config.dateKey] || '').slice(0, 10);
      const searchable = Object.values(row).join(' ').toLocaleLowerCase();
      if (state.q && !searchable.includes(state.q.toLocaleLowerCase())) return false;
      if (state.status && row[config.statusKey] !== state.status) return false;
      if (state.type && row[config.typeKey] !== state.type) return false;
      if (state.from && (!date || date < state.from)) return false;
      if (state.to && (!date || date > state.to)) return false;
      if (state.expiry === '30') {
        const days = (new Date(row.end_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000;
        if (row.contract_status !== '生效' || days < 0 || days > 30) return false;
      }
      if (state.expiry === 'expired' && !(row.end_date < today && row.contract_status !== '终止')) return false;
      return true;
    });
    const sort = state.sort.split(':');
    rows.sort((left, right) => {
      const a = left[sort[0]];
      const b = right[sort[0]];
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a || '').localeCompare(String(b || ''), 'zh-CN', { numeric: true });
      return sort[1] === 'desc' ? -result : result;
    });
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    const sortOptions = config.sorts.map((item) => '<option value="' + ui.escape(item.value) + '"' + (state.sort === item.value ? ' selected' : '') + '>' + ui.escape(item.label) + '</option>').join('');
    const statusField = '<label class="field">状态<select name="status">' + filterOptions(ui, config.statuses, state.status) + '</select></label>';
    const typeField = config.types ? '<label class="field">类型<select name="type">' + filterOptions(ui, config.types, state.type) + '</select></label>' : '';
    const expiryField = config.resource === 'rental_contracts' ? '<label class="field">到期提醒<select name="expiry"><option value="">全部</option><option value="30"' + (state.expiry === '30' ? ' selected' : '') + '>未来 30 天到期</option><option value="expired"' + (state.expiry === 'expired' ? ' selected' : '') + '>已过结束日期</option></select></label>' : '';
    context.container.innerHTML = '<section class="panel"><div class="module-heading"><div><h2>' + ui.escape(config.title) + '</h2><p>' + ui.escape(config.description) + '</p></div><div class="toolbar"><button type="button" class="button button-secondary" data-action="refresh">刷新</button><button type="button" class="button button-primary" data-action="create">' + ui.escape(config.createLabel) + '</button></div></div>' +
      (config.notice ? '<p class="notice">' + ui.escape(config.notice(context)) + '</p>' : '') +
      '<form class="toolbar" data-operation-filter><label class="field">搜索<input type="search" name="q" value="' + ui.escape(state.q) + '" placeholder="' + ui.escape(config.searchPlaceholder) + '"></label>' + statusField + typeField + expiryField +
      '<label class="field">' + ui.escape(config.dateLabel) + '起始<input type="date" name="from" value="' + ui.escape(state.from) + '"></label><label class="field">截止<input type="date" name="to" value="' + ui.escape(state.to) + '"></label><label class="field">排序<select name="sort">' + sortOptions + '</select></label><button class="button button-primary" type="submit">查询</button><button class="button button-secondary" type="button" data-action="reset">重置</button></form>' +
      (rows.length ? ui.table(config.columns(context), rows.slice(start, start + pageSize)) : '<div class="empty-state">暂无符合条件的记录，可调整筛选或新增业务。</div>') + '<div class="pager"><span>共 ' + rows.length + ' 条，第 ' + state.page + ' / ' + pages + ' 页</span><button type="button" class="button button-small button-secondary" data-action="previous"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button><button type="button" class="button button-small button-secondary" data-action="next"' + (state.page >= pages ? ' disabled' : '') + '>下一页</button></div></section>';
  }

  /** 建立页面状态、加载关联资源并绑定事件；每次挂载替换事件避免重复操作。@param {HTMLElement} container 页面容器。@param {object} config 本页配置。@returns {Promise<void>} 挂载结果。 */
  async function mountList(container, config) {
    const context = { container: container, config: config, ui: global.ParkingUI, data: {}, state: { q: '', status: '', type: '', expiry: '', from: '', to: '', sort: config.sorts[0].value, page: 1 } };
    const token = {};
    container.operationPageToken = token;

    // 页面重新加载功能注释开始
    /** 从服务加载八表关联数据，失败时提供明确错误和重试入口。@returns {Promise<void>} 加载结果。 */
    context.reload = async function reloadOperations() {
      try {
        const result = await Promise.all(resources.map((resource) => context.ui.all(resource)));
        if (container.operationPageToken !== token) return;
        resources.forEach((resource, index) => { context.data[resource] = result[index]; });
        renderList(context);
      } catch (error) {
        if (container.operationPageToken !== token) return;
        container.innerHTML = '<section class="panel"><h2>' + context.ui.escape(config.title) + '</h2><p class="notice" role="alert">加载失败：' + context.ui.escape(error.message || error) + '</p><button class="button button-primary" type="button" data-action="refresh">重试</button></section>';
      }
    };
    // 页面重新加载功能注释结束

    // 页面筛选提交功能注释开始
    /** 校验日期范围并应用用户筛选。@param {SubmitEvent} event 表单事件。@returns {void} 更新本页筛选。 */
    container.onsubmit = function submitOperationsFilter(event) {
      if (!event.target.matches('[data-operation-filter]')) return;
      event.preventDefault();
      const values = new FormData(event.target);
      const from = String(values.get('from') || '');
      const to = String(values.get('to') || '');
      if (from && to && from > to) return context.ui.notify('起始日期不能晚于截止日期');
      ['q', 'status', 'type', 'expiry', 'from', 'to', 'sort'].forEach((key) => { context.state[key] = String(values.get(key) || ''); });
      context.state.q = context.state.q.trim();
      context.state.page = 1;
      renderList(context);
    };
    // 页面筛选提交功能注释结束

    // 总览快捷入场功能注释开始
    /** 供总览页切换到停车记录后直接打开入场表单，并在成功后刷新本页。@returns {Promise<object|null>} 新建记录或取消。 */
    if (config.resource === 'parking_records') {
      global.ParkingOpenEntry = async function openEntryFromDashboard() {
        if (container.operationPageToken !== token) throw new Error('请先打开停车记录页面再登记入场。');
        const result = await enterParking(context);
        if (result) await context.reload();
        return result;
      };
    }
    // 总览快捷入场功能注释结束

    // 页面操作委托功能注释开始
    /** 分派分页、刷新和业务按钮，统一显示业务校验错误。@param {MouseEvent} event 点击事件。@returns {Promise<void>} 操作结果。 */
    container.onclick = async function handleOperationClick(event) {
      const button = event.target.closest('[data-action]');
      if (!button || !container.contains(button) || button.disabled) return;
      const action = button.dataset.action;
      if (action === 'refresh') return context.reload();
      if (action === 'reset') {
        Object.assign(context.state, { q: '', status: '', type: '', expiry: '', from: '', to: '', sort: config.sorts[0].value, page: 1 });
        return renderList(context);
      }
      if (action === 'previous' || action === 'next') {
        context.state.page += action === 'next' ? 1 : -1;
        return renderList(context);
      }
      const row = context.data[config.resource].find((item) => String(item[config.idKey]) === button.dataset.id);
      try {
        button.disabled = true;
        const changed = await config.handle(context, action, row);
        if (changed) await context.reload();
      } catch (error) {
        context.ui.notify(error.message || String(error));
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    };
    // 页面操作委托功能注释结束
    await context.reload();
  }
  // 关联展示与列表功能注释结束

  // 停车记录业务功能注释开始
  /** 配置入场表单并校验类型关联、有效合同和可用车位。@param {object} context 页面上下文。@returns {Promise<object|null>} 新记录或取消。 */
  async function enterParking(context) {
    const data = context.data;
    const ui = context.ui;
    const inField = data.parking_records.filter((row) => row.record_status === '在场');
    const vehicles = data.vehicles.filter((row) => row.vehicle_status === '正常' && !inField.some((record) => String(record.vehicle_id) === String(row.vehicle_id)));
    const spaces = data.parking_spaces.filter((row) => row.space_status === '可用');
    if (!vehicles.length || !spaces.length) throw new Error(!vehicles.length ? '暂无可入场车辆，请先登记正常车辆或办理已有车辆出场。' : '暂无可用车位。');
    const rules = data.charge_rules.filter((row) => row.rule_status === '启用');
    const contracts = data.rental_contracts.filter((row) => row.contract_status === '生效' && vehicles.some((vehicle) => String(vehicle.vehicle_id) === String(row.vehicle_id)));
    if (!rules.length && !contracts.length) throw new Error('暂无可用收费规则或月租合同，暂时不能办理入场。');
    return ui.openForm({ title: '车辆入场登记', description: '临停使用收费规则；月租必须选择同一车辆、且覆盖入场日期的合同。', submitText: '确认入场', values: { parking_type: '临时停车', entry_time: inputTime(ui.dateTimeNow()), handled_by_administrator_id: administratorField(context).options[0]?.value }, fields: [
      { name: 'parking_type', label: '停车类型', type: 'select', required: true, options: enumOptions([...(rules.length ? ['临时停车'] : []), ...(contracts.length ? ['月租停车'] : [])]) },
      { name: 'vehicle_id', label: '车辆', type: 'select', required: true, options: vehicles.map((row) => ({ value: row.vehicle_id, label: row.license_plate })) },
      { name: 'parking_space_id', label: '可用车位', type: 'select', required: true, options: spaces.map((row) => ({ value: row.parking_space_id, label: row.space_code + ' · ' + row.area + ' · ' + row.space_type })) },
      { name: 'entry_time', label: '入场时间', type: 'datetime-local', required: true },
      { name: 'charge_rule_id', label: '收费规则', type: 'select', required: true, showWhen: (values) => values.parking_type === '临时停车', options: rules.map((row) => ({ value: row.charge_rule_id, label: row.rule_name + ' · ' + ui.money(row.hourly_rate) + '/小时' })) },
      { name: 'rental_contract_id', label: '有效月租合同', type: 'select', required: true, showWhen: (values) => values.parking_type === '月租停车', options: contracts.map((row) => ({ value: row.rental_contract_id, label: row.contract_no + ' · ' + linked(data.vehicles, 'vehicle_id', row.vehicle_id).license_plate + ' · 至 ' + row.end_date })) },
      administratorField(context), remarkField()
    ],
      /** @param {HTMLFormElement} form 入场表单。@param {object} values 当前字段值。@returns {void} 按车辆和入场日期刷新合同选项。 */
      onChange: function updateEntryContractOptions(form, values) {
      const control = form.elements.namedItem('rental_contract_id');
      if (!control) return;
      const entryDate = String(values.entry_time || '').slice(0, 10);
      const matches = contracts.filter((contract) => String(contract.vehicle_id) === String(values.vehicle_id) && entryDate >= contract.start_date && entryDate <= contract.end_date);
      const previous = String(values.rental_contract_id || '');
      control.innerHTML = '<option value="">请选择</option>' + matches.map((contract) => '<option value="' + ui.escape(contract.rental_contract_id) + '">' + ui.escape(contract.contract_no + ' · ' + linked(data.vehicles, 'vehicle_id', contract.vehicle_id).license_plate + ' · 至 ' + contract.end_date) + '</option>').join('');
      control.value = matches.some((contract) => String(contract.rental_contract_id) === previous) ? previous : '';
    }, onSubmit: async function submitParkingEntry(values) {
      const payload = Object.assign({}, values, { vehicle_id: Number(values.vehicle_id), parking_space_id: Number(values.parking_space_id), handled_by_administrator_id: Number(values.handled_by_administrator_id), charge_rule_id: values.parking_type === '临时停车' ? Number(values.charge_rule_id) : null, rental_contract_id: values.parking_type === '月租停车' ? Number(values.rental_contract_id) : null, entry_time: sqlTime(values.entry_time), remark: values.remark || null });
      if (payload.parking_type === '月租停车') {
        const contract = linked(contracts, 'rental_contract_id', payload.rental_contract_id);
        const date = payload.entry_time.slice(0, 10);
        if (String(contract.vehicle_id) !== String(payload.vehicle_id) || date < contract.start_date || date > contract.end_date) throw new Error('所选合同必须属于当前车辆，并覆盖入场日期。');
      }
      const created = await global.parkingService.createParkingRecord(payload);
      ui.notify('入场登记成功，车位已占用。');
      return created;
    } });
  }

  /** 办理出场并展示服务计算的停车时长、金额。@param {object} context 页面上下文。@param {object} row 在场记录。@returns {Promise<object|null>} 出场记录或取消。 */
  async function exitParking(context, row) {
    if (!row || row.record_status !== '在场') throw new Error('只有在场记录可以办理出场。');
    const ui = context.ui;
    const result = await ui.openForm({ title: '出场与计费', description: decorate(context, row)._vehicle + '，入场时间：' + row.entry_time + '。临停按原收费规则计费，月租停车金额为 0。', submitText: '确认出场', values: { exit_time: inputTime(ui.dateTimeNow()), handled_by_administrator_id: row.handled_by_administrator_id }, fields: [{ name: 'exit_time', label: '出场时间', type: 'datetime-local', required: true }, administratorField(context)], onSubmit: async function submitParkingExit(values) {
      const exitTime = sqlTime(values.exit_time);
      if (new Date(exitTime.replace(' ', 'T')) < new Date(row.entry_time.replace(' ', 'T'))) throw new Error('出场时间不能早于入场时间。');
      return global.parkingService.exitParkingRecord(row.parking_record_id, { exit_time: exitTime, handled_by_administrator_id: Number(values.handled_by_administrator_id) });
    } });
    if (result) ui.showDetail('出场计费结果', [['车牌', decorate(context, row)._vehicle], ['出场时间', result.exit_time], ['停车时长', result.duration_minutes + ' 分钟'], ['应收费用', ui.money(result.amount_due)], ['状态', result.record_status], ['后续操作', row.parking_type === '临时停车' ? '在缴费流水页面新增待支付记录后收款。' : '月租费用由合同缴费流水单独登记。']]);
    return result;
  }

  /** 展示 parking_record 所有主要字段及关联名称。@param {object} context 页面上下文。@param {object} row 原始记录。@returns {void} 打开详情。 */
  function parkingDetail(context, row) {
    const item = decorate(context, row);
    context.ui.showDetail('停车记录 #' + row.parking_record_id, [['记录 ID', row.parking_record_id], ['车辆 / 车主', item._vehicle + ' / ' + item._owner], ['车位', item._space], ['停车类型', row.parking_type], ['收费规则', item._rule], ['月租合同', item._contract], ['入场时间', row.entry_time], ['出场时间', row.exit_time || '尚未出场'], ['时长（分钟）', row.duration_minutes ?? '尚未结算'], ['应收金额', context.ui.money(row.amount_due)], ['状态', row.record_status], ['办理管理员', item._administrator], ['备注', row.remark || '—']]);
  }

  /** 挂载停车记录查询、详情、入场及出场页面。@param {HTMLElement} container 容器。@returns {Promise<void>} 挂载结果。 */
  async function parkingRecordsPage(container) {
    return mountList(container, { title: '停车记录', resource: 'parking_records', idKey: 'parking_record_id', statusKey: 'record_status', typeKey: 'parking_type', dateKey: 'entry_time', dateLabel: '入场日期', description: '对应 parking_record · 车辆入场、车位占用、出场计费与完整停车历史', createLabel: '车辆入场', searchPlaceholder: '车牌、车主、车位、记录 ID', statuses: ['在场', '已出场', '异常'], types: ['临时停车', '月租停车'], sorts: [{ value: 'entry_time:desc', label: '最新入场' }, { value: 'entry_time:asc', label: '最早入场' }, { value: 'amount_due:desc', label: '应收金额从高到低' }],
      notice: (context) => '当前共有 ' + context.data.parking_records.filter((row) => row.record_status === '在场').length + ' 辆在场车辆。历史记录保留审计轨迹，出场时自动释放车位。',
      columns: (context) => [{ label: '记录', key: 'parking_record_id' }, { label: '车牌 / 车主', render: (row) => context.ui.escape(row._vehicle) + '<br><small>' + context.ui.escape(row._owner) + '</small>' }, { label: '车位', key: '_space' }, { label: '类型', key: 'parking_type' }, { label: '入场时间', key: 'entry_time' }, { label: '出场时间', render: (row) => context.ui.escape(row.exit_time || '—') }, { label: '时长 / 应收', render: (row) => context.ui.escape(row.duration_minutes == null ? '待结算' : row.duration_minutes + ' 分钟') + '<br>' + context.ui.escape(context.ui.money(row.amount_due)) }, { label: '状态', render: (row) => context.ui.badge(row.record_status) }, { label: '操作', render: (row) => actionButton(context.ui, 'detail', row.parking_record_id, '详情') + (row.record_status === '在场' ? actionButton(context.ui, 'exit', row.parking_record_id, '出场') : '') }],
      handle: async function handleParkingAction(context, action, row) {
        if (action === 'create') return enterParking(context);
        if (!row) throw new Error('停车记录不存在，请刷新。');
        if (action === 'detail') return parkingDetail(context, row);
        if (action === 'exit') return exitParking(context, row);
      }
    });
  }
  // 停车记录业务功能注释结束

  // 月租合同业务功能注释开始
  /** 签订、编辑或续签合同；续签新建记录且开始日固定为原结束日下一天。@param {object} context 页面上下文。@param {object|null} row 原合同。@param {boolean} renewal 是否续签。@returns {Promise<object|null>} 保存结果或取消。 */
  async function contractForm(context, row, renewal) {
    const ui = context.ui;
    const editing = row && !renewal;
    const vehicles = context.data.vehicles.filter((vehicle) => renewal ? String(vehicle.vehicle_id) === String(row.vehicle_id) : vehicle.vehicle_status === '正常' || (row && String(vehicle.vehicle_id) === String(row.vehicle_id)));
    if (!vehicles.length) throw new Error('请先登记正常车辆。');
    const defaults = editing ? Object.assign({}, row) : { contract_no: businessNo('RC'), vehicle_id: row?.vehicle_id || '', start_date: renewal ? nextDay(row.end_date) : ui.today(), end_date: '', monthly_rent: row?.monthly_rent ?? '', deposit: row?.deposit ?? 0, contract_status: '生效', signed_at: ui.dateTimeNow(), handled_by_administrator_id: administratorField(context).options[0]?.value, remark: renewal ? '续签自 ' + row.contract_no : '' };
    defaults.signed_at = inputTime(defaults.signed_at);
    return ui.openForm({ title: renewal ? '续签月租合同' : editing ? '编辑月租合同' : '签订月租合同', description: renewal ? '保留原合同。新合同从 ' + defaults.start_date + ' 开始，请填写新的结束日期和编号。' : '同一车辆的生效合同不得重叠，月租金额必须大于 0。', submitText: renewal ? '创建续签合同' : '保存合同', values: defaults, fields: [
      { name: 'contract_no', label: '合同编号', type: 'text', required: true, maxLength: 30 },
      { name: 'vehicle_id', label: '车辆', type: 'select', required: true, readOnly: Boolean(renewal), options: vehicles.map((vehicle) => ({ value: vehicle.vehicle_id, label: vehicle.license_plate + ' · ' + linked(context.data.vehicle_owners, 'owner_id', vehicle.owner_id).name })) },
      { name: 'start_date', label: '开始日期', type: 'date', required: true, readOnly: Boolean(renewal) }, { name: 'end_date', label: '结束日期', type: 'date', required: true },
      { name: 'monthly_rent', label: '月租金额（元）', type: 'number', required: true, min: 0.01, step: 0.01 }, { name: 'deposit', label: '押金（元）', type: 'number', required: true, min: 0, step: 0.01 },
      { name: 'contract_status', label: '合同状态', type: 'select', required: true, options: enumOptions(['生效', '到期', '终止']) }, { name: 'signed_at', label: '签订时间', type: 'datetime-local' }, administratorField(context), remarkField()
    ], onSubmit: async function submitRentalContract(values) {
      const payload = Object.assign({}, values, { vehicle_id: renewal ? Number(row.vehicle_id) : Number(values.vehicle_id), start_date: renewal ? nextDay(row.end_date) : values.start_date, monthly_rent: Number(values.monthly_rent), deposit: Number(values.deposit), signed_at: sqlTime(values.signed_at), handled_by_administrator_id: Number(values.handled_by_administrator_id), remark: values.remark || null });
      if (payload.start_date > payload.end_date) throw new Error('结束日期不能早于开始日期。');
      if (!(payload.monthly_rent > 0) || payload.deposit < 0) throw new Error('月租金额须大于 0，押金不能为负数。');
      const overlap = context.data.rental_contracts.some((other) => (!editing || other.rental_contract_id !== row.rental_contract_id) && String(other.vehicle_id) === String(payload.vehicle_id) && other.contract_status === '生效' && payload.contract_status === '生效' && payload.start_date <= other.end_date && payload.end_date >= other.start_date);
      if (overlap) throw new Error('同一车辆的生效合同日期不能重叠。');
      const result = editing ? await global.parkingService.update('rental_contracts', row.rental_contract_id, payload) : await global.parkingService.create('rental_contracts', payload);
      ui.notify(renewal ? '续签完成，原合同已保留。' : '合同已保存。');
      return result;
    } });
  }

  /** 展示月租合同字段、车主和已支付金额汇总。@param {object} context 页面上下文。@param {object} row 合同。@returns {void} 打开详情。 */
  function contractDetail(context, row) {
    const item = decorate(context, row);
    const paid = context.data.payment_records.filter((payment) => payment.rental_contract_id === row.rental_contract_id && payment.payment_status === '已支付').reduce((sum, payment) => sum + Number(payment.amount_paid), 0);
    context.ui.showDetail('月租合同详情', [['合同 ID', row.rental_contract_id], ['合同编号', row.contract_no], ['车辆', item._vehicle], ['车主 / 联系电话', item._owner + ' / ' + item._phone], ['起止日期', row.start_date + ' 至 ' + row.end_date], ['月租金额', context.ui.money(row.monthly_rent)], ['押金', context.ui.money(row.deposit)], ['已支付金额（不含退款）', context.ui.money(paid)], ['合同状态', row.contract_status], ['签订时间', row.signed_at || '—'], ['办理管理员', item._administrator], ['备注', row.remark || '—']]);
  }

  /** 挂载合同列表、签订、编辑、续签和终止功能。@param {HTMLElement} container 容器。@returns {Promise<void>} 挂载结果。 */
  async function contractsPage(container) {
    return mountList(container, { title: '月租合同', resource: 'rental_contracts', idKey: 'rental_contract_id', statusKey: 'contract_status', dateKey: 'end_date', dateLabel: '结束日期', description: '对应 rental_contract · 月租签约、续签、终止与到期提醒', createLabel: '签订合同', searchPlaceholder: '合同号、车牌、车主、联系电话', statuses: ['生效', '到期', '终止'], sorts: [{ value: 'end_date:asc', label: '结束日期从近到远' }, { value: 'start_date:desc', label: '最新开始' }, { value: 'monthly_rent:desc', label: '月租金额从高到低' }],
      notice: (context) => '未来 30 天内到期的生效合同：' + context.data.rental_contracts.filter((row) => { const days = (new Date(row.end_date + 'T00:00:00') - new Date(context.ui.today() + 'T00:00:00')) / 86400000; return row.contract_status === '生效' && days >= 0 && days <= 30; }).length + ' 份。续签创建独立新合同；已过日期的合同仍保留原始状态，可在筛选中查出。',
      columns: (context) => [{ label: '合同编号', key: 'contract_no' }, { label: '车辆 / 车主', render: (row) => context.ui.escape(row._vehicle) + '<br><small>' + context.ui.escape(row._owner) + '</small>' }, { label: '起止日期', render: (row) => context.ui.escape(row.start_date) + '<br>' + context.ui.escape(row.end_date) }, { label: '月租 / 押金', render: (row) => context.ui.escape(context.ui.money(row.monthly_rent)) + '<br><small>押金 ' + context.ui.escape(context.ui.money(row.deposit)) + '</small>' }, { label: '状态', render: (row) => context.ui.badge(row.contract_status) }, { label: '办理人', key: '_administrator' }, { label: '操作', render: (row) => actionButton(context.ui, 'detail', row.rental_contract_id, '详情') + actionButton(context.ui, 'edit', row.rental_contract_id, '编辑') + (row.contract_status !== '终止' ? actionButton(context.ui, 'renew', row.rental_contract_id, '续签') + actionButton(context.ui, 'terminate', row.rental_contract_id, '终止', true) : '') }],
      handle: async function handleContractAction(context, action, row) {
        if (action === 'create') return contractForm(context, null, false);
        if (!row) throw new Error('合同不存在，请刷新。');
        if (action === 'detail') return contractDetail(context, row);
        if (action === 'edit') return contractForm(context, row, false);
        if (action === 'renew') return contractForm(context, row, true);
        if (action === 'terminate' && global.confirm('确认终止合同“' + row.contract_no + '”？历史合同和缴费记录将保留。')) {
          const result = await global.parkingService.update('rental_contracts', row.rental_contract_id, { contract_status: '终止' });
          context.ui.notify('合同已终止。');
          return result;
        }
      }
    });
  }
  // 月租合同业务功能注释结束

  // 缴费流水业务功能注释开始
  /** 创建待支付流水，依据类型仅关联一条停车记录或合同。@param {object} context 页面上下文。@returns {Promise<object|null>} 创建结果或取消。 */
  async function paymentForm(context) {
    const ui = context.ui;
    const records = context.data.parking_records.filter((row) => row.parking_type === '临时停车' && row.record_status === '已出场');
    const contracts = context.data.rental_contracts;
    if (!records.length && !contracts.length) throw new Error('暂无可关联业务，请先办理临停出场或签订月租合同。');
    const paymentTypes = [...(records.length ? ['临停停车费'] : []), ...(contracts.length ? ['月租费'] : [])];
    return ui.openForm({ title: '新增待支付流水', description: '临停应收由出场记录确定；月租应收可按实际缴费周期填写。保存后再办理收款。', submitText: '生成待支付流水', values: { payment_no: businessNo('PAY'), payment_type: records.length ? '临停停车费' : '月租费', amount_due: '', payment_method: '微信', handled_by_administrator_id: administratorField(context).options[0]?.value }, fields: [
      { name: 'payment_no', label: '缴费流水号', type: 'text', required: true, maxLength: 40 }, { name: 'payment_type', label: '缴费类型', type: 'select', required: true, options: enumOptions(paymentTypes) },
      { name: 'parking_record_id', label: '已出场临停记录', type: 'select', required: true, showWhen: (values) => values.payment_type === '临停停车费', options: records.map((row) => ({ value: row.parking_record_id, label: '#' + row.parking_record_id + ' · ' + decorate(context, row)._vehicle + ' · ' + row.exit_time + ' · ' + ui.money(row.amount_due) })) },
      { name: 'rental_contract_id', label: '月租合同', type: 'select', required: true, showWhen: (values) => values.payment_type === '月租费', options: contracts.map((row) => ({ value: row.rental_contract_id, label: row.contract_no + ' · ' + decorate(context, row)._vehicle + ' · ' + row.contract_status })) },
      { name: 'amount_due', label: '月租应收金额（元）', type: 'number', required: true, min: 0.01, step: 0.01, showWhen: (values) => values.payment_type === '月租费', help: '请按实际缴费期数填入应收合计。临停无需填写，直接采用停车记录金额。' },
      { name: 'payment_method', label: '预计支付方式', type: 'select', required: true, options: enumOptions(methods) }, administratorField(context), remarkField()
    ], onSubmit: async function submitPendingPayment(values) {
      const temporary = values.payment_type === '临停停车费';
      const parking = temporary ? linked(records, 'parking_record_id', values.parking_record_id) : null;
      if (temporary && !parking.parking_record_id) throw new Error('请选择已出场的临停记录。');
      if (!temporary && !values.rental_contract_id) throw new Error('请选择月租合同。');
      const payload = Object.assign({}, values, { parking_record_id: temporary ? Number(values.parking_record_id) : null, rental_contract_id: temporary ? null : Number(values.rental_contract_id), amount_due: temporary ? Number(parking.amount_due) : Number(values.amount_due), amount_paid: 0, paid_at: null, payment_status: '待支付', handled_by_administrator_id: Number(values.handled_by_administrator_id), remark: values.remark || null });
      const result = await global.parkingService.createPaymentRecord(payload);
      ui.notify('待支付流水已生成，请核对后收款。');
      return result;
    } });
  }

  /** 将待支付流水收款，保持金额、时间、状态同步。@param {object} context 页面上下文。@param {object} row 待支付记录。@returns {Promise<object|null>} 收款结果或取消。 */
  async function collectPayment(context, row) {
    if (row.payment_status !== '待支付') throw new Error('只有待支付流水可以收款。');
    return context.ui.openForm({ title: '登记收款', description: row.payment_no + '，应收 ' + context.ui.money(row.amount_due) + '。当前为前端模拟登记，不会发起真实支付。', submitText: '确认已收款', values: { amount_paid: row.amount_due, payment_method: row.payment_method, paid_at: inputTime(context.ui.dateTimeNow()), handled_by_administrator_id: row.handled_by_administrator_id }, fields: [
      { name: 'amount_paid', label: '实收金额（元）', type: 'number', required: true, min: 0.01, step: 0.01 }, { name: 'payment_method', label: '支付方式', type: 'select', required: true, options: enumOptions(methods) }, { name: 'paid_at', label: '支付时间', type: 'datetime-local', required: true }, administratorField(context)
    ], onSubmit: async function submitCollection(values) {
      if (!(Number(values.amount_paid) > 0)) throw new Error('实收金额必须大于 0。');
      const result = await global.parkingService.payPaymentRecord(row.payment_record_id, { amount_paid: Number(values.amount_paid), payment_method: values.payment_method, paid_at: sqlTime(values.paid_at), handled_by_administrator_id: Number(values.handled_by_administrator_id) });
      context.ui.notify('收款登记完成。');
      return result;
    } });
  }

  /** 退款前记录原因并二次确认，保留原实收和支付时间。@param {object} context 页面上下文。@param {object} row 已支付流水。@returns {Promise<object|null>} 退款结果或取消。 */
  async function refundPayment(context, row) {
    if (row.payment_status !== '已支付') throw new Error('只有已支付流水可以退款。');
    return context.ui.openForm({ title: '登记全额退款', description: '流水 ' + row.payment_no + '，退款金额 ' + context.ui.money(row.amount_paid) + '。保留原金额和支付时间用于核对。', submitText: '确认退款', values: { remark: row.remark || '' }, fields: [{ name: 'remark', label: '退款原因', type: 'textarea', required: true, maxLength: 200 }], onSubmit: async function submitRefund(values) {
      if (!String(values.remark).trim()) throw new Error('请填写退款原因。');
      if (!global.confirm('确认将 ' + row.payment_no + ' 标记为已退款？')) throw new Error('已取消退款，可继续修改或关闭表单。');
      const result = await global.parkingService.refundPaymentRecord(row.payment_record_id, { remark: values.remark.trim() });
      context.ui.notify('退款已登记，历史流水保留。');
      return result;
    } });
  }

  /** 展示支付流水所有主要字段及业务关联。@param {object} context 页面上下文。@param {object} row 支付流水。@returns {void} 打开详情。 */
  function paymentDetail(context, row) {
    const item = decorate(context, row);
    context.ui.showDetail('缴费流水详情', [['流水 ID', row.payment_record_id], ['流水编号', row.payment_no], ['缴费类型', row.payment_type], ['关联业务', item._association], ['车辆 / 车主', item._vehicle + ' / ' + item._owner], ['停车记录 ID', row.parking_record_id ?? '—'], ['月租合同 ID', row.rental_contract_id ?? '—'], ['应收金额', context.ui.money(row.amount_due)], ['实收金额', context.ui.money(row.amount_paid)], ['支付方式', row.payment_method], ['支付状态', row.payment_status], ['支付时间', row.paid_at || '尚未支付'], ['办理管理员', item._administrator], ['备注 / 退款原因', row.remark || '—']]);
  }

  /** 挂载缴费查询、新增待支付、收款和退款页面。@param {HTMLElement} container 容器。@returns {Promise<void>} 挂载结果。 */
  async function paymentsPage(container) {
    return mountList(container, { title: '缴费流水', resource: 'payment_records', idKey: 'payment_record_id', statusKey: 'payment_status', typeKey: 'payment_type', dateKey: 'paid_at', dateLabel: '支付日期', description: '对应 payment_record · 临停和月租应收、模拟收款与退款历史', createLabel: '新增待支付', searchPlaceholder: '流水号、车牌、车主、合同号', statuses: ['待支付', '已支付', '已退款'], types: ['临停停车费', '月租费'], sorts: [{ value: 'payment_record_id:desc', label: '最新流水' }, { value: 'paid_at:desc', label: '最新支付' }, { value: 'amount_paid:desc', label: '实收金额从高到低' }],
      notice: (context) => '待支付 ' + context.data.payment_records.filter((row) => row.payment_status === '待支付').length + ' 笔。支付日期筛选会排除尚无支付时间的待支付流水；退款流水保留原实收和支付时间，收入统计只计已支付。',
      columns: (context) => [{ label: '流水 / 关联', render: (row) => context.ui.escape(row.payment_no) + '<br><small>' + context.ui.escape(row._association) + '</small>' }, { label: '类型', key: 'payment_type' }, { label: '车辆', key: '_vehicle' }, { label: '应收 / 实收', render: (row) => context.ui.escape(context.ui.money(row.amount_due)) + '<br><strong>' + context.ui.escape(context.ui.money(row.amount_paid)) + '</strong>' }, { label: '方式', key: 'payment_method' }, { label: '支付时间', render: (row) => context.ui.escape(row.paid_at || '尚未支付') }, { label: '状态', render: (row) => context.ui.badge(row.payment_status) }, { label: '办理人', key: '_administrator' }, { label: '操作', render: (row) => actionButton(context.ui, 'detail', row.payment_record_id, '详情') + (row.payment_status === '待支付' ? actionButton(context.ui, 'collect', row.payment_record_id, '收款') : '') + (row.payment_status === '已支付' ? actionButton(context.ui, 'refund', row.payment_record_id, '退款', true) : '') }],
      handle: async function handlePaymentAction(context, action, row) {
        if (action === 'create') return paymentForm(context);
        if (!row) throw new Error('缴费流水不存在，请刷新。');
        if (action === 'detail') return paymentDetail(context, row);
        if (action === 'collect') return collectPayment(context, row);
        if (action === 'refund') return refundPayment(context, row);
      }
    });
  }
  // 缴费流水业务功能注释结束

  global.ParkingPages = global.ParkingPages || {};
  global.ParkingPages['parking-records'] = parkingRecordsPage;
  global.ParkingPages.contracts = contractsPage;
  global.ParkingPages.payments = paymentsPage;
})(window);
// 停车运营页面功能注释结束
