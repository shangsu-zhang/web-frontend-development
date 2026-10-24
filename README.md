# 停车场管理前端

停车场管理数据库项目的原生 HTML、CSS、JavaScript 前端，按课程要求实现八张已审核数据表的管理、停车和缴费业务及 11 项 SQL 查询统计。当前使用浏览器本地模拟数据，不连接数据库或 Java 服务；Java REST 资源、字段和操作接口由适配层预留。界面和代码以 0506 课堂笔记中的基础内容为主体，扩展知识映射见 `docs/learning-baseline.md`。

## 运行

直接打开 `index.html` 即可运行，不需要 Python、npm、构建过程、数据库或后端。页面使用相对路径加载本地 CSS 和普通 JavaScript，静态资源不需要网络。

## 数据与服务

- `js/mock-data.js`：八张表的初始模拟数据。
- `js/services/parking-service.js`：字段校验、CRUD、进出场计费、收款、退款、统计聚合和演示数据保存。
- `js/services/api-client.js`：Java REST 请求、超时与统一错误解析。
- `js/config.js`：当前 `serviceMode` 为 `mock`；后端准备好后配置为 `java` 并设置 API 基址。
- `js/pages/`：基础资料、停车业务和查询统计页面脚本；`js/ui.js` 提供共用表格、表单和详情工具。

模拟数据默认保存在当前浏览器的 `localStorage`，刷新后继续保留。侧边栏的“重置演示数据”按钮需确认后恢复初始样例。私密真实数据不得写入模拟集合。浏览器无法保存时，页面会提示数据只在当前会话有效。

## 验证

```powershell
node --test tests\service.test.cjs
```

在 Chrome/Edge 直接打开 `index.html`，按顺序检查导航、八表资料页、入场/出场、合同、待支付/收款/退款，以及查询统计页；确认保存、刷新、重置与窄屏显示正常。Java 模式需配合对应 REST 服务，当前不包含后端实现。
