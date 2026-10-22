// 应用运行配置功能注释开始
/**
 * 集中声明前端模拟模式、Java 接口地址及本地保存版本。
 * @type {{serviceMode: string, apiBaseUrl: string, requestTimeoutMs: number, storageKey: string, storageVersion: number}}
 */
(function initializeParkingConfig(global) {
  'use strict';

  global.ParkingConfig = Object.freeze({
    serviceMode: 'mock',
    apiBaseUrl: 'http://localhost:8080/api',
    requestTimeoutMs: 10000,
    storageKey: 'parking-management.demo.v1',
    storageVersion: 1
  });
})(window);
// 应用运行配置功能注释结束
