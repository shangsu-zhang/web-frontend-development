// 模拟服务兼容入口功能注释开始
/**
 * 为旧页面保留 mockService 名称，指向统一服务而不复制数据与业务逻辑。
 * @param {Window} global 当前浏览器窗口。
 * @returns {void} 暴露同一个业务服务实例。
 */
(function exposeMockService(global) {
  'use strict';
  if (!global.parkingService) throw new Error('请先加载 parking-service.js');
  global.mockService = global.parkingService;
})(window);
// 模拟服务兼容入口功能注释结束
