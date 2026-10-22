// 停车业务服务功能注释开始
/**
 * 安装停车业务服务，统一管理本地演示数据、存储和未来 Java REST 调用。
 * @param {Window} global 当前浏览器窗口；前置脚本依次提供配置、种子及 HTTP 工厂。
 * @returns {void} 通过 window.parkingService 暴露业务方法。
 */
(function initializeParkingService(global) {
  'use strict';

  const config = global.ParkingConfig;
  const api = global.ParkingApiClient.createApiService(config.apiBaseUrl, config.requestTimeoutMs);
  const maximumAmount = 99999999.99;
  const definitions = {
    administrators: { table: 'administrator', id: 'administrator_id', path: '/administrators' },
    vehicle_owners: { table: 'vehicle_owner', id: 'owner_id', path: '/vehicle-owners' },
    parking_spaces: { table: 'parking_space', id: 'parking_space_id', path: '/parking-spaces' },
    vehicles: { table: 'vehicle', id: 'vehicle_id', path: '/vehicles' },
    charge_rules: { table: 'charge_rule', id: 'charge_rule_id', path: '/charge-rules' },
    rental_contracts: { table: 'rental_contract', id: 'rental_contract_id', path: '/rental-contracts' },
    parking_records: { table: 'parking_record', id: 'parking_record_id', path: '/parking-records' },
    payment_records: { table: 'payment_record', id: 'payment_record_id', path: '/payment-records' }
  };
  const schemas = {
    administrators: {
      required: ['employee_no', 'name', 'phone', 'login_account', 'role', 'account_status', 'created_at'],
      text: { employee_no: 20, name: 50, phone: 20, login_account: 30 },
      enums: { role: ['收费员', '主管', '系统管理员'], account_status: ['启用', '停用'] },
      unique: ['employee_no', 'phone', 'login_account'], times: ['created_at'],
      defaults: { account_status: '启用' }, created: 'created_at'
    },
    vehicle_owners: {
      required: ['name', 'id_number', 'phone', 'owner_status', 'created_at'],
      text: { name: 50, id_number: 18, phone: 20, address: 200 },
      enums: { owner_status: ['正常', '停用'] }, unique: ['id_number', 'phone'],
      times: ['created_at'], defaults: { owner_status: '正常', address: null }, created: 'created_at'
    },
    parking_spaces: {
      required: ['space_code', 'area', 'space_type', 'space_status'],
      text: { space_code: 20, area: 30, location_note: 100 },
      enums: { space_type: ['标准', '无障碍', '充电'], space_status: ['可用', '占用', '停用'] },
      unique: ['space_code'], defaults: { space_status: '可用', location_note: null }
    },
    vehicles: {
      required: ['license_plate', 'vehicle_type', 'owner_id', 'vehicle_status', 'registered_at'],
      text: { license_plate: 12, vehicle_color: 20 },
      enums: { vehicle_type: ['小型车', '大型车', '新能源'], vehicle_status: ['正常', '停用'] },
      unique: ['license_plate'], references: { owner_id: 'vehicle_owners' }, times: ['registered_at'],
      defaults: { vehicle_status: '正常', vehicle_color: null }, created: 'registered_at'
    },
    charge_rules: {
      required: ['rule_name', 'hourly_rate', 'minimum_charge', 'effective_date', 'rule_status', 'created_by_administrator_id'],
      text: { rule_name: 50 }, enums: { rule_status: ['启用', '停用'] }, unique: ['rule_name'],
      amounts: { hourly_rate: true, minimum_charge: false, daily_cap: true },
      dates: ['effective_date', 'expiry_date'], references: { created_by_administrator_id: 'administrators' },
      defaults: { rule_status: '启用', minimum_charge: 0, daily_cap: null, expiry_date: null }
    },
    rental_contracts: {
      required: ['contract_no', 'vehicle_id', 'start_date', 'end_date', 'monthly_rent', 'deposit', 'contract_status', 'signed_at', 'handled_by_administrator_id'],
      text: { contract_no: 30, remark: 200 }, enums: { contract_status: ['生效', '到期', '终止'] }, unique: ['contract_no'],
      amounts: { monthly_rent: true, deposit: false }, dates: ['start_date', 'end_date'], times: ['signed_at'],
      references: { vehicle_id: 'vehicles', handled_by_administrator_id: 'administrators' },
      defaults: { deposit: 0, contract_status: '生效', remark: null }, created: 'signed_at'
    },
    parking_records: {
      required: ['vehicle_id', 'parking_space_id', 'parking_type', 'entry_time', 'amount_due', 'record_status', 'handled_by_administrator_id'],
      text: { remark: 200 }, enums: { parking_type: ['临时停车', '月租停车'], record_status: ['在场', '已出场', '异常'] },
      amounts: { amount_due: false }, times: ['entry_time', 'exit_time'],
      references: { vehicle_id: 'vehicles', parking_space_id: 'parking_spaces', charge_rule_id: 'charge_rules', rental_contract_id: 'rental_contracts', handled_by_administrator_id: 'administrators' },
      defaults: { charge_rule_id: null, rental_contract_id: null, exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', remark: null }
    },
    payment_records: {
      required: ['payment_no', 'payment_type', 'amount_due', 'amount_paid', 'payment_method', 'payment_status', 'handled_by_administrator_id'],
      text: { payment_no: 40, remark: 200 },
      enums: { payment_type: ['临停停车费', '月租费'], payment_method: ['现金', '微信', '支付宝', '银行卡'], payment_status: ['待支付', '已支付', '已退款'] },
      unique: ['payment_no'], amounts: { amount_due: false, amount_paid: false }, times: ['paid_at'],
      references: { parking_record_id: 'parking_records', rental_contract_id: 'rental_contracts', handled_by_administrator_id: 'administrators' },
      defaults: { parking_record_id: null, rental_contract_id: null, amount_paid: 0, payment_status: '待支付', paid_at: null, remark: null }
    }
  };
  let database;
  let storage = {
    mode: config.serviceMode, status: 'memory', available: false, persistent: false,
    message: '演示数据暂存在内存中', last_saved_at: null,
    key: config.storageKey, version: config.storageVersion
  };

  // 服务基础工具功能注释开始
  /** @param {*} value JSON 可序列化值。 @returns {*} 与原对象独立的深拷贝。 */
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /** @returns {boolean} 当前是否调用 Java 接口。 */
  function isJavaMode() {
    return config.serviceMode === 'java';
  }

  /** @param {string} resource 资源名。 @returns {object} 数据表、主键及路径定义。 */
  function definition(resource) {
    if (!definitions[resource]) throw new Error(`未知数据资源：${resource}`);
    return definitions[resource];
  }

  /** @param {Date} date 本地日期时间。 @returns {string} 数据库 DATETIME 格式。 */
  function dateTime(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /** @returns {string} 浏览器本地业务日期 YYYY-MM-DD，避免 UTC 导致跨日。 */
  function getBusinessDate() {
    return dateTime().slice(0, 10);
  }

  /** @param {*} value 日期文本。 @param {string} field 字段名称。 @param {boolean} withTime 是否包含时间。 @returns {string} 标准日期或时间文本。 */
  function normalizeDate(value, field, withTime = false) {
    let text = typeof value === 'string' ? value.trim().replace('T', ' ') : '';
    if (withTime && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) text += ':00';
    const pattern = withTime ? /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/;
    const parts = text.match(pattern);
    if (!parts) throw new Error(`${field}日期格式无效`);
    const numbers = parts.slice(1).map(Number);
    const [year, month, day, hour = 0, minute = 0, second = 0] = numbers;
    const parsed = new Date(year, month - 1, day, hour, minute, second);
    if (year < 1000 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day || parsed.getHours() !== hour || parsed.getMinutes() !== minute || parsed.getSeconds() !== second) throw new Error(`${field}日期不存在`);
    return text;
  }

  /** @param {*} value 金额。 @param {string} field 字段名。 @param {boolean} positive 是否必须大于零。 @returns {number} 最多两位小数的有限金额。 */
  function normalizeAmount(value, field, positive = false) {
    const text = typeof value === 'string' ? value.trim() : String(value);
    const number = Number(text);
    if (!/^\d+(\.\d{1,2})?$/.test(text) || !Number.isFinite(number) || number > maximumAmount || (positive ? number <= 0 : number < 0)) throw new Error(`${field}须为${positive ? '大于 0' : '不小于 0'}、最多两位小数且不超过 ${maximumAmount} 的金额`);
    return Math.round(number * 100) / 100;
  }

  /** @param {*} value 业务主键或外键。 @param {string} field 字段名。 @returns {number|string} 正整数主键，大整数保持字符串。 */
  function normalizeId(value, field) {
    if ((typeof value !== 'number' && typeof value !== 'string') || !/^[1-9]\d*$/.test(String(value)) || (typeof value === 'number' && !Number.isSafeInteger(value))) throw new Error(`${field}须为正整数标识`);
    const integer = BigInt(String(value));
    if (integer > 18446744073709551615n) throw new Error(`${field}超出数据库主键范围`);
    return integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : String(value);
  }

  /** @param {string} resource 资源名。 @param {*} id 主键。 @param {object} data 数据库快照。 @returns {object|undefined} 对应记录。 */
  function find(resource, id, data = database) {
    const meta = definition(resource);
    return data[meta.table].find((row) => String(row[meta.id]) === String(id));
  }

  /** @param {object} row 待检查对象。 @param {string} field 字段名。 @returns {boolean} 字段是否有非空值。 */
  function hasValue(row, field) {
    return row[field] !== undefined && row[field] !== null && row[field] !== '';
  }

  /** @param {object} row Java 请求数据。 @returns {object} 移除由登录会话确定的管理员字段。 */
  function stripOperatorFields(row) {
    const safe = { ...row };
    for (const field of Object.keys(safe)) if (field.endsWith('_administrator_id')) delete safe[field];
    return safe;
  }
  // 服务基础工具功能注释结束

  // 数据结构校验功能注释开始
  /**
   * 规范类型并校验字段、日期、金额、唯一值和外键；Java 模式把跨记录校验交给后端事务。
   * @param {string} resource 资源名称。
   * @param {object} input 输入数据。
   * @param {object} options create/partial/id/data/relations 控制新增、部分更新及关联检查。
   * @returns {object} 标准字段对象，不修改输入。
   */
  function normalizeRecord(resource, input, options = {}) {
    const meta = definition(resource);
    const schema = schemas[resource];
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('提交数据必须为对象');
    const row = { ...(options.create ? schema.defaults : {}), ...input };
    if (options.create && schema.created && !hasValue(row, schema.created)) row[schema.created] = dateTime();
    if (hasValue(row, meta.id)) {
      if (options.create || (options.id != null && String(row[meta.id]) !== String(options.id))) throw new Error('主键由系统生成，不能手动指定或修改');
      row[meta.id] = normalizeId(row[meta.id], meta.id);
    }
    for (const field of schema.required) {
      const serverOperator = isJavaMode() && field.endsWith('administrator_id');
      if (!options.partial && !serverOperator && !hasValue(row, field)) throw new Error(`${field}不能为空`);
    }
    for (const [field, length] of Object.entries(schema.text || {})) {
      if (row[field] == null) continue;
      if (typeof row[field] !== 'string') throw new Error(`${field}必须为文本`);
      row[field] = row[field].trim();
      if (Array.from(row[field]).length > length || (schema.required.includes(field) && !row[field])) throw new Error(`${field}长度应为 1 至 ${length} 个字符`);
      if (!row[field] && !schema.required.includes(field)) row[field] = null;
    }
    if (resource === 'vehicle_owners' && row.id_number && !/^\d{17}[\dXx]$/.test(row.id_number)) throw new Error('id_number须为 18 位身份证号码');
    for (const [field, values] of Object.entries(schema.enums || {})) {
      if (row[field] !== undefined && !values.includes(row[field])) throw new Error(`${field}取值无效`);
    }
    for (const [field, positive] of Object.entries(schema.amounts || {})) {
      if (row[field] == null && !schema.required.includes(field)) continue;
      if (options.partial && row[field] === undefined) continue;
      row[field] = normalizeAmount(row[field], field, positive);
    }
    for (const field of schema.dates || []) {
      if (hasValue(row, field)) row[field] = normalizeDate(row[field], field);
      else if (row[field] === '') row[field] = null;
    }
    for (const field of schema.times || []) {
      if (hasValue(row, field)) row[field] = normalizeDate(row[field], field, true);
      else if (row[field] === '') row[field] = null;
    }
    for (const [field] of Object.entries(schema.references || {})) {
      if (hasValue(row, field)) row[field] = normalizeId(row[field], field);
      else if (row[field] === '') row[field] = null;
    }
    if (row.duration_minutes != null && (!Number.isSafeInteger(row.duration_minutes) || row.duration_minutes < 0 || row.duration_minutes > 4294967295)) throw new Error('duration_minutes须为非负整数分钟数');
    if (resource === 'charge_rules' && row.expiry_date && row.effective_date && row.expiry_date < row.effective_date) throw new Error('收费规则失效日期不能早于生效日期');
    if (resource === 'rental_contracts' && row.end_date && row.start_date && row.end_date < row.start_date) throw new Error('合同结束日期不能早于开始日期');
    if (resource === 'parking_records' && !options.partial) {
      if ((row.parking_type === '临时停车' && (!row.charge_rule_id || row.rental_contract_id)) || (row.parking_type === '月租停车' && (!row.rental_contract_id || row.charge_rule_id))) throw new Error('临停仅关联收费规则，月租仅关联月租合同');
      if (row.exit_time && row.exit_time < row.entry_time) throw new Error('出场时间不能早于入场时间');
      if (row.record_status === '在场' && (row.exit_time != null || row.duration_minutes != null)) throw new Error('在场记录的出场时间和时长必须为空');
      if (row.record_status === '已出场' && (!row.exit_time || row.duration_minutes == null)) throw new Error('已出场记录必须有出场时间和时长');
    }
    if (resource === 'payment_records' && !options.partial) {
      const parking = row.parking_record_id != null;
      const contract = row.rental_contract_id != null;
      if (parking === contract) throw new Error('缴费必须且只能关联停车记录或月租合同');
      if ((parking && row.payment_type !== '临停停车费') || (contract && row.payment_type !== '月租费')) throw new Error('缴费类型与归属对象不一致');
      if (row.payment_status === '待支付' && (row.amount_paid !== 0 || row.paid_at != null)) throw new Error('待支付记录的实收金额须为 0 且支付时间为空');
      if (row.payment_status !== '待支付' && (!(row.amount_paid > 0) || !row.paid_at)) throw new Error('已支付或已退款记录须有正数实收金额和支付时间');
    }
    if (options.relations !== false) validateRelations(resource, row, options.id, options.data || database);
    return row;
  }

  /** @param {string} resource 资源名。 @param {object} row 标准记录。 @param {*} id 当前记录主键。 @param {object} data 数据快照。 @returns {void} 无效关联抛出中文错误。 */
  function validateRelations(resource, row, id, data) {
    const schema = schemas[resource];
    const meta = definition(resource);
    for (const [field, parent] of Object.entries(schema.references || {})) {
      if (row[field] != null && !find(parent, row[field], data)) throw new Error(`${field}关联记录不存在`);
    }
    for (const field of schema.unique || []) {
      if (data[meta.table].some((item) => String(item[meta.id]) !== String(id) && String(item[field]).toLocaleLowerCase() === String(row[field]).toLocaleLowerCase())) throw new Error(`${field}已存在，不能重复`);
    }
    if (resource === 'rental_contracts' && row.contract_status === '生效' && data.rental_contract.some((item) => String(item.rental_contract_id) !== String(id) && String(item.vehicle_id) === String(row.vehicle_id) && item.contract_status === '生效' && row.start_date <= item.end_date && row.end_date >= item.start_date)) throw new Error('该车辆已有日期重叠的生效合同');
    if (resource === 'payment_records' && row.parking_record_id != null) {
      const record = find('parking_records', row.parking_record_id, data);
      if (record.parking_type !== '临时停车' || record.record_status !== '已出场') throw new Error('仅已出场的临时停车记录可以缴费');
      if (row.amount_due !== record.amount_due) throw new Error('缴费应收金额须与停车记录一致');
    }
  }
  // 数据结构校验功能注释结束

  // 本地持久化功能注释开始
  /** @returns {object} 八张业务表的独立种子快照；收入趋势在运行时计算。 */
  function seedDatabase() {
    return Object.fromEntries(Object.values(definitions).map((meta) => [meta.table, clone(global.ParkingSeed[meta.table])]));
  }

  /** @param {object} input 存储中的快照。 @returns {object} 已验证且字段规范化的数据快照。 */
  function validateDatabase(input) {
    if (!input || typeof input !== 'object') throw new Error('本地数据结构无效');
    const result = {};
    for (const [resource, meta] of Object.entries(definitions)) {
      if (!Array.isArray(input[meta.table])) throw new Error(`本地数据缺少${meta.table}`);
      const identifiers = new Set();
      result[meta.table] = input[meta.table].map((item) => {
        const id = normalizeId(item[meta.id], meta.id);
        if (identifiers.has(String(id))) throw new Error('本地数据含有重复主键');
        identifiers.add(String(id));
        return { ...normalizeRecord(resource, item, { id, relations: false }), [meta.id]: id };
      });
    }
    for (const [resource, meta] of Object.entries(definitions)) {
      for (const item of result[meta.table]) validateRelations(resource, item, item[meta.id], result);
    }
    const occupiedVehicles = new Set();
    const occupiedSpaces = new Set();
    for (const record of result.parking_record.filter((item) => item.record_status === '在场')) {
      if (occupiedVehicles.has(String(record.vehicle_id)) || occupiedSpaces.has(String(record.parking_space_id))) throw new Error('本地数据含有重复在场记录');
      occupiedVehicles.add(String(record.vehicle_id));
      occupiedSpaces.add(String(record.parking_space_id));
    }
    for (const space of result.parking_space) {
      if ((space.space_status === '占用') !== occupiedSpaces.has(String(space.parking_space_id))) throw new Error('本地车位状态与在场记录不一致');
    }
    return result;
  }

  /** @param {string} status 保存成功后的状态名称。 @returns {void} 保存失败时自动保留内存数据并更新提示。 */
  function persist(status = 'saved') {
    if (isJavaMode()) return;
    try {
      const savedAt = dateTime();
      global.localStorage.setItem(config.storageKey, JSON.stringify({ schema_version: config.storageVersion, saved_at: savedAt, data: database }));
      storage = { ...storage, status, available: true, persistent: true, last_saved_at: savedAt, message: '演示数据已自动保存到当前浏览器' };
    } catch (error) {
      storage = { ...storage, status: 'unavailable', available: false, persistent: false, message: '浏览器不允许本地保存，当前操作仅在本次打开期间有效' };
    }
  }

  /** @returns {void} 加载版本匹配的存档；损坏或禁用时回退种子并显示原因。 */
  function initializeStorage() {
    database = seedDatabase();
    if (isJavaMode()) {
      storage = { ...storage, status: 'java', message: 'Java 接口模式：数据由服务端保存' };
      return;
    }
    let content;
    try {
      content = global.localStorage.getItem(config.storageKey);
    } catch (error) {
      storage = { ...storage, status: 'unavailable', available: false, persistent: false, message: '本地保存不可用，当前使用内存演示数据' };
      return;
    }
    if (!content) {
      persist();
      return;
    }
    try {
      const envelope = JSON.parse(content);
      if (envelope.schema_version !== config.storageVersion) throw new Error('存档版本不匹配');
      database = validateDatabase(envelope.data);
      storage = { ...storage, status: 'restored', available: true, persistent: true, last_saved_at: envelope.saved_at || null, message: '已恢复当前浏览器保存的演示数据' };
    } catch (error) {
      storage = { ...storage, status: 'invalid', available: true, persistent: false, message: '本地存档无效，已使用初始数据；重置演示数据可修复存档' };
    }
  }

  /** @returns {object} UI 可直接显示的保存状态、提示、键名、版本及最后保存时间。 */
  function getStorageStatus() {
    return clone(storage);
  }

  /** @returns {object} 重置后的存储状态；Java 模式禁止重置。 */
  function resetDemoData() {
    if (isJavaMode()) throw new Error('Java 模式不能重置本地演示数据');
    database = seedDatabase();
    persist();
    return getStorageStatus();
  }
  // 本地持久化功能注释结束

  // CRUD 数据访问功能注释开始
  /** @param {string} resource 资源名。 @param {object} options q/filters/sortBy/sortOrder/page/pageSize 查询参数。 @returns {Promise<object>} items/total/page/page_size 分页结果。 */
  async function list(resource, options = {}) {
    const meta = definition(resource);
    const page = Math.max(1, Math.floor(Number(options.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(options.pageSize) || 20)));
    if (isJavaMode()) {
      const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (options.q) query.set('q', String(options.q));
      if (options.filters) query.set('filters', JSON.stringify(options.filters));
      if (options.sortBy) query.set('sort_by', options.sortBy);
      if (options.sortOrder) query.set('sort_order', options.sortOrder);
      return api.request(`${meta.path}?${query}`);
    }
    let items = [...database[meta.table]];
    if (options.q) {
      const keyword = String(options.q).toLocaleLowerCase();
      items = items.filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(keyword));
    }
    items = items.filter((item) => Object.entries(options.filters || {}).every(([field, value]) => value == null || value === '' || String(item[field]) === String(value)));
    if (options.sortBy) items.sort((left, right) => String(left[options.sortBy] ?? '').localeCompare(String(right[options.sortBy] ?? ''), 'zh-CN', { numeric: true }) * (options.sortOrder === 'desc' ? -1 : 1));
    return { items: clone(items.slice((page - 1) * pageSize, page * pageSize)), total: items.length, page, page_size: pageSize };
  }

  /** @param {string} resource 资源名。 @param {*} id 主键。 @returns {Promise<object|null>} 记录或 null。 */
  async function get(resource, id) {
    const meta = definition(resource);
    normalizeId(id, meta.id);
    if (isJavaMode()) {
      try {
        return await api.request(`${meta.path}/${encodeURIComponent(id)}`);
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    }
    const item = find(resource, id);
    return item ? clone(item) : null;
  }

  /** @param {string} resource 资源名。 @returns {number} 未占用的安全整数主键。 */
  function nextId(resource) {
    const meta = definition(resource);
    const highest = database[meta.table].reduce((maximum, row) => {
      const id = Number(row[meta.id]);
      if (!Number.isSafeInteger(id)) throw new Error('本地演示主键超出安全整数范围，请改用 Java 服务');
      return Math.max(maximum, id);
    }, 0);
    if (!Number.isSafeInteger(highest + 1)) throw new Error('本地演示主键已达到上限');
    return highest + 1;
  }

  /** @param {string} resource 资源名。 @param {object} payload 新增字段，不能指定主键。 @returns {Promise<object>} 新建记录。 */
  async function create(resource, payload) {
    const meta = definition(resource);
    if (resource === 'parking_records') return createParkingRecord(payload);
    const record = normalizeRecord(resource, payload, { create: true, relations: !isJavaMode() });
    if (resource === 'parking_spaces' && record.space_status === '占用') throw new Error('车位占用状态只能通过车辆入场设置');
    if (isJavaMode()) return api.request(meta.path, { method: 'POST', body: stripOperatorFields(record) });
    const item = { ...record, [meta.id]: nextId(resource) };
    database[meta.table].push(item);
    persist();
    return clone(item);
  }

  /** @param {string} resource 资源名。 @param {*} id 主键。 @param {object} changes 部分修改字段。 @returns {Promise<object>} 更新后的资料。 */
  async function update(resource, id, changes) {
    const meta = definition(resource);
    normalizeId(id, meta.id);
    if (['parking_records', 'payment_records'].includes(resource)) throw new Error('停车和缴费记录请使用对应业务操作修改');
    if (isJavaMode()) {
      const patch = stripOperatorFields(normalizeRecord(resource, changes, { partial: true, id, relations: false }));
      delete patch[meta.id];
      if (resource === 'parking_spaces' && patch.space_status === '占用') throw new Error('车位占用状态只能通过车辆入场设置');
      return api.request(`${meta.path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
    }
    const previous = find(resource, id);
    if (!previous) throw new Error('记录不存在');
    const item = normalizeRecord(resource, { ...previous, ...changes }, { id });
    if (resource === 'parking_spaces' && item.space_status !== previous.space_status && (item.space_status === '占用' || previous.space_status === '占用')) throw new Error('占用车位须先办理出场；占用状态只能由入场流程设置');
    if (resource === 'rental_contracts' && String(item.vehicle_id) !== String(previous.vehicle_id) && database.parking_record.some((record) => String(record.rental_contract_id) === String(id))) throw new Error('已有停车历史的合同不能更换车辆');
    Object.assign(previous, item);
    persist();
    return clone(previous);
  }

  /** @param {string} resource 资源名。 @param {*} id 主键。 @returns {Promise<object|null>} 删除结果；历史和被引用资料拒绝删除。 */
  async function remove(resource, id) {
    const meta = definition(resource);
    normalizeId(id, meta.id);
    if (['parking_records', 'payment_records'].includes(resource)) throw new Error('历史记录不能物理删除');
    if (isJavaMode()) return api.request(`${meta.path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const item = find(resource, id);
    if (!item) throw new Error('记录不存在');
    for (const [childResource, schema] of Object.entries(schemas)) {
      for (const [field, parent] of Object.entries(schema.references || {})) {
        if (parent === resource && database[definition(childResource).table].some((child) => String(child[field]) === String(id))) throw new Error('该资料已被业务记录引用，请使用停用或终止操作');
      }
    }
    database[meta.table].splice(database[meta.table].indexOf(item), 1);
    persist();
    return { deleted: true, [meta.id]: item[meta.id] };
  }
  // CRUD 数据访问功能注释结束

  // 入场出场联动功能注释开始
  /** @returns {number|undefined} 当前模拟数据中的首位启用管理员，仅供本地演示默认操作员。 */
  function defaultOperator() {
    return database.administrator.find((item) => item.account_status === '启用')?.administrator_id;
  }

  /** @param {*} id 管理员主键。 @returns {void} 无效或停用账号不能办理新业务。 */
  function requireOperator(id) {
    if (find('administrators', id)?.account_status !== '启用') throw new Error('办理管理员不存在或已停用');
  }

  /** @param {object} payload 车辆、车位、停车类型及其规则/合同。 @returns {Promise<object>} 新建的在场记录。 */
  async function createParkingRecord(payload) {
    const input = {
      ...payload, parking_type: payload.parking_type || '临时停车', entry_time: payload.entry_time || dateTime(),
      record_status: '在场', exit_time: null, duration_minutes: null, amount_due: 0
    };
    if (!isJavaMode() && !hasValue(input, 'handled_by_administrator_id')) input.handled_by_administrator_id = defaultOperator();
    const record = normalizeRecord('parking_records', input, { create: true, relations: !isJavaMode() });
    if (isJavaMode()) return api.request('/parking-records', { method: 'POST', body: stripOperatorFields(record) });
    const vehicle = find('vehicles', record.vehicle_id);
    const space = find('parking_spaces', record.parking_space_id);
    if (vehicle.vehicle_status !== '正常' || find('vehicle_owners', vehicle.owner_id).owner_status !== '正常') throw new Error('车辆或所属车主已停用');
    requireOperator(record.handled_by_administrator_id);
    if (database.parking_record.some((item) => item.record_status === '在场' && String(item.vehicle_id) === String(record.vehicle_id))) throw new Error('该车辆已有在场记录');
    if (space.space_status !== '可用' || database.parking_record.some((item) => item.record_status === '在场' && String(item.parking_space_id) === String(record.parking_space_id))) throw new Error('该车位不可用或已有在场车辆');
    const entryDate = record.entry_time.slice(0, 10);
    if (record.parking_type === '临时停车') {
      const rule = find('charge_rules', record.charge_rule_id);
      if (rule.rule_status !== '启用' || entryDate < rule.effective_date || (rule.expiry_date && entryDate > rule.expiry_date)) throw new Error('收费规则停用或不在有效期内');
    } else {
      const contract = find('rental_contracts', record.rental_contract_id);
      if (contract.contract_status !== '生效' || String(contract.vehicle_id) !== String(record.vehicle_id) || entryDate < contract.start_date || entryDate > contract.end_date) throw new Error('月租合同无效、过期或不属于当前车辆');
    }
    const item = { ...record, parking_record_id: nextId('parking_records') };
    database.parking_record.push(item);
    space.space_status = '占用';
    persist();
    return clone(item);
  }

  /** @param {number} minutes 停车时长。 @param {object} rule 收费规则。 @returns {number} 连续24小时封顶、最低收费优先的应收金额。 */
  function calculateCharge(minutes, rule) {
    const hourly = Math.round(rule.hourly_rate * 100);
    const cap = rule.daily_cap == null ? Infinity : Math.round(rule.daily_cap * 100);
    const fullDays = Math.floor(minutes / 1440);
    const hours = Math.ceil((minutes % 1440) / 60);
    const cents = Math.max(Math.round(rule.minimum_charge * 100), fullDays * Math.min(24 * hourly, cap) + Math.min(hours * hourly, cap));
    return normalizeAmount((cents / 100).toFixed(2), 'amount_due');
  }

  /** @param {*} id 在场记录主键。 @param {object} options 可选 exit_time、handled_by_administrator_id。 @returns {Promise<object>} 已出场记录并同步释放车位。 */
  async function exitParkingRecord(id, options = {}) {
    normalizeId(id, 'parking_record_id');
    const input = { ...options, exit_time: normalizeDate(options.exit_time || dateTime(), 'exit_time', true) };
    if (isJavaMode()) return api.request(`/parking-records/${encodeURIComponent(id)}/exit`, { method: 'POST', body: stripOperatorFields(input) });
    const record = find('parking_records', id);
    if (!record || record.record_status !== '在场') throw new Error('未找到对应的在场记录');
    if (input.exit_time < record.entry_time) throw new Error('出场时间不能早于入场时间');
    const operator = options.handled_by_administrator_id || record.handled_by_administrator_id;
    requireOperator(operator);
    const minutes = Math.ceil((new Date(input.exit_time.replace(' ', 'T')) - new Date(record.entry_time.replace(' ', 'T'))) / 60000);
    const amount = record.parking_type === '临时停车' ? calculateCharge(minutes, find('charge_rules', record.charge_rule_id)) : 0;
    const next = normalizeRecord('parking_records', { ...record, exit_time: input.exit_time, duration_minutes: minutes, amount_due: amount, record_status: '已出场', handled_by_administrator_id: operator }, { id });
    Object.assign(record, next);
    find('parking_spaces', record.parking_space_id).space_status = '可用';
    persist();
    return clone(record);
  }
  // 入场出场联动功能注释结束

  // 缴费退款功能注释开始
  /** @param {object} payload 缴费归属、金额、方式与流水号。 @returns {Promise<object>} 新建缴费记录，默认待支付。 */
  async function createPaymentRecord(payload) {
    const status = payload.payment_status || '待支付';
    const input = {
      ...payload, payment_status: status,
      amount_paid: payload.amount_paid ?? (status === '待支付' ? 0 : payload.amount_due),
      paid_at: payload.paid_at ?? (status === '待支付' ? null : dateTime())
    };
    if (!isJavaMode() && !hasValue(input, 'handled_by_administrator_id')) input.handled_by_administrator_id = defaultOperator();
    if (!isJavaMode()) requireOperator(input.handled_by_administrator_id);
    return create('payment_records', input);
  }

  /** @param {*} id 待支付流水主键。 @param {object} payment amount_paid/payment_method/paid_at/handled_by_administrator_id。 @returns {Promise<object>} 已支付流水。 */
  async function payPaymentRecord(id, payment = {}) {
    normalizeId(id, 'payment_record_id');
    if (isJavaMode()) {
      const input = { ...payment };
      if (input.amount_paid !== undefined) input.amount_paid = normalizeAmount(input.amount_paid, 'amount_paid', true);
      if (input.paid_at) input.paid_at = normalizeDate(input.paid_at, 'paid_at', true);
      return api.request(`/payment-records/${encodeURIComponent(id)}/pay`, { method: 'POST', body: stripOperatorFields(input) });
    }
    const record = find('payment_records', id);
    if (!record || record.payment_status !== '待支付') throw new Error('只有待支付记录可以收款');
    const next = normalizeRecord('payment_records', {
      ...record, ...payment, payment_record_id: record.payment_record_id, payment_status: '已支付',
      amount_paid: payment.amount_paid ?? record.amount_due, paid_at: payment.paid_at || dateTime()
    }, { id });
    requireOperator(next.handled_by_administrator_id);
    Object.assign(record, next);
    persist();
    return clone(record);
  }

  /** @param {*} id 已支付流水主键。 @param {object} options 可选 remark、handled_by_administrator_id。 @returns {Promise<object>} 已退款流水，保留原实收金额与支付时间。 */
  async function refundPaymentRecord(id, options = {}) {
    normalizeId(id, 'payment_record_id');
    if (isJavaMode()) return api.request(`/payment-records/${encodeURIComponent(id)}/refund`, { method: 'POST', body: stripOperatorFields(options) });
    const record = find('payment_records', id);
    if (!record || record.payment_status !== '已支付') throw new Error('只有已支付记录可以退款');
    const next = normalizeRecord('payment_records', { ...record, ...options, payment_record_id: record.payment_record_id, payment_status: '已退款', amount_paid: record.amount_paid, paid_at: record.paid_at }, { id });
    requireOperator(next.handled_by_administrator_id);
    Object.assign(record, next);
    persist();
    return clone(record);
  }
  // 缴费退款功能注释结束

  // 运营统计聚合功能注释开始
  /** @returns {Promise<object>} 统一总览 DTO；0收入保留为0，七日趋势由已支付流水动态生成。 */
  async function getDashboardSummary() {
    if (isJavaMode()) return api.request('/dashboard/summary');
    const today = getBusinessDate();
    const current = database.parking_record.filter((item) => item.record_status === '在场');
    const active = database.rental_contract.filter((item) => item.contract_status === '生效' && item.start_date <= today && item.end_date >= today);
    const paid = database.payment_record.filter((item) => item.payment_status === '已支付');
    const occupied = database.parking_space.filter((item) => item.space_status === '占用').length;
    const usable = database.parking_space.filter((item) => item.space_status !== '停用').length;
    const revenues = new Map();
    for (const payment of paid) {
      const day = payment.paid_at.slice(0, 10);
      revenues.set(day, (revenues.get(day) || 0) + Math.round(payment.amount_paid * 100));
    }
    const history = [];
    const end = new Date(`${today}T12:00:00`);
    const expiry = new Date(end);
    expiry.setDate(expiry.getDate() + 30);
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(end);
      day.setDate(day.getDate() - offset);
      const key = dateTime(day).slice(0, 10);
      history.push({ label: key.slice(5).replace('-', '/'), date: key, value: (revenues.get(key) || 0) / 100 });
    }
    return clone({
      metrics: { current_vehicles: current.length, usable_spaces: usable, occupied_spaces: occupied, active_contracts: active.length, today_revenue: (revenues.get(today) || 0) / 100, pending_payments: database.payment_record.filter((item) => item.payment_status === '待支付').length, paid_payment_count: paid.length },
      occupancy: { total: database.parking_space.length, usable, occupied, disabled: database.parking_space.length - usable },
      current_records: current, vehicles: database.vehicle, owners: database.vehicle_owner, spaces: database.parking_space,
      contracts: active, expiring_contracts: active.filter((item) => item.end_date <= dateTime(expiry).slice(0, 10)), revenue_history: history
    });
  }
  // 运营统计聚合功能注释结束

  initializeStorage();
  global.parkingService = Object.freeze({
    list, get, create, update, remove, getDashboardSummary,
    createParkingRecord, enterVehicle: createParkingRecord, exitParkingRecord,
    createPaymentRecord, payPaymentRecord, refundPaymentRecord,
    resetDemoData, getStorageStatus, getBusinessDate
  });
})(window);
// 停车业务服务功能注释结束
