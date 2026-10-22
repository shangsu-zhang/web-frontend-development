// 前端服务回归测试功能注释开始
/**
 * 使用 Node 内置模块在隔离的浏览器假环境运行经典脚本，不访问网络或数据库。
 * @returns {void} 供 node --test 发现并执行服务验证用例。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

// 创建隔离浏览器环境功能注释开始
/**
 * 创建带可重用 localStorage 的 VM 上下文并按正式顺序载入脚本。
 * @param {object} options 可提供存储、Java 模式及 fetch 测试替身。
 * @returns {{context: object, calls: object[], storage: object}} 隔离窗口、请求记录和存储读写器。
 */
function loadBrowser(options = {}) {
  const values = options.values || new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
  const calls = [];
  const window = {
    localStorage: storage,
    setTimeout,
    clearTimeout,
    fetch: async (url, request = {}) => {
      calls.push({ url, request });
      if (options.fetch) return options.fetch(url, request);
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
    }
  };
  const context = vm.createContext({ window, URLSearchParams, console, structuredClone, AbortController, DOMException });
  if (options.throwOnStore) {
    window.localStorage = {
      getItem() { throw new DOMException('storage blocked', 'SecurityError'); },
      setItem() { throw new DOMException('storage blocked', 'SecurityError'); }
    };
  }
  for (const file of ['js/config.js', 'js/mock-data.js', 'js/services/api-client.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  if (options.java) context.window.ParkingConfig = Object.freeze({ ...context.window.ParkingConfig, serviceMode: 'java' });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/services/parking-service.js'), 'utf8'), context, { filename: 'js/services/parking-service.js' });
  return { context, calls, storage: values };
}
// 创建隔离浏览器环境功能注释结束

// 车辆新增测试工具功能注释开始
/**
 * 新增唯一测试车辆并返回 mock 服务生成的数据库主键。
 * @param {object} service window.parkingService。
 * @param {string} suffix 测试车牌尾号，区分多条用例。
 * @returns {Promise<object>} 新车辆资料。
 */
async function createTestVehicle(service, suffix) {
  return service.create('vehicles', {
    license_plate: `京A${suffix}`,
    vehicle_type: '小型车',
    vehicle_color: '黑色',
    owner_id: 1,
    vehicle_status: '正常'
  });
}
// 车辆新增测试工具功能注释结束

