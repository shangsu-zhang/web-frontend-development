/* 模拟数据功能注释开始 */
/*
  数据来源：停车场管理数据库项目的 8 张业务表及其字段设计说明。
  使用方式：开发阶段由 mock-service 读取；生产接入 Java 时不直接改动页面数据结构。
  约定：字段名沿用数据库英文 snake_case，显示层再翻译为中文。
*/
(function initializeParkingSeed(global) {
  'use strict';
  global.ParkingSeed = {
  administrator: [
    { administrator_id: 1, employee_no: 'ADM001', name: '林晓峰', phone: '13800138001', login_account: 'linxf', role: '系统管理员', account_status: '启用', created_at: '2026-01-05 09:00:00' },
    { administrator_id: 2, employee_no: 'ADM002', name: '周婉宁', phone: '13800138002', login_account: 'zhouwen', role: '收费员', account_status: '启用', created_at: '2026-01-08 09:00:00' },
    { administrator_id: 3, employee_no: 'ADM003', name: '赵明远', phone: '13800138003', login_account: 'zhaomy', role: '主管', account_status: '启用', created_at: '2026-01-11 09:00:00' }
  ],
  vehicle_owner: [
    { owner_id: 1, name: '王海', id_number: '110101199001011234', phone: '13910001001', address: '朝阳区建国路 88 号', owner_status: '正常', created_at: '2026-02-03 10:20:00' },
    { owner_id: 2, name: '陈思远', id_number: '110101198806062345', phone: '13910001002', address: '海淀区中关村大街 1 号', owner_status: '正常', created_at: '2026-02-05 11:10:00' },
    { owner_id: 3, name: '李娜', id_number: '110101199304083456', phone: '13910001003', address: '西城区复兴门外大街 6 号', owner_status: '正常', created_at: '2026-02-08 08:50:00' },
    { owner_id: 4, name: '高远', id_number: '110101198912124567', phone: '13910001004', address: '东城区东直门外大街 9 号', owner_status: '正常', created_at: '2026-02-12 14:25:00' }
  ],
  parking_space: [
    { parking_space_id: 1, space_code: 'A001', area: 'A 区', space_type: '标准', space_status: '占用', location_note: '入口左侧' },
    { parking_space_id: 2, space_code: 'A002', area: 'A 区', space_type: '标准', space_status: '可用', location_note: '入口左侧' },
    { parking_space_id: 3, space_code: 'A003', area: 'A 区', space_type: '充电', space_status: '占用', location_note: '充电桩 01' },
    { parking_space_id: 4, space_code: 'A004', area: 'A 区', space_type: '标准', space_status: '可用', location_note: '入口右侧' },
    { parking_space_id: 5, space_code: 'A005', area: 'A 区', space_type: '无障碍', space_status: '可用', location_note: '电梯旁' },
    { parking_space_id: 6, space_code: 'A006', area: 'A 区', space_type: '标准', space_status: '占用', location_note: '入口右侧' },
    { parking_space_id: 7, space_code: 'A007', area: 'A 区', space_type: '标准', space_status: '可用', location_note: '入口右侧' },
    { parking_space_id: 8, space_code: 'A008', area: 'A 区', space_type: '标准', space_status: '可用', location_note: '入口右侧' },
    { parking_space_id: 9, space_code: 'A009', area: 'A 区', space_type: '标准', space_status: '占用', location_note: '出口旁' },
    { parking_space_id: 10, space_code: 'A010', area: 'A 区', space_type: '标准', space_status: '可用', location_note: '出口旁' },
    { parking_space_id: 11, space_code: 'B001', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层北侧' },
    { parking_space_id: 12, space_code: 'B002', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层北侧' },
    { parking_space_id: 13, space_code: 'B003', area: 'B 区', space_type: '充电', space_status: '占用', location_note: '充电桩 02' },
    { parking_space_id: 14, space_code: 'B004', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层北侧' },
    { parking_space_id: 15, space_code: 'B005', area: 'B 区', space_type: '标准', space_status: '停用', location_note: '设备维护中' },
    { parking_space_id: 16, space_code: 'B006', area: 'B 区', space_type: '无障碍', space_status: '可用', location_note: '电梯旁' },
    { parking_space_id: 17, space_code: 'B007', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层南侧' },
    { parking_space_id: 18, space_code: 'B008', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层南侧' },
    { parking_space_id: 19, space_code: 'B009', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层南侧' },
    { parking_space_id: 20, space_code: 'B010', area: 'B 区', space_type: '标准', space_status: '可用', location_note: '二层南侧' }
  ],
  vehicle: [
    { vehicle_id: 1, license_plate: '京 A·P0012', vehicle_type: '小型车', vehicle_color: '黑色', owner_id: 1, vehicle_status: '正常', registered_at: '2026-02-03 10:25:00' },
    { vehicle_id: 2, license_plate: '京 A·P0038', vehicle_type: '新能源', vehicle_color: '白色', owner_id: 2, vehicle_status: '正常', registered_at: '2026-02-05 11:15:00' },
    { vehicle_id: 3, license_plate: '京 B·K6610', vehicle_type: '小型车', vehicle_color: '灰色', owner_id: 3, vehicle_status: '正常', registered_at: '2026-02-08 09:00:00' },
    { vehicle_id: 4, license_plate: '京 A·Q8217', vehicle_type: '大型车', vehicle_color: '蓝色', owner_id: 4, vehicle_status: '正常', registered_at: '2026-02-12 14:30:00' },
    { vehicle_id: 5, license_plate: '京 C·N5518', vehicle_type: '新能源', vehicle_color: '银色', owner_id: 1, vehicle_status: '正常', registered_at: '2026-02-18 12:20:00' },
    { vehicle_id: 6, license_plate: '京 A·R9001', vehicle_type: '小型车', vehicle_color: '红色', owner_id: 2, vehicle_status: '停用', registered_at: '2026-02-21 16:40:00' }
  ],
  charge_rule: [
    { charge_rule_id: 1, rule_name: '工作日临停', hourly_rate: 8, minimum_charge: 8, daily_cap: 80, effective_date: '2026-01-01', expiry_date: null, rule_status: '启用', created_by_administrator_id: 1 },
    { charge_rule_id: 2, rule_name: '周末临停', hourly_rate: 6, minimum_charge: 6, daily_cap: 60, effective_date: '2026-01-01', expiry_date: null, rule_status: '启用', created_by_administrator_id: 1 }
  ],
  rental_contract: [
    { rental_contract_id: 1, contract_no: 'RC20260018', vehicle_id: 2, start_date: '2026-01-01', end_date: '2026-12-31', monthly_rent: 980, deposit: 980, contract_status: '生效', signed_at: '2025-12-28 15:30:00', handled_by_administrator_id: 3, remark: '新能源固定车位' },
    { rental_contract_id: 2, contract_no: 'RC20260021', vehicle_id: 3, start_date: '2026-02-01', end_date: '2026-10-28', monthly_rent: 880, deposit: 880, contract_status: '生效', signed_at: '2026-01-28 10:00:00', handled_by_administrator_id: 3, remark: '预计近期续租' },
    { rental_contract_id: 3, contract_no: 'RC20260024', vehicle_id: 5, start_date: '2026-03-01', end_date: '2027-02-28', monthly_rent: 980, deposit: 980, contract_status: '生效', signed_at: '2026-02-25 11:20:00', handled_by_administrator_id: 1, remark: '新能源固定车位' }
  ],
  parking_record: [
    { parking_record_id: 1, vehicle_id: 1, parking_space_id: 1, parking_type: '临时停车', charge_rule_id: 1, rental_contract_id: null, entry_time: '2026-10-22 08:18:00', exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 2, vehicle_id: 2, parking_space_id: 3, parking_type: '月租停车', charge_rule_id: null, rental_contract_id: 1, entry_time: '2026-10-22 07:42:00', exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 3, vehicle_id: 3, parking_space_id: 6, parking_type: '月租停车', charge_rule_id: null, rental_contract_id: 2, entry_time: '2026-10-22 09:05:00', exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 4, vehicle_id: 4, parking_space_id: 9, parking_type: '临时停车', charge_rule_id: 1, rental_contract_id: null, entry_time: '2026-10-22 10:26:00', exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 5, vehicle_id: 5, parking_space_id: 13, parking_type: '月租停车', charge_rule_id: null, rental_contract_id: 3, entry_time: '2026-10-22 06:55:00', exit_time: null, duration_minutes: null, amount_due: 0, record_status: '在场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 6, vehicle_id: 6, parking_space_id: 12, parking_type: '临时停车', charge_rule_id: 1, rental_contract_id: null, entry_time: '2026-10-21 12:12:00', exit_time: '2026-10-21 15:42:00', duration_minutes: 210, amount_due: 32, record_status: '已出场', handled_by_administrator_id: 2, remark: null },
    { parking_record_id: 7, vehicle_id: 1, parking_space_id: 17, parking_type: '临时停车', charge_rule_id: 2, rental_contract_id: null, entry_time: '2026-10-20 15:02:00', exit_time: '2026-10-20 18:00:00', duration_minutes: 178, amount_due: 18, record_status: '已出场', handled_by_administrator_id: 2, remark: null }
  ],
  payment_record: [
    { payment_record_id: 1, payment_no: 'PAY202610220001', payment_type: '月租费', parking_record_id: null, rental_contract_id: 1, amount_due: 980, amount_paid: 980, payment_method: '微信', payment_status: '已支付', paid_at: '2026-10-01 09:12:00', handled_by_administrator_id: 2, remark: null },
    { payment_record_id: 2, payment_no: 'PAY202610210018', payment_type: '临停停车费', parking_record_id: 6, rental_contract_id: null, amount_due: 32, amount_paid: 32, payment_method: '支付宝', payment_status: '已支付', paid_at: '2026-10-21 15:43:00', handled_by_administrator_id: 2, remark: null },
    { payment_record_id: 3, payment_no: 'PAY202610200009', payment_type: '临停停车费', parking_record_id: 7, rental_contract_id: null, amount_due: 18, amount_paid: 18, payment_method: '微信', payment_status: '已支付', paid_at: '2026-10-20 18:21:00', handled_by_administrator_id: 2, remark: null },
    { payment_record_id: 4, payment_no: 'PAY202610190004', payment_type: '月租费', parking_record_id: null, rental_contract_id: 2, amount_due: 880, amount_paid: 880, payment_method: '银行卡', payment_status: '已退款', paid_at: '2026-10-19 11:05:00', handled_by_administrator_id: 3, remark: '合同调整退款' },
    { payment_record_id: 5, payment_no: 'PAY202610220012', payment_type: '月租费', parking_record_id: null, rental_contract_id: 3, amount_due: 980, amount_paid: 0, payment_method: '微信', payment_status: '待支付', paid_at: null, handled_by_administrator_id: 2, remark: null }
  ]
  };
})(window);
/* 模拟数据功能注释结束 */
