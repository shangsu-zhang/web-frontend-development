(function (global) {
  'use strict';

  // 基础资料页面配置功能注释开始
  /** 五类页面与 SQL 实体保持一一对应；页面只通过 parkingService 读取和保存记录。 */
  const definitions = {
    owners: {
      title: '车主档案', singular: '车主', table: 'vehicle_owner', resource: 'vehicle_owners', id: 'owner_id', identity: 'name',
      description: '维护实名资料、联系方式和车主状态，关联车辆继续保留历史信息。',
      status: 'owner_status', statuses: ['正常', '停用'],
      columns: ['name', 'phone', 'id_number', 'address', 'owner_status', 'created_at'],
      fields: [
        { name: 'name', label: '姓名', required: true, maxLength: 50 },
        { name: 'id_number', label: '身份证号', required: true, maxLength: 18, pattern: '[0-9]{17}[0-9Xx]', help: '18 位身份证号，末位可为 X。' },
        { name: 'phone', label: '联系电话', required: true, maxLength: 20 },
        { name: 'address', label: '联系地址', type: 'textarea', maxLength: 200 },
        { name: 'owner_status', label: '车主状态', type: 'select', options: ['正常', '停用'], required: true },
        { name: 'created_at', label: '登记时间', type: 'datetime-local', readOnly: true }
      ]
    },
    vehicles: {
      title: '车辆档案', singular: '车辆', table: 'vehicle', resource: 'vehicles', id: 'vehicle_id', identity: 'license_plate',
      description: '维护车辆和车主的关联信息；停用操作不会删除停车或月租历史。',
      status: 'vehicle_status', statuses: ['正常', '停用'], type: 'vehicle_type', types: ['小型车', '大型车', '新能源'],
      columns: ['license_plate', 'vehicle_type', 'vehicle_color', 'owner_id', 'vehicle_status', 'registered_at'],
      fields: [
        { name: 'license_plate', label: '车牌号', required: true, maxLength: 12 },
        { name: 'vehicle_type', label: '车辆类型', type: 'select', options: ['小型车', '大型车', '新能源'], required: true },
        { name: 'vehicle_color', label: '车辆颜色', maxLength: 20 },
        { name: 'owner_id', label: '所属车主', type: 'select', required: true, lookup: 'owners' },
        { name: 'vehicle_status', label: '车辆状态', type: 'select', options: ['正常', '停用'], required: true },
        { name: 'registered_at', label: '登记时间', type: 'datetime-local', readOnly: true }
      ]
    },
    spaces: {
      title: '车位管理', singular: '车位', table: 'parking_space', resource: 'parking_spaces', id: 'parking_space_id', identity: 'space_code',
      description: '按区域和类型管理车位；占用状态由车辆入场、出场自动维护。',
      status: 'space_status', statuses: ['可用', '占用', '停用'], type: 'space_type', types: ['标准', '无障碍', '充电'],
      columns: ['space_code', 'area', 'space_type', 'space_status', 'location_note'],
      fields: [
        { name: 'space_code', label: '车位编号', required: true, maxLength: 20 },
        { name: 'area', label: '所属区域', required: true, maxLength: 30 },
        { name: 'space_type', label: '车位类型', type: 'select', options: ['标准', '无障碍', '充电'], required: true },
        { name: 'space_status', label: '车位状态', type: 'select', options: ['可用', '停用'], required: true, help: '占用状态由入场流程产生，不能手动设置。' },
        { name: 'location_note', label: '位置说明', type: 'textarea', maxLength: 100 }
      ]
    },
    administrators: {
      title: '管理员', singular: '管理员', table: 'administrator', resource: 'administrators', id: 'administrator_id', identity: 'name',
      description: '维护工号、登录账号、岗位角色和启停状态，便于追溯业务经办人员。',
      status: 'account_status', statuses: ['启用', '停用'], type: 'role', types: ['收费员', '主管', '系统管理员'],
      columns: ['employee_no', 'name', 'phone', 'login_account', 'role', 'account_status'],
      fields: [
        { name: 'employee_no', label: '员工编号', required: true, maxLength: 20 },
        { name: 'name', label: '姓名', required: true, maxLength: 50 },
        { name: 'phone', label: '联系电话', required: true, maxLength: 20 },
        { name: 'login_account', label: '登录账号', required: true, maxLength: 30 },
        { name: 'role', label: '岗位角色', type: 'select', options: ['收费员', '主管', '系统管理员'], required: true },
        { name: 'account_status', label: '账号状态', type: 'select', options: ['启用', '停用'], required: true },
        { name: 'created_at', label: '创建时间', type: 'datetime-local', readOnly: true }
      ]
    },
    'charge-rules': {
      title: '收费规则', singular: '收费规则', table: 'charge_rule', resource: 'charge_rules', id: 'charge_rule_id', identity: 'rule_name',
      description: '设置临停小时单价、最低收费、每日封顶和有效日期。金额单位为元。',
      status: 'rule_status', statuses: ['启用', '停用'],
      columns: ['rule_name', 'hourly_rate', 'minimum_charge', 'daily_cap', 'effective_date', 'expiry_date', 'rule_status'],
      fields: [
        { name: 'rule_name', label: '规则名称', required: true, maxLength: 50 },
        { name: 'hourly_rate', label: '每小时单价', type: 'number', required: true, step: '0.01', min: '0.01', max: '99999999.99', money: true },
        { name: 'minimum_charge', label: '最低收费', type: 'number', required: true, step: '0.01', min: '0', max: '99999999.99', money: true },
        { name: 'daily_cap', label: '每日封顶', type: 'number', step: '0.01', min: '0.01', max: '99999999.99', money: true, help: '留空表示不设置每日封顶金额。' },
        { name: 'effective_date', label: '生效日期', type: 'date', required: true },
        { name: 'expiry_date', label: '失效日期', type: 'date', help: '留空表示持续有效。' },
        { name: 'rule_status', label: '规则状态', type: 'select', options: ['启用', '停用'], required: true },
        { name: 'created_by_administrator_id', label: '创建管理员', type: 'select', required: true, lookup: 'administrators' }
      ]
    }
  };
  let mountSequence = 0;
  // 基础资料页面配置功能注释结束

  // 本地日期格式化功能注释开始
  /** @returns {string} 不经过 UTC 转换的本地 DATETIME 文本，供新建记录保留登记时间。 */
  function nowText() {
    const value = new Date();
    const pad = function (part) { return String(part).padStart(2, '0'); };
    return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate()) + ' ' + pad(value.getHours()) + ':' + pad(value.getMinutes()) + ':' + pad(value.getSeconds());
  }
  // 本地日期格式化功能注释结束

  // 选项输出功能注释开始
  /** @param {string[]} values 枚举文本。 @returns {object[]} 公共表单组件使用的选项。 */
  function optionsOf(values) {
    return values.map(function (value) { return { value: value, label: value }; });
  }
  // 选项输出功能注释结束

  // 基础资料页面挂载功能注释开始
  /**
   * 挂载一个基础资料页。状态与事件均限制在当前容器，重复进入路由不会积累事件监听。
   * @param {HTMLElement} container 由应用路由提供的页面容器。
   * @param {string} pageKey 五类页面之一。
   * @returns {Promise<void>} 首次查询完成后结束；错误直接显示在页面并允许重试。
   */
  async function mountCatalog(container, pageKey) {
    const definition = definitions[pageKey];
    const ui = global.ParkingUI;
    const service = global.parkingService;
    const escape = ui.escape;
    const token = String(++mountSequence);
    const state = { q: '', filters: {}, sortBy: definition.id, sortOrder: 'desc', page: 1, pageSize: 10, total: 0, rows: [], lookups: {}, request: 0, loading: false };
    container.dataset.catalogMount = token;

    // 当前挂载检查功能注释开始
    /** 防止异步请求结束时覆盖已切换到其他路由的容器。 @returns {boolean} 当前页面是否仍有效。 */
    function isCurrent() {
      return container.dataset.catalogMount === token;
    }
    // 当前挂载检查功能注释结束

    // 关联资料加载功能注释开始
    /** @returns {Promise<void>} 读取外键选项；页面不直接访问 mock-data。 */
    async function loadLookups() {
      if (pageKey === 'vehicles') state.lookups.owners = await ui.all('vehicle_owners');
      if (pageKey === 'charge-rules') state.lookups.administrators = await ui.all('administrators');
    }
    // 关联资料加载功能注释结束

    // 关联字段展示功能注释开始
    /** @param {object} field SQL 字段配置。 @param {*} value 字段原始值。 @returns {string} 可安全交给公共详情组件的纯文本。 */
    function displayValue(field, value) {
      if (value === null || value === undefined || value === '') return '—';
      if (field.money) return ui.money(value);
      if (field.lookup) {
        const lookupId = field.lookup === 'owners' ? 'owner_id' : 'administrator_id';
        const found = (state.lookups[field.lookup] || []).find(function (row) { return String(row[lookupId]) === String(value); });
        return found ? found.name + '（' + (found.phone || found.employee_no || value) + '）' : '关联记录 #' + value;
      }
      return String(value);
    }
    // 关联字段展示功能注释结束

    // 列表操作按钮功能注释开始
    /** @param {object} row 当前记录。 @returns {string} 仅含转义后主键的操作按钮 HTML。 */
    function actionButtons(row) {
      const id = escape(row[definition.id]);
      const occupied = pageKey === 'spaces' && row.space_status === '占用';
      const disabled = row[definition.status] === '停用';
      return '<div class="table-actions"><button class="button button-secondary button-small" type="button" data-catalog-action="detail" data-id="' + id + '">详情</button>' +
        '<button class="button button-secondary button-small" type="button" data-catalog-action="edit" data-id="' + id + '">编辑</button>' +
        '<button class="button button-secondary button-small" type="button" data-catalog-action="status" data-id="' + id + '"' + (occupied ? ' disabled title="请先办理车辆出场"' : '') + '>' + (disabled ? '启用' : '停用') + '</button>' +
        '<button class="button button-danger button-small" type="button" data-catalog-action="delete" data-id="' + id + '">删除</button></div>';
    }
    // 列表操作按钮功能注释结束

    // 数据表输出功能注释开始
    /** @returns {string} 当前页数据表或空状态；普通单元格由公共 table 函数转义。 */
    function renderTable() {
      if (!state.rows.length) return '<div class="empty-state"><h3>暂无符合条件的' + escape(definition.singular) + '</h3><p>调整筛选条件，或新增一条资料。</p></div>';
      const columns = definition.columns.map(function (key) {
        const field = definition.fields.find(function (item) { return item.name === key; });
        const column = { key: key, label: field ? field.label : key };
        if (key === definition.status) column.render = function (row) { return ui.badge(row[key]); };
        else if (field && (field.money || field.lookup)) column.render = function (row) { return escape(displayValue(field, row[key])); };
        return column;
      });
      columns.push({ label: '操作', key: '__actions', render: actionButtons });
      return ui.table(columns, state.rows);
    }
    // 数据表输出功能注释结束

    // 工具栏下拉框功能注释开始
    /** @param {string} name 字段名。 @param {string} label 标题。 @param {string[]} values 枚举项。 @returns {string} 安全下拉框 HTML。 */
    function filterControl(name, label, values) {
      return '<label class="field"><span>' + escape(label) + '</span><select name="' + escape(name) + '"><option value="">全部' + escape(label) + '</option>' + values.map(function (value) { return '<option value="' + escape(value) + '">' + escape(value) + '</option>'; }).join('') + '</select></label>';
    }
    // 工具栏下拉框功能注释结束

    // 页面主体输出功能注释开始
    /** 建立固定工具栏和可单独刷新的列表区域。 @returns {void} */
    function renderShell() {
      const sortFields = [{ name: definition.id, label: '登记顺序' }].concat(definition.fields.filter(function (field) { return definition.columns.includes(field.name) && field.type !== 'textarea' && !field.lookup; }));
      container.innerHTML = '<section class="panel"><div class="module-heading"><div><p class="eyebrow">' + escape(definition.table) + '</p><h1>' + escape(definition.title) + '</h1><p class="page-description">' + escape(definition.description) + '</p></div><button class="button button-primary" type="button" data-catalog-action="create">新增' + escape(definition.singular) + '</button></div>' +
        '<form class="toolbar" data-catalog-search><label class="field"><span>关键字</span><input type="search" name="q" placeholder="搜索名称、编号或联系方式" maxlength="200"></label>' +
        filterControl(definition.status, '状态', definition.statuses) + (definition.type ? filterControl(definition.type, '类型', definition.types) : '') +
        '<label class="field"><span>排序</span><select name="sort">' + sortFields.map(function (field) { return '<option value="' + escape(field.name) + '|desc">' + escape(field.label) + ' ↓</option><option value="' + escape(field.name) + '|asc">' + escape(field.label) + ' ↑</option>'; }).join('') + '</select></label>' +
        '<button class="button button-secondary" type="submit">查询</button><button class="button button-secondary" type="button" data-catalog-action="reset">重置</button></form><div data-catalog-results aria-live="polite"></div></section>';
    }
    // 页面主体输出功能注释结束

    // 分页数据加载功能注释开始
    /**
     * 查询当前条件；请求序号避免快速查询的旧结果覆盖新结果。
     * @returns {Promise<void>} 成功展示结果，失败保留可重试的错误区。
     */
    async function load() {
      const request = ++state.request;
      const results = container.querySelector('[data-catalog-results]');
      if (!isCurrent() || !results) return;
      state.loading = true;
      results.innerHTML = '<div class="empty-state" role="status">正在加载' + escape(definition.title) + '…</div>';
      try {
        await loadLookups();
        const response = await service.list(definition.resource, { q: state.q, filters: state.filters, sortBy: state.sortBy, sortOrder: state.sortOrder, page: state.page, pageSize: state.pageSize });
        if (!isCurrent() || request !== state.request) return;
        if (!response || !Array.isArray(response.items)) throw new Error('列表返回格式异常，请稍后重试');
        state.total = Number(response.total) || 0;
        const pageCount = Math.max(1, Math.ceil(state.total / state.pageSize));
        if (state.page > pageCount) { state.page = pageCount; return load(); }
        state.rows = response.items;
        results.innerHTML = renderTable() + '<div class="pager"><span>共 ' + state.total + ' 条 · 第 ' + state.page + ' / ' + pageCount + ' 页</span><div><button class="button button-secondary button-small" type="button" data-catalog-action="previous"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button> <button class="button button-secondary button-small" type="button" data-catalog-action="next"' + (state.page >= pageCount ? ' disabled' : '') + '>下一页</button></div></div>';
      } catch (error) {
        if (isCurrent() && request === state.request) results.innerHTML = '<div class="empty-state" role="alert"><h3>资料加载失败</h3><p>' + escape(error.message || '暂时无法读取数据') + '</p><button class="button button-secondary" type="button" data-catalog-action="retry">重新加载</button></div>';
      } finally {
        if (request === state.request) state.loading = false;
      }
    }
    // 分页数据加载功能注释结束

    // 表单字段准备功能注释开始
    /** @param {object|null} row 编辑记录或 null。 @returns {object[]} 根据外键与当前车位占用状态生成的表单字段。 */
    function formFields(row) {
      return definition.fields.filter(function (field) { return !(pageKey === 'spaces' && row && row.space_status === '占用' && field.name === 'space_status'); }).map(function (original) {
        const field = Object.assign({ type: 'text' }, original);
        if (field.options) field.options = optionsOf(field.options);
        if (field.lookup) {
          const idField = field.lookup === 'owners' ? 'owner_id' : 'administrator_id';
          const statusField = field.lookup === 'owners' ? 'owner_status' : 'account_status';
          const activeStatus = field.lookup === 'owners' ? '正常' : '启用';
          field.options = (state.lookups[field.lookup] || []).filter(function (item) { return item[statusField] === activeStatus || (row && String(row[field.name]) === String(item[idField])); }).map(function (item) { return { value: item[idField], label: item.name + ' · ' + (item.phone || item.employee_no) }; });
          field.options.unshift({ value: '', label: '请选择' + field.label });
        }
        return field;
      });
    }
    // 表单字段准备功能注释结束

    // 表单载荷整理与校验功能注释开始
    /** @param {object} input 公共表单读取的内容。 @param {object|null} row 编辑原记录。 @returns {object} 与 SQL 字段类型一致的保存载荷。 */
    function normalizePayload(input, row) {
      const payload = {};
      definition.fields.forEach(function (field) {
        if (field.name === 'space_status' && row && row.space_status === '占用') { payload.space_status = '占用'; return; }
        let value = input[field.name];
        if (field.readOnly && row) value = row[field.name];
        if (typeof value === 'string') value = value.trim();
        if (field.required && (value === '' || value === null || value === undefined)) throw new Error('请填写' + field.label);
        if (!field.required && (value === '' || value === undefined)) value = null;
        if (field.maxLength && value && String(value).length > field.maxLength) throw new Error(field.label + '不能超过 ' + field.maxLength + ' 个字符');
        if (field.lookup && value !== null) { value = Number(value); if (!Number.isSafeInteger(value) || value <= 0) throw new Error('请选择有效的' + field.label); }
        if (field.type === 'number' && value !== null) {
          value = Number(value);
          if (!Number.isFinite(value) || value < Number(field.min || 0) || value > Number(field.max || Infinity)) throw new Error(field.label + '超出允许范围');
          if (field.money && Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) throw new Error(field.label + '最多保留两位小数');
        }
        if (field.type === 'datetime-local' && value) value = String(value).replace('T', ' ') + (String(value).length === 16 ? ':00' : '');
        payload[field.name] = value;
      });
      if (payload.id_number) {
        payload.id_number = payload.id_number.toUpperCase();
        if (!/^\d{17}[\dX]$/.test(payload.id_number)) throw new Error('身份证号应为 18 位，末位可为 X');
      }
      if (payload.phone && !/^\+?[0-9][0-9 -]{5,19}$/.test(payload.phone)) throw new Error('联系电话应为有效数字号码，可包含区号和短横线');
      if (payload.license_plate) payload.license_plate = payload.license_plate.toUpperCase();
      if (payload.expiry_date && payload.expiry_date < payload.effective_date) throw new Error('失效日期不能早于生效日期');
      return payload;
    }
    // 表单载荷整理与校验功能注释结束

    // 新增编辑对话框功能注释开始
    /** @param {string|undefined} id 编辑记录 ID；省略表示新增。 @returns {Promise<void>} 打开表单并在成功后刷新列表。 */
    async function openEditor(id) {
      await loadLookups();
      const row = id ? await service.get(definition.resource, id) : null;
      if (id && !row) throw new Error('资料已不存在，请刷新列表');
      const values = row ? Object.assign({}, row) : {};
      definition.fields.forEach(function (field) {
        if (field.options && values[field.name] === undefined) values[field.name] = field.options[0];
        if (field.type === 'datetime-local') values[field.name] = String(values[field.name] || nowText()).replace(' ', 'T');
      });
      if (!row && pageKey === 'charge-rules') { values.minimum_charge = 0; values.effective_date = nowText().slice(0, 10); }
      await ui.openForm({
        title: (row ? '编辑' : '新增') + definition.singular,
        description: pageKey === 'spaces' && row && row.space_status === '占用' ? '当前车位正在使用，状态由出场流程释放。可编辑编号、区域与位置资料。' : definition.description,
        fields: formFields(row), values: values, submitText: '保存资料',
        onSubmit: async function (input) {
          const payload = normalizePayload(input, row);
          if (row) await service.update(definition.resource, row[definition.id], payload);
          else await service.create(definition.resource, payload);
          ui.notify(definition.singular + '资料已保存');
          await load();
        }
      });
    }
    // 新增编辑对话框功能注释结束

    // 资料详情功能注释开始
    /** @param {string} id 记录主键。 @returns {Promise<void>} 展示所有数据库字段与外键中文名称。 */
    async function openDetail(id) {
      const row = await service.get(definition.resource, id);
      if (!row) throw new Error('资料已不存在，请刷新列表');
      const rows = [['记录 ID (' + definition.id + ')', row[definition.id]]].concat(definition.fields.map(function (field) { return [field.label + ' (' + field.name + ')', displayValue(field, row[field.name])]; }));
      ui.showDetail(definition.singular + '详情', rows);
    }
    // 资料详情功能注释结束

    // 启停状态切换功能注释开始
    /** @param {string} id 记录主键。 @returns {Promise<void>} 由业务服务校验并保存新的启停状态。 */
    async function toggleStatus(id) {
      const row = await service.get(definition.resource, id);
      if (!row) throw new Error('资料已不存在，请刷新列表');
      if (pageKey === 'spaces' && row.space_status === '占用') throw new Error('占用车位请先办理车辆出场，不能手动修改占用状态');
      const next = row[definition.status] === '停用' ? definition.statuses[0] : '停用';
      if (!global.confirm('确认将“' + row[definition.identity] + '”设为' + next + '？')) return;
      const payload = {}; payload[definition.status] = next;
      await service.update(definition.resource, id, payload);
      ui.notify('状态已更新为' + next);
      await load();
    }
    // 启停状态切换功能注释结束

    // 资料删除功能注释开始
    /** @param {string} id 记录主键。 @returns {Promise<void>} 确认后请求删除，被引用记录由服务层阻止。 */
    async function deleteRow(id) {
      const row = await service.get(definition.resource, id);
      if (!row) throw new Error('资料已不存在，请刷新列表');
      if (!global.confirm('确认删除' + definition.singular + '“' + row[definition.identity] + '”？被历史业务引用的资料不能删除，可改用停用。')) return;
      await service.remove(definition.resource, id);
      ui.notify(definition.singular + '已删除');
      await load();
    }
    // 资料删除功能注释结束

    // 列表操作分发功能注释开始
    /** @param {MouseEvent} event 容器点击事件。 @returns {Promise<void>} 执行按钮对应的业务操作。 */
    async function handleClick(event) {
      const button = event.target.closest('[data-catalog-action]');
      if (!button || !container.contains(button) || button.disabled) return;
      const action = button.dataset.catalogAction;
      const id = button.dataset.id;
      if (action === 'create') return openEditor();
      if (action === 'edit') return openEditor(id);
      if (action === 'detail') return openDetail(id);
      if (action === 'status') return toggleStatus(id);
      if (action === 'delete') return deleteRow(id);
      if (action === 'previous') { state.page = Math.max(1, state.page - 1); return load(); }
      if (action === 'next') { state.page += 1; return load(); }
      if (action === 'retry') return load();
      if (action === 'reset') {
        container.querySelector('[data-catalog-search]').reset();
        state.q = ''; state.filters = {}; state.sortBy = definition.id; state.sortOrder = 'desc'; state.page = 1;
        return load();
      }
    }
    // 列表操作分发功能注释结束

    // 容器事件绑定功能注释开始
    /** 捕获异步操作错误，使用安全通知显示服务层校验结果。 */
    container.onclick = function (event) {
      handleClick(event).catch(function (error) { ui.notify(error.message || '操作失败，请重试'); });
    };
    /** 查询提交后回到第一页，保留关键字、字段过滤和所选排序。 */
    container.onsubmit = function (event) {
      if (!event.target.matches('[data-catalog-search]')) return;
      event.preventDefault();
      const data = new FormData(event.target);
      state.q = String(data.get('q') || '').trim();
      state.filters = {}; state.filters[definition.status] = data.get(definition.status) || '';
      if (definition.type) state.filters[definition.type] = data.get(definition.type) || '';
      const sort = String(data.get('sort') || definition.id + '|desc').split('|');
      state.sortBy = sort[0]; state.sortOrder = sort[1]; state.page = 1;
      load();
    };
    // 容器事件绑定功能注释结束

    renderShell();
    await load();
  }
  // 基础资料页面挂载功能注释结束

  // 基础资料路由注册功能注释开始
  /** 每个路由入口都创建独立页面状态；由主应用导航调用，保持全局服务边界稳定。 */
  global.ParkingPages = global.ParkingPages || {};
  Object.keys(definitions).forEach(function (pageKey) {
    global.ParkingPages[pageKey] = async function (container) { await mountCatalog(container, pageKey); };
  });
  // 基础资料路由注册功能注释结束
})(window);
