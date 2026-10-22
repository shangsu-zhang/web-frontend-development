// 公共界面工具功能注释开始
/**
 * 组装原生 DOM、表格、表单和 CSV 导出工具，供各业务页面复用。
 * @param {Window} global 浏览器窗口。
 * @returns {void} 将工具发布到 window.ParkingUI，不读取模拟集合。
 */
(function initializeUi(global) {
  'use strict';

  // 动态文本转义功能注释开始
  /** @param {*} value 任意显示值。@returns {string} 可安全放入 HTML 文本和属性的字符串。 */
  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function replaceEntity(character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
  // 动态文本转义功能注释结束

  // 金额显示功能注释开始
  /** @param {number|string} value 金额。@returns {string} 两位小数的人民币文本。 */
  function money(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  }
  // 金额显示功能注释结束

  // 业务日期读取功能注释开始
  /** @returns {string} 与服务层一致的 YYYY-MM-DD 业务日期。 */
  function today() {
    return global.parkingService.getBusinessDate();
  }
  // 业务日期读取功能注释结束

  // 本地时间格式转换功能注释开始
  /** @returns {string} 可作为 datetime-local 控件默认值的本地时间。 */
  function dateTimeNow() {
    const date = new Date();
    const pad = function padNumber(value) { return String(value).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
  // 本地时间格式转换功能注释结束

  // 状态标签功能注释开始
  /** @param {string} value 数据库状态值。@returns {string} 已转义、同时包含文字的状态标签。 */
  function badge(value) {
    const positive = ['正常', '启用', '可用', '生效', '已支付', '已出场'];
    const warning = ['在场', '占用', '待支付', '临时停车'];
    const tone = positive.includes(value) ? 'positive' : warning.includes(value) ? 'warning' : 'muted';
    return '<span class="status-badge ' + tone + '">' + escape(value || '未设置') + '</span>';
  }
  // 状态标签功能注释结束

  // 操作通知功能注释开始
  /** @param {string} message 反馈文字。@returns {void} 在 aria-live 区域显示短通知。 */
  function notify(message) {
    const region = document.getElementById('toast-region');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);
    global.setTimeout(function removeToast() { toast.remove(); }, 3600);
  }
  // 操作通知功能注释结束

  // 完整资源分页读取功能注释开始
  /** @param {string} resource 服务资源名。@returns {Promise<object[]>} 全部记录的响应副本。 */
  async function all(resource) {
    const rows = [];
    let page = 1;
    let total;
    do {
      const result = await global.parkingService.list(resource, { page: page, pageSize: 100 });
      if (!result || !Array.isArray(result.items) || !Number.isFinite(Number(result.total))) throw new Error('列表响应格式不正确');
      rows.push.apply(rows, result.items);
      total = Number(result.total);
      if (!result.items.length && rows.length < total) throw new Error('列表分页未返回完整数据，请重试');
      page += 1;
    } while (rows.length < total);
    return rows;
  }
  // 完整资源分页读取功能注释结束

  // 通用数据表功能注释开始
  /**
   * @param {object[]} columns 列定义；render(row) 需自行转义动态内容。
   * @param {object[]} rows 行数据。
   * @returns {string} 带表头及空状态的表格 HTML；普通 key 列自动转义。
   */
  function table(columns, rows) {
    const heading = columns.map(function renderHeading(column) { return '<th scope="col">' + escape(column.label) + '</th>'; }).join('');
    const body = rows.length ? rows.map(function renderRow(row) {
      return '<tr>' + columns.map(function renderCell(column) {
        const value = typeof column.render === 'function' ? column.render(row) : escape(row[column.key] == null ? '—' : row[column.key]);
        return '<td>' + value + '</td>';
      }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + columns.length + '" class="empty-state">没有符合条件的记录</td></tr>';
    return '<div class="table-wrap" tabindex="0" role="region" aria-label="数据表，可横向滚动"><table class="data-table"><thead><tr>' + heading + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  // 通用数据表功能注释结束

  // 模态窗口生命周期功能注释开始
  /** @param {string} title 标题。@returns {HTMLDialogElement} 已挂载的原生对话框。 */
  function createDialog(title) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';
    dialog.innerHTML = '<div class="dialog-heading"><h2 id="dialog-title"></h2><button type="button" class="icon-button" data-dialog-close aria-label="关闭对话框" title="关闭">×</button></div><div class="dialog-content"></div>';
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('[data-dialog-close]').onclick = function closeDialog() { dialog.close(); };
    document.body.appendChild(dialog);
    return dialog;
  }
  // 模态窗口生命周期功能注释结束

  // 表单字段生成功能注释开始
  /** @param {object} field 字段定义。@param {*} value 初值。@returns {string} 含标签和辅助说明的控件 HTML。 */
  function renderField(field, value) {
    const type = field.type || 'text';
    const id = 'field-' + field.name;
    let attributes = ' id="' + escape(id) + '" name="' + escape(field.name) + '"';
    ['min', 'max', 'step', 'maxLength', 'pattern', 'placeholder'].forEach(function addAttribute(name) {
      if (field[name] != null) attributes += ' ' + name.toLowerCase() + '="' + escape(field[name]) + '"';
    });
    if (field.required) attributes += ' required';
    if (field.readOnly) attributes += ' readonly';
    if (field.help) attributes += ' aria-describedby="help-' + escape(field.name) + '"';
    let control;
    if (type === 'select') {
      control = '<select' + attributes + '><option value="">请选择</option>' + (field.options || []).map(function renderOption(option) {
        return '<option value="' + escape(option.value) + '"' + (String(option.value) === String(value) ? ' selected' : '') + '>' + escape(option.label) + '</option>';
      }).join('') + '</select>';
    } else if (type === 'textarea') {
      control = '<textarea rows="3"' + attributes + '>' + escape(value) + '</textarea>';
    } else {
      const formatted = type === 'datetime-local' && value ? String(value).replace(' ', 'T') : value;
      control = '<input type="' + escape(type) + '"' + attributes + ' value="' + escape(formatted) + '">';
    }
    return '<div class="field' + (type === 'textarea' ? ' field-wide' : '') + '" data-field-name="' + escape(field.name) + '"><label for="' + escape(id) + '">' + escape(field.label) + (field.required ? ' <span aria-hidden="true">*</span>' : '') + '</label>' + control + (field.help ? '<small id="help-' + escape(field.name) + '">' + escape(field.help) + '</small>' : '') + '</div>';
  }
  // 表单字段生成功能注释结束

  // 通用业务表单功能注释开始
  /**
   * 保留浏览器原生校验，业务错误在表单内持续显示；提交期间防止重复点击。
   * @param {object} options title/fields/values/onSubmit 等配置。
   * @returns {Promise<*>} 成功时返回 onSubmit 结果；取消时返回 null。
   */
  function openForm(options) {
    return new Promise(function waitForForm(resolve) {
      const dialog = createDialog(options.title);
      const fields = options.fields || [];
      const values = options.values || {};
      const content = dialog.querySelector('.dialog-content');
      content.innerHTML = (options.description ? '<p class="page-description">' + escape(options.description) + '</p>' : '') + '<form><div class="form-grid">' + fields.map(function createField(field) { return renderField(field, values[field.name] == null ? '' : values[field.name]); }).join('') + '</div><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-cancel>取消</button><button type="submit" class="button button-primary">' + escape(options.submitText || '保存') + '</button></div></form>';
      const form = content.querySelector('form');
      const submit = form.querySelector('[type="submit"]');
      const errorBox = form.querySelector('.form-error');
      let busy = false;
      let result = null;
      // 表单值采集功能注释开始
      /** @returns {object} 当前可见字段数据；number 控件转换为数值，空值保留空字符串。 */
      function collectValues() {
        const payload = {};
        fields.forEach(function readField(field) {
          const control = form.elements.namedItem(field.name);
          if (!control || control.disabled) return;
          const value = control.value.trim();
          payload[field.name] = field.type === 'number' && value !== '' ? Number(value) : value;
        });
        return payload;
      }
      // 表单值采集功能注释结束

      // 条件控件联动功能注释开始
      /** @returns {void} 隐藏无关外键并禁用其 required，避免互斥字段错误提交。 */
      function updateFields() {
        const current = {};
        fields.forEach(function readCurrent(field) { current[field.name] = form.elements.namedItem(field.name).value; });
        fields.forEach(function applyVisibility(field) {
          if (typeof field.showWhen !== 'function') return;
          const visible = field.showWhen(current);
          const control = form.elements.namedItem(field.name);
          form.querySelector('[data-field-name="' + field.name + '"]').hidden = !visible;
          control.disabled = !visible;
          control.required = !!field.required && visible;
        });
        if (typeof options.onChange === 'function') options.onChange(form, current);
      }
      // 条件控件联动功能注释结束

      // 业务表单提交功能注释开始
      /** @param {SubmitEvent} event 提交事件。@returns {Promise<void>} 完成一次业务提交。 */
      async function submitForm(event) {
        event.preventDefault();
        if (busy || !form.reportValidity()) return;
        busy = true;
        submit.disabled = true;
        submit.textContent = '正在保存…';
        errorBox.hidden = true;
        try {
          result = await options.onSubmit(collectValues());
          global.dispatchEvent(new CustomEvent('parking-data-changed'));
          dialog.close();
        } catch (error) {
          errorBox.textContent = error.message || '操作失败，请重试';
          errorBox.hidden = false;
          errorBox.scrollIntoView({ block: 'nearest' });
        } finally {
          busy = false;
          submit.disabled = false;
          submit.textContent = options.submitText || '保存';
        }
      }
      // 业务表单提交功能注释结束
      form.onsubmit = submitForm;
      form.onchange = updateFields;
      form.querySelector('[data-cancel]').onclick = function cancelForm() { if (!busy) dialog.close(); };
      dialog.addEventListener('cancel', function cancelWithEscape(event) { if (busy) event.preventDefault(); });
      dialog.querySelector('[data-dialog-close]').onclick = function closeForm() { if (!busy) dialog.close(); };
      dialog.addEventListener('close', function disposeForm() { dialog.remove(); resolve(result); }, { once: true });
      updateFields();
      dialog.showModal();
    });
  }
  // 通用业务表单功能注释结束

  // 记录详情展示功能注释开始
  /** @param {string} title 标题。@param {Array[]} rows [中文字段名,值]。@returns {void} 展示自动转义的字段详情。 */
  function showDetail(title, rows) {
    const dialog = createDialog(title);
    dialog.querySelector('.dialog-content').innerHTML = '<dl class="detail-grid">' + rows.map(function renderDetail(row) {
      return '<div><dt>' + escape(row[0]) + '</dt><dd>' + escape(row[1] == null || row[1] === '' ? '—' : row[1]) + '</dd></div>';
    }).join('') + '</dl><div class="dialog-actions"><button type="button" class="button button-secondary" data-detail-close>关闭</button></div>';
    dialog.querySelector('[data-detail-close]').onclick = function closeDetail() { dialog.close(); };
    dialog.addEventListener('close', function disposeDetail() { dialog.remove(); }, { once: true });
    dialog.showModal();
  }
  // 记录详情展示功能注释结束

  // CSV 文件导出功能注释开始
  /**
   * @param {string} filename 下载名。
   * @param {string[]} headings CSV 列名。
   * @param {Array[]} rows 二维数据，保持数字值与显示文本分离。
   * @returns {void} 生成 UTF-8 BOM 文件；防止文本被电子表格识别成公式。
   */
  function exportCsv(filename, headings, rows) {
    // CSV 单元格编码功能注释开始
    /** @param {*} value 单元格原值。@returns {string} 符合 CSV 引号规则的字段。 */
    function encodeCell(value) {
      let text = String(value == null ? '' : value);
      if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    // CSV 单元格编码功能注释结束
    const csv = [headings].concat(rows).map(function encodeRow(row) { return row.map(encodeCell).join(','); }).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    global.setTimeout(function releaseDownload() { URL.revokeObjectURL(url); }, 1000);
  }
  // CSV 文件导出功能注释结束

  global.ParkingUI = { escape: escape, money: money, today: today, dateTimeNow: dateTimeNow, badge: badge, notify: notify, all: all, table: table, openForm: openForm, showDetail: showDetail, exportCsv: exportCsv };
})(window);
// 公共界面工具功能注释结束
