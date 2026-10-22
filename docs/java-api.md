# Java REST API 约定

本约定对应 `js/services/parking-service.js`。前端以普通脚本运行，改动 [js/config.js](../js/config.js) 的 `serviceMode` 为 `java` 并设置 `apiBaseUrl` 后调用 Java 服务。页面使用 snake_case JSON 字段，浏览器演示存储不会在 Java 模式读写或重置后端数据。

## 基本规则

- 基址默认 `http://localhost:8080/api`。允许开发环境配置 CORS；部署时推荐由同源反向代理转发。
- 主键对应数据库 `BIGINT UNSIGNED`。JSON 输入/输出建议以十进制字符串传主键，避免浏览器 `Number` 超过安全整数范围。金额对应 `DECIMAL(10,2)`，范围 `0` 至 `99999999.99`，采用数字或十进制字符串；前端约束最多两位小数。
- 日期使用 `YYYY-MM-DD`，时间使用 `YYYY-MM-DD HH:mm:ss`。双方统一使用 `Asia/Shanghai`；时间戳不带 `Z`，不得混入 UTC 日期转换。
- 管理员主键由已认证会话补齐，不接受浏览器传入的办理人身份作为授权依据。Java 必须自行校验角色权限、状态、关联和金额。
- 错误响应使用 `{ "code": "VALIDATION_ERROR", "message": "说明", "field_errors": { "field_name": "说明" } }`。状态码：400/422 输入错误、401 未认证、403 无权限、404 不存在、409 唯一/占用/状态冲突、5xx 服务故障。成功返回 JSON；删除及无内容更新可返回 204。

## 资源路由

| 资源 | 路径 | 主键字段 |
| --- | --- | --- |
| 管理员 | `/administrators` | `administrator_id` |
| 车主 | `/vehicle-owners` | `owner_id` |
| 车位 | `/parking-spaces` | `parking_space_id` |
| 车辆 | `/vehicles` | `vehicle_id` |
| 收费规则 | `/charge-rules` | `charge_rule_id` |
| 月租合同 | `/rental-contracts` | `rental_contract_id` |
| 停车记录 | `/parking-records` | `parking_record_id` |
| 缴费记录 | `/payment-records` | `payment_record_id` |

每种资源支持 `GET /{resource}?q=&filters={JSON}&sort_by=&sort_order=asc&page=1&page_size=20`、`GET /{resource}/{id}`、`POST /{resource}`、`PATCH /{resource}/{id}`。列表统一返回 `{ "items": [], "total": 0, "page": 1, "page_size": 20 }`。`filters` 是 JSON 对象，字段应按资源白名单过滤；排序字段必须由服务端白名单限制。DELETE 只用于未引用的基础资料，停车和缴费流水保留历史。

## 业务操作

- `POST /parking-records` 创建入场记录。成功响应完整 `parking_record`；同车、同位并发入场必须加锁检查，并在同一数据库事务中创建记录、占用车位。
- `POST /parking-records/{id}/exit` 请求体可含 `exit_time`；服务端计算 `duration_minutes`、金额，更新记录并释放车位，全部放在同一事务中。收费不足一小时按整小时；每连续 24 小时封顶金额不得高于 24 小时费率总额；最低收费优先于封顶，故 `minimum_charge > daily_cap` 时最低收费胜出。
- `POST /payment-records` 建立待支付流水，初始 `amount_paid=0`、`paid_at=null`。流水必须且只关联停车记录或月租合同，且类型与归属一致；临停应收额须与已出场停车记录一致。
- `POST /payment-records/{id}/pay` 收款；`POST /payment-records/{id}/refund` 退款。待支付只能转已支付，已支付才能退款。退款仅更新 `payment_status` 和可选说明，保留原实收金额及支付时间供审计。收入只统计已支付记录。
- `GET /dashboard/summary` 返回总览 DTO：`metrics`、`occupancy`、`current_records`、`vehicles`、`owners`、`spaces`、`contracts`、`expiring_contracts`、`revenue_history`。零收入必须返回 `0`，不能以假值替代。

## 必须由服务端保障的规则

SQL 强制状态、类型、唯一键、外键、CHECK、时长/金额、支付字段联动；应用事务还须保证同车同位不可重复在场、同车生效合同日期不重叠、车位状态与停车记录同步。停车和缴费记录不可物理删除。前端校验只用于即时反馈，不可代替服务端事务校验。

`sql/停车场管理数据库.sql` 的 `chk_charge_rule_daily_cap` 要求 `daily_cap IS NULL OR daily_cap > 0`；字段说明汇总中的 `>= 0` 是笔误，实现与可执行 SQL 约束一致。
