// Java 请求适配器功能注释开始
/**
 * 安装统一的 Java HTTP 请求工厂；普通脚本加载时不会发起网络请求。
 * @param {Window} global 当前浏览器窗口。
 * @returns {void} 通过 ParkingApiClient 暴露请求工厂。
 */
(function initializeParkingApiClient(global) {
  'use strict';

  // Java 服务实例创建功能注释开始
  /**
   * 创建 JSON REST 客户端，集中处理超时、空响应和业务错误。
   * @param {string} baseUrl Java API 基址。
   * @param {number} timeoutMs 请求超时毫秒数。
   * @returns {object} 提供 request 和兼容业务方法的客户端。
   */
  function createApiService(baseUrl = '/api', timeoutMs = 10000) {
    // Java HTTP 请求功能注释开始
    /**
     * 发送一次 REST 请求并读取完整响应，错误保留状态码和字段提示。
     * @param {string} path 以斜线开头的 API 相对路径。
     * @param {object} options fetch 选项；body 可传 JSON 对象。
     * @returns {Promise<object|null>} JSON 数据，204 响应返回 null。
     */
    async function request(path, options = {}) {
      const controller = new AbortController();
      const timeout = global.setTimeout(() => controller.abort(), timeoutMs);
      const { headers = {}, body, ...requestOptions } = options;
      try {
        const response = await global.fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
          ...requestOptions,
          signal: controller.signal,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
          body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
        });
        const content = response.status === 204 ? '' : await response.text();
        let result = null;
        if (content) {
          try {
            result = JSON.parse(content);
          } catch (parseError) {
            if (response.ok) throw new Error('Java API 返回了无法解析的 JSON');
          }
        }
        if (!response.ok) {
          const error = new Error(result?.message || `Java API 请求失败：${response.status}`);
          error.status = response.status;
          error.code = result?.code || 'HTTP_ERROR';
          error.field_errors = result?.field_errors || {};
          throw error;
        }
        return result;
      } catch (error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Java API 请求超时');
          timeoutError.code = 'REQUEST_TIMEOUT';
          throw timeoutError;
        }
        throw error;
      } finally {
        global.clearTimeout(timeout);
      }
    }
    // Java HTTP 请求功能注释结束

    return {
      request,
      getDashboardSummary: () => request('/dashboard/summary'),
      createParkingRecord: (payload) => request('/parking-records', { method: 'POST', body: payload })
    };
  }
  // Java 服务实例创建功能注释结束

  global.ParkingApiClient = Object.freeze({ createApiService });
})(window);
// Java 请求适配器功能注释结束