test('classic scripts expose the expected globals and browser date', () => {
  const { context } = loadBrowser();
  assert.ok(context.window.ParkingConfig);
  assert.ok(context.window.ParkingSeed);
  assert.ok(context.window.parkingService);
  assert.match(context.window.parkingService.getBusinessDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(context.window.parkingService.getStorageStatus().persistent, true);
});

test('CRUD rejects invalid amounts, bad dates and caller supplied identifiers', async () => {
  const { context } = loadBrowser();
  const service = context.window.parkingService;
  await assert.rejects(() => service.create('charge_rules', {
    rule_name: 'NaN rule', hourly_rate: 'NaN', minimum_charge: 0, effective_date: '2026-01-01', created_by_administrator_id: 1
  }), /hourly_rate/);
  await assert.rejects(() => service.create('charge_rules', {
    rule_name: 'large rule', hourly_rate: 100000000, minimum_charge: 0, effective_date: '2026-01-01', created_by_administrator_id: 1
  }), /99999999\.99/);
  await assert.rejects(() => service.create('charge_rules', {
    rule_name: 'date rule', hourly_rate: 1, minimum_charge: 0, effective_date: '2026-02-30', created_by_administrator_id: 1
  }), /日期不存在/);
  await assert.rejects(() => createTestVehicle(service, 'TEST1').then(() => service.create('vehicles', {
    vehicle_id: 99, license_plate: '京AOWNED', vehicle_type: '小型车', owner_id: 1, vehicle_status: '正常'
  })), /主键由系统生成/);
});

test('entry, duration pricing, payment, refund and occupancy stay consistent', async () => {
  const { context, storage } = loadBrowser();
  const service = context.window.parkingService;
  const beforeRevenue = (await service.getDashboardSummary()).metrics.today_revenue;
  const businessDate = service.getBusinessDate();
  const vehicle = await createTestVehicle(service, 'FLOW1');
  const entry = await service.createParkingRecord({
    vehicle_id: vehicle.vehicle_id, parking_space_id: 2, parking_type: '临时停车', charge_rule_id: 2,
    entry_time: `${businessDate} 10:00:00`, handled_by_administrator_id: 2
  });
  assert.equal((await service.get('parking_spaces', 2)).space_status, '占用');
  await assert.rejects(() => service.update('parking_spaces', 2, { space_status: '可用' }), /占用车位须先办理出场/);
  const exited = await service.exitParkingRecord(entry.parking_record_id, { exit_time: `${businessDate} 12:58:00` });
  assert.equal(exited.duration_minutes, 178);
  assert.equal(exited.amount_due, 18);
  assert.equal((await service.get('parking_spaces', 2)).space_status, '可用');
  const payment = await service.createPaymentRecord({
    payment_no: 'PAY-TEST-FLOW1', payment_type: '临停停车费', parking_record_id: exited.parking_record_id,
    amount_due: exited.amount_due, payment_method: '微信', handled_by_administrator_id: 2
  });
  await service.payPaymentRecord(payment.payment_record_id, { payment_method: '支付宝' });
  assert.equal((await service.getDashboardSummary()).metrics.today_revenue, beforeRevenue + 18);
  await service.refundPaymentRecord(payment.payment_record_id, { remark: 'test refund' });
  const summary = await service.getDashboardSummary();
  assert.equal(summary.metrics.today_revenue, beforeRevenue);
  assert.equal(summary.revenue_history.find((item) => item.date === businessDate).value, beforeRevenue);
  assert.match(storage.get(context.window.ParkingConfig.storageKey), /test refund/);
});

test('billing applies daily cap against 24 hourly charges and preserves minimum priority', async () => {
  const { context } = loadBrowser();
  const service = context.window.parkingService;
  const rule = await service.create('charge_rules', {
    rule_name: 'High cap test', hourly_rate: 8, minimum_charge: 0, daily_cap: 500,
    effective_date: '2026-01-01', created_by_administrator_id: 1
  });
  const vehicle = await createTestVehicle(service, 'CAP01');
  const entry = await service.createParkingRecord({ vehicle_id: vehicle.vehicle_id, parking_space_id: 4, charge_rule_id: rule.charge_rule_id, entry_time: '2026-10-22 00:00:00' });
  const exited = await service.exitParkingRecord(entry.parking_record_id, { exit_time: '2026-10-23 00:00:00' });
  assert.equal(exited.amount_due, 192);
  const minimumRule = await service.create('charge_rules', {
    rule_name: 'Minimum above cap test', hourly_rate: 8, minimum_charge: 90, daily_cap: 50,
    effective_date: '2026-01-01', created_by_administrator_id: 1
  });
  const secondVehicle = await createTestVehicle(service, 'CAP02');
  const secondEntry = await service.createParkingRecord({ vehicle_id: secondVehicle.vehicle_id, parking_space_id: 7, charge_rule_id: minimumRule.charge_rule_id, entry_time: '2026-10-22 00:00:00' });
  assert.equal((await service.exitParkingRecord(secondEntry.parking_record_id, { exit_time: '2026-10-22 01:00:00' })).amount_due, 90);
});

test('storage restores mutations and reset returns to the seed snapshot', async () => {
  const first = loadBrowser();
  const service = first.context.window.parkingService;
  await createTestVehicle(service, 'SAVE1');
  const values = first.storage;
  const second = loadBrowser({ values });
  assert.equal((await second.context.window.parkingService.list('vehicles')).total, 7);
  second.context.window.parkingService.resetDemoData();
  assert.equal((await second.context.window.parkingService.list('vehicles')).total, 6);
});

test('blocked and corrupt browser storage report a recoverable state', () => {
  const blocked = loadBrowser({ throwOnStore: true });
  assert.equal(blocked.context.window.parkingService.getStorageStatus().persistent, false);
  const values = new Map([["parking-management.demo.v1", '{"schema_version":99,"data":{}}']]);
  const corrupt = loadBrowser({ values });
  assert.equal(corrupt.context.window.parkingService.getStorageStatus().status, 'invalid');
  corrupt.context.window.parkingService.resetDemoData();
  assert.equal(corrupt.context.window.parkingService.getStorageStatus().persistent, true);
});

test('Java mode uses PATCH, reports API errors and refuses local reset', async () => {
  const { context, calls } = loadBrowser({
    java: true,
    fetch: async (url, request) => {
      if (url.endsWith('/vehicles/1')) return { ok: true, status: 200, text: async () => JSON.stringify({ vehicle_id: 1 }) };
      if (url.endsWith('/vehicles/999')) return { ok: false, status: 404, text: async () => JSON.stringify({ code: 'NOT_FOUND', message: 'missing' }) };
      if (url.startsWith('http://localhost:8080/api/parking-spaces')) return { ok: false, status: 409, text: async () => JSON.stringify({ code: 'CONFLICT', message: 'occupied' }) };
      return { ok: true, status: 204, text: async () => '' };
    }
  });
  const service = context.window.parkingService;
  await service.update('vehicles', 1, { vehicle_color: '蓝色' });
  assert.equal(calls[0].request.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].request.body), { vehicle_color: '蓝色' });
  assert.equal(await service.get('vehicles', 999), null);
  await assert.rejects(() => service.list('parking_spaces'), (error) => error.status === 409 && error.code === 'CONFLICT' && error.message === 'occupied');
  assert.throws(() => service.resetDemoData(), /Java 模式不能重置/);
});
// 前端服务回归测试功能注释结束
