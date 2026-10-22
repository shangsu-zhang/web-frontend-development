// 服务兼容入口功能注释开始
/**
 * 为旧页面保留普通脚本入口；主服务由 parking-service.js 统一安装。
 * @param {Window} global 当前浏览器窗口。
 * @returns {void} 服务已加载时不重复创建实例。
 */
(function exposeParkingService(global) {
  'use strict';
  if (!global.parkingService) throw new Error('请先加载 parking-service.js');
})(window);
// 服务兼容入口功能注释结束
