import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, saveChat } from "../../../../script.js";

(function () {
  const MODULE_NAME = '外置生成器';

  function ready(fn) {
    if (window.SillyTavern && SillyTavern.getContext) return fn();
    const i = setInterval(() => {
      if (window.SillyTavern && SillyTavern.getContext) {
        clearInterval(i);
        fn();
      }
    }, 200);
    setTimeout(fn, 5000);
  }

  ready(() => {
    try {
      const ctx = SillyTavern.getContext();

      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          apiConfig: {},
          prompts: [],
          chatConfig: { strength: 5, regexList: [] },
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      if (document.getElementById('star-fab')) return;

      // 🌟按钮
      const fab = document.createElement('div');
      fab.id = 'star-fab';
      fab.title = MODULE_NAME + ' (双击重置设置)';
      fab.innerText = '🌟';
      fab.style.cssText = `
        position: fixed;
        z-index: 99999;
        cursor: grab;
        user-select: none;
        font-size: 22px;
        line-height: 28px;
        width: 32px;
        height: 32px;
        text-align: center;
        border-radius: 50%;
        background: transparent;
        box-shadow: none;
      `;

      const savedTop = localStorage.getItem('starFabTop');
      const savedRight = localStorage.getItem('starFabRight');
      if (savedTop && savedRight) {
        fab.style.top = savedTop;
        fab.style.right = savedRight;
      } else {
        fab.style.top = (window.innerHeight / 2 - 16) + 'px';
        fab.style.right = '10px';
      }
      document.body.appendChild(fab);

      // 拖动逻辑
      (function enableFabDrag() {
        let isDragging = false;
        let startX, startY, startTop, startRight;

        function onMove(e) {
          if (!isDragging) return;
          e.preventDefault();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          const dx = clientX - startX;
          const dy = clientY - startY;
          let newTop = startTop + dy;
          let newRight = startRight - dx;
          const maxTop = window.innerHeight - fab.offsetHeight;
          const maxRight = window.innerWidth - fab.offsetWidth;
          newTop = Math.max(0, Math.min(maxTop, newTop));
          newRight = Math.max(0, Math.min(maxRight, newRight));
          fab.style.top = newTop + 'px';
          fab.style.right = newRight + 'px';
        }

        function onEnd() {
          if (!isDragging) return;
          isDragging = false;
          fab.style.cursor = 'grab';
          localStorage.setItem('starFabTop', fab.style.top);
          localStorage.setItem('starFabRight', fab.style.right);
        }

        function onStart(e) {
          isDragging = true;
          startX = e.touches ? e.touches[0].clientX : e.clientX;
          startY = e.touches ? e.touches[0].clientY : e.clientY;
          startTop = parseInt(fab.style.top, 10);
          startRight = parseInt(fab.style.right, 10);
          fab.style.cursor = 'grabbing';
        }

        fab.addEventListener('mousedown', onStart);
        fab.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
      })();

      // 主面板
      const panel = document.createElement('div');
      panel.id = 'star-panel';
      const savedScale = localStorage.getItem('starPanelScale') || 'normal';
      panel.className = `sp-scale-${savedScale}`;

      panel.innerHTML = `
        <div class="sp-panel-header">
          <span class="sp-header-title">🌟 ${MODULE_NAME}</span>
          <div class="sp-header-btns">
            <button class="sp-header-btn" id="sp-settings-btn" title="界面设置">⚙️</button>
            <button class="sp-header-btn" id="sp-close-btn" title="关闭">✕</button>
          </div>
        </div>
        <div class="sp-grid">
          <div class="sp-btn" data-key="api">API配置</div>
          <div class="sp-btn" data-key="system-prompt">系统提示词</div>
          <div class="sp-btn" data-key="prompt">提示词配置</div>
          <div class="sp-btn" data-key="worldbook">世界书配置</div>
          <div class="sp-btn" data-key="random-prompt">随机提示词</div>
          <div class="sp-btn" data-key="random-macro">随机数宏</div>
          <div class="sp-btn" data-key="chat">聊天配置</div>
          <div class="sp-btn" data-key="gen">生成</div>
        </div>
        <div id="sp-content-area" class="sp-subpanel">
          <div class="sp-small">请选择一个功能</div>
        </div>
        <div id="sp-debug" class="sp-debug">[调试面板输出]</div>
      `;
      document.body.appendChild(panel);

      function applySavedPanelSize() {
        const savedHeight = localStorage.getItem('starPanelHeight');
        const savedWidth = localStorage.getItem('starPanelWidth');
        const fullWidthMode = localStorage.getItem('starPanelFullWidth') === '1';
        if (savedHeight) panel.style.maxHeight = savedHeight + 'vh';
        if (fullWidthMode) {
          panel.classList.add('sp-fullwidth');
        } else {
          panel.classList.remove('sp-fullwidth');
          if (savedWidth) {
            const maxWidth = window.innerWidth - 20;
            const width = Math.min(parseInt(savedWidth), maxWidth);
            panel.style.width = width + 'px';
          }
        }
      }
      applySavedPanelSize();

      window.addEventListener('resize', () => {
        if (localStorage.getItem('starPanelFullWidth') !== '1') {
          const maxWidth = window.innerWidth - 20;
          const currentWidth = parseInt(panel.style.width) || 340;
          if (currentWidth > maxWidth) panel.style.width = maxWidth + 'px';
        }
      });

      setTimeout(() => {
        const genBtn = panel.querySelector('.sp-btn[data-key="gen"]');
        if (genBtn) genBtn.click();
      }, 0);

      fab.addEventListener('click', () => {
        if (panel.classList.contains('sp-visible')) {
          panel.classList.remove('sp-visible');
          panel.style.display = 'none';
        } else {
          panel.classList.add('sp-visible');
          panel.style.display = 'flex';
        }
      });

      fab.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('双击检测到！是否重置界面设置？')) {
          localStorage.removeItem('starPanelScale');
          localStorage.removeItem('starPanelHeight');
          localStorage.removeItem('starPanelWidth');
          localStorage.removeItem('starPanelFullWidth');
          panel.className = 'sp-scale-normal';
          panel.classList.remove('sp-fullwidth');
          panel.style.maxHeight = '85vh';
          panel.style.width = '340px';
          alert('界面设置已重置！');
        }
      });

      document.getElementById('sp-close-btn').addEventListener('click', () => {
        panel.classList.remove('sp-visible');
        panel.style.display = 'none';
      });

      document.getElementById('sp-settings-btn').addEventListener('click', () => {
        showSettingsPanel();
      });

      function debugLog(...args) {
        const dbg = document.getElementById('sp-debug');
        if (dbg) dbg.innerText = args.join(' ');
        if (window.DEBUG_STAR_PANEL) console.log('[pyq-creator]', ...args);
      }

      const content = panel.querySelector('#sp-content-area');

      // ========== 排序辅助函数 ==========
      const POS_LABELS = { 0: '前', 1: '后', 2: '顶', 3: '底', 4: '深' };
      const POS_WEIGHT = { 2: 0, 0: 1, 1: 2, 4: 3, 3: 4 };

      function getSortInfo(entry, id) {
        const pos = entry.position !== undefined ? parseInt(entry.position) : 1;
        const order = entry.order ?? entry.position ?? parseInt(id) ?? 9999;
        const weight = POS_WEIGHT[pos] !== undefined ? POS_WEIGHT[pos] : 99;
        return { pos, order, weight };
      }

      function compareEntries(a, b) {
        if (a.sortInfo.weight !== b.sortInfo.weight) {
          return a.sortInfo.weight - b.sortInfo.weight;
        }
        return a.sortInfo.order - b.sortInfo.order;
      }

      // ========== 世界书内容清洗函数 ==========
      function sanitizeWorldbookContent(content) {
        if (!content || typeof content !== 'string') return '';
        let cleaned = content;
        const systemPatterns = [
          /\[System[^\]]*\]/gi,
          /\{\{system[^\}]*\}\}/gi,
          /<<system[^>]*>>/gi,
          /#\s*system\s*:/gi,
          /\[OOC[^\]]*\]/gi,
          /\(OOC[^\)]*\)/gi,
        ];
        systemPatterns.forEach(pattern => {
          cleaned = cleaned.replace(pattern, '');
        });
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        return cleaned.trim();
      }

      // ========== 界面设置面板 ==========
      function showSettingsPanel() {
        const content = document.getElementById('sp-content-area');
        const currentScale = localStorage.getItem('starPanelScale') || 'normal';
        const maxWidth = Math.min(500, window.innerWidth - 20);
        const currentWidth = Math.min(parseInt(localStorage.getItem('starPanelWidth') || '340'), maxWidth);
        const fullWidthMode = localStorage.getItem('starPanelFullWidth') === '1';

        content.innerHTML = `
        <div style="padding: 12px; background: #2a2a3e; border-radius: 8px;">
          <h3 style="color: #A3C956; margin-bottom: 16px;">⚙️ 界面设置</h3>
          <div style="margin-bottom: 12px;">
            <span style="color: #ddd;">界面缩放：</span>
            <select id="sp-scale-select" style="padding: 6px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; width: 100%; margin-top: 4px; box-sizing: border-box;">
              <option value="small" ${currentScale === 'small' ? 'selected' : ''}>小</option>
              <option value="normal" ${currentScale === 'normal' ? 'selected' : ''}>标准</option>
              <option value="large" ${currentScale === 'large' ? 'selected' : ''}>大</option>
              <option value="xlarge" ${currentScale === 'xlarge' ? 'selected' : ''}>超大</option>
            </select>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #ddd;">面板高度：</span>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <input type="range" id="sp-height-slider" min="50" max="95" value="${parseInt(localStorage.getItem('starPanelHeight') || '85')}" style="flex: 1;">
              <span id="sp-height-value" style="color: #A3C956; min-width: 45px;">${localStorage.getItem('starPanelHeight') || '85'}%</span>
            </div>
          </div>
          <div style="margin-bottom: 12px; padding: 10px; background: #3a3a4e; border-radius: 6px;">
            <label style="display: flex; align-items: center; gap: 8px; color: #ddd; cursor: pointer;">
              <input type="checkbox" id="sp-fullwidth-toggle" ${fullWidthMode ? 'checked' : ''} style="width: 18px; height: 18px;">
              <span>📱 全屏宽度模式</span>
            </label>
          </div>
          <div id="sp-width-container" style="margin-bottom: 12px; ${fullWidthMode ? 'opacity: 0.5; pointer-events: none;' : ''}">
            <span style="color: #ddd;">面板宽度：</span>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <input type="range" id="sp-width-slider" min="260" max="${maxWidth}" value="${currentWidth}" style="flex: 1;">
              <span id="sp-width-value" style="color: #A3C956; min-width: 50px;">${currentWidth}px</span>
            </div>
          </div>
          <button id="sp-reset-settings" style="width: 100%; padding: 10px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px;">恢复默认设置</button>
        </div>
        `;

        document.getElementById('sp-scale-select').addEventListener('change', (e) => {
          const scale = e.target.value;
          localStorage.setItem('starPanelScale', scale);
          panel.className = `sp-scale-${scale}`;
          if (panel.classList.contains('sp-visible')) panel.classList.add('sp-visible');
          if (localStorage.getItem('starPanelFullWidth') === '1') panel.classList.add('sp-fullwidth');
        });

        document.getElementById('sp-height-slider').addEventListener('input', (e) => {
          const height = e.target.value;
          document.getElementById('sp-height-value').textContent = height + '%';
          localStorage.setItem('starPanelHeight', height);
          panel.style.maxHeight = height + 'vh';
        });

        document.getElementById('sp-fullwidth-toggle').addEventListener('change', (e) => {
          const fullWidth = e.target.checked;
          localStorage.setItem('starPanelFullWidth', fullWidth ? '1' : '0');
          const widthContainer = document.getElementById('sp-width-container');
          if (fullWidth) {
            panel.classList.add('sp-fullwidth');
            widthContainer.style.opacity = '0.5';
            widthContainer.style.pointerEvents = 'none';
          } else {
            panel.classList.remove('sp-fullwidth');
            widthContainer.style.opacity = '1';
            widthContainer.style.pointerEvents = 'auto';
            const savedWidth = localStorage.getItem('starPanelWidth') || '340';
            panel.style.width = savedWidth + 'px';
          }
        });

        document.getElementById('sp-width-slider').addEventListener('input', (e) => {
          const width = e.target.value;
          document.getElementById('sp-width-value').textContent = width + 'px';
          localStorage.setItem('starPanelWidth', width);
          if (localStorage.getItem('starPanelFullWidth') !== '1') panel.style.width = width + 'px';
        });

        document.getElementById('sp-reset-settings').addEventListener('click', () => {
          localStorage.removeItem('starPanelScale');
          localStorage.removeItem('starPanelHeight');
          localStorage.removeItem('starPanelWidth');
          localStorage.removeItem('starPanelFullWidth');
          panel.className = 'sp-scale-normal sp-visible';
          panel.classList.remove('sp-fullwidth');
          panel.style.maxHeight = '85vh';
          panel.style.width = '340px';
          showSettingsPanel();
        });
      }

      // ========== API配置面板 ==========
      function showApiConfig() {
        const content = document.getElementById("sp-content-area");
        const API_CONFIGS_KEY = 'friendCircleApiConfigs';
        let savedConfigs = [];
        try { savedConfigs = JSON.parse(localStorage.getItem(API_CONFIGS_KEY) || '[]'); } catch { savedConfigs = []; }

        content.innerHTML = `
          <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
            <h3 style="color: #A3C956; margin-bottom: 12px;">🔌 API配置</h3>
            <div style="margin-bottom: 12px;">
              <label style="color: #ddd; display: block; margin-bottom: 4px;">📁 已保存配置:</label>
              <select id="sp-api-saved-configs" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
                <option value="">-- 选择已保存的配置 --</option>
              </select>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button id="sp-api-load-config" style="flex: 1; padding: 6px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">加载</button>
                <button id="sp-api-delete-config" style="flex: 1; padding: 6px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
              </div>
            </div>
            <hr style="border-color: #588254; margin: 12px 0;">
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              配置名称:
              <input type="text" id="sp-api-config-name" placeholder="给这个配置起个名字" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;">
            </label>
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              API URL:
              <input type="text" id="sp-api-url-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;">
            </label>
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              API Key:
              <input type="text" id="sp-api-key-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;">
            </label>
            <label style="color: #ddd; display: block; margin-bottom: 4px;">模型:</label>
            <div class="sp-api-row" style="display: flex; gap: 6px; margin-bottom: 8px; align-items: center;">
              <div style="flex: 1; min-width: 0;">
                <select id="sp-api-model-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box; display: block;"></select>
                <input type="text" id="sp-api-manual-model" placeholder="输入模型ID，如 gpt-4" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #A3C956; background: #5B6262; color: #fff; box-sizing: border-box; display: none;">
              </div>
              <button id="sp-api-toggle-manual" title="切换：列表选择 / 手动输入" style="width: 34px; height: 34px; padding: 0; background: #6B5B95; color: white; border: none; border-radius: 4px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">✏️</button>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
              <button id="sp-api-save-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">保存当前</button>
              <button id="sp-api-save-as-new" style="flex: 1; min-width: 80px; padding: 8px; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">存为新配置</button>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
              <button id="sp-api-test-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">测试</button>
              <button id="sp-api-refresh-models-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新模型</button>
            </div>
            <div id="sp-api-status" style="margin-top:8px;font-size:12px;color:#A3C956;"></div>
          </div>
        `;

        const modelSelect = document.getElementById("sp-api-model-select");
        const manualModelInput = document.getElementById("sp-api-manual-model");
        const toggleBtn = document.getElementById("sp-api-toggle-manual");
        const savedConfigsSelect = document.getElementById("sp-api-saved-configs");
        let isManualMode = false;

        function populateSavedConfigs() {
          savedConfigsSelect.innerHTML = '<option value="">-- 选择已保存的配置 --</option>';
          savedConfigs.forEach((config, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = config.name || `配置 ${idx + 1}`;
            savedConfigsSelect.appendChild(opt);
          });
        }

        document.getElementById("sp-api-url-input").value = localStorage.getItem("independentApiUrl") || "";
        document.getElementById("sp-api-key-input").value = localStorage.getItem("independentApiKey") || "";
        const savedModel = localStorage.getItem("independentApiModel");

        function populateModelSelect(models) {
          modelSelect.innerHTML = "";
          const uniq = Array.from(new Set(models || []));
          uniq.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
          });
          if (savedModel) {
            let existing = Array.from(modelSelect.options).find(o => o.value === savedModel);
            if (existing) {
              existing.textContent = savedModel + " (当前)";
              modelSelect.value = savedModel;
            } else {
              const opt = document.createElement("option");
              opt.value = savedModel;
              opt.textContent = savedModel + " (当前)";
              modelSelect.insertBefore(opt, modelSelect.firstChild);
              modelSelect.value = savedModel;
            }
          } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
          }
        }

        const storedModelsRaw = localStorage.getItem("independentApiModels");
        if (storedModelsRaw) {
          try {
            const arr = JSON.parse(storedModelsRaw);
            if (Array.isArray(arr)) populateModelSelect(arr);
          } catch {}
        } else if (savedModel) {
          const opt = document.createElement("option");
          opt.value = savedModel;
          opt.textContent = savedModel + " (当前)";
          modelSelect.appendChild(opt);
          modelSelect.value = savedModel;
        }

        populateSavedConfigs();

        toggleBtn.addEventListener("click", () => {
          isManualMode = !isManualMode;
          if (isManualMode) {
            modelSelect.style.display = "none";
            manualModelInput.style.display = "block";
            toggleBtn.innerHTML = "📋";
            toggleBtn.style.background = "#588254";
            if (modelSelect.value) manualModelInput.value = modelSelect.value;
            manualModelInput.focus();
          } else {
            manualModelInput.style.display = "none";
            modelSelect.style.display = "block";
            toggleBtn.innerHTML = "✏️";
            toggleBtn.style.background = "#6B5B95";
            if (manualModelInput.value.trim()) {
              const manualValue = manualModelInput.value.trim();
              const exists = Array.from(modelSelect.options).some(o => o.value === manualValue);
              if (!exists) {
                const opt = document.createElement("option");
                opt.value = manualValue;
                opt.textContent = manualValue + " (手动)";
                modelSelect.insertBefore(opt, modelSelect.firstChild);
              }
              modelSelect.value = manualValue;
            }
          }
        });

        function getCurrentModel() {
          if (isManualMode) return manualModelInput.value.trim();
          return modelSelect.value;
        }

        document.getElementById("sp-api-load-config").addEventListener("click", () => {
          const idx = savedConfigsSelect.value;
          if (idx === "") return alert("请先选择一个配置");
          const config = savedConfigs[parseInt(idx)];
          if (!config) return;
          document.getElementById("sp-api-config-name").value = config.name || "";
          document.getElementById("sp-api-url-input").value = config.url || "";
          document.getElementById("sp-api-key-input").value = config.key || "";
          if (config.model) {
            manualModelInput.value = config.model;
            const exists = Array.from(modelSelect.options).some(o => o.value === config.model);
            if (!exists) {
              const opt = document.createElement("option");
              opt.value = config.model;
              opt.textContent = config.model;
              modelSelect.insertBefore(opt, modelSelect.firstChild);
            }
            modelSelect.value = config.model;
          }
          document.getElementById("sp-api-status").textContent = `✅ 已加载配置: ${config.name}`;
        });

        document.getElementById("sp-api-delete-config").addEventListener("click", () => {
          const idx = savedConfigsSelect.value;
          if (idx === "") return alert("请先选择一个配置");
          const config = savedConfigs[parseInt(idx)];
          if (!confirm(`确定删除配置 "${config.name}" 吗？`)) return;
          savedConfigs.splice(parseInt(idx), 1);
          localStorage.setItem(API_CONFIGS_KEY, JSON.stringify(savedConfigs));
          populateSavedConfigs();
          document.getElementById("sp-api-status").textContent = `✅ 已删除配置`;
        });

        document.getElementById("sp-api-save-btn").addEventListener("click", () => {
          const url = document.getElementById("sp-api-url-input").value.trim();
          const key = document.getElementById("sp-api-key-input").value.trim();
          const model = getCurrentModel();
          if (!url || !key || !model) return alert("请完整填写API信息（URL、Key、模型）");
          localStorage.setItem("independentApiUrl", url);
          localStorage.setItem("independentApiKey", key);
          localStorage.setItem("independentApiModel", model);
          document.getElementById("sp-api-status").textContent = "✅ 已保存为当前使用配置";
        });

        document.getElementById("sp-api-save-as-new").addEventListener("click", () => {
          const nameInput = document.getElementById("sp-api-config-name");
          const name = nameInput ? nameInput.value.trim() : '';
          const url = document.getElementById("sp-api-url-input").value.trim();
          const key = document.getElementById("sp-api-key-input").value.trim();
          const model = getCurrentModel();
          if (!name) { nameInput && nameInput.focus(); return alert("请输入配置名称"); }
          if (!url || !key || !model) return alert("请完整填写API信息（URL、Key、模型）");
          const existingIdx = savedConfigs.findIndex(c => c.name === name);
          if (existingIdx >= 0) {
            if (!confirm(`配置 "${name}" 已存在，是否覆盖？`)) return;
            savedConfigs[existingIdx] = { name, url, key, model };
          } else {
            savedConfigs.push({ name, url, key, model });
          }
          localStorage.setItem(API_CONFIGS_KEY, JSON.stringify(savedConfigs));
          localStorage.setItem("independentApiUrl", url);
          localStorage.setItem("independentApiKey", key);
          localStorage.setItem("independentApiModel", model);
          populateSavedConfigs();
          document.getElementById("sp-api-status").textContent = `✅ 已保存配置: ${name}`;
        });

        document.getElementById("sp-api-test-btn").addEventListener("click", async () => {
          const urlRaw = document.getElementById("sp-api-url-input").value.trim() || localStorage.getItem("independentApiUrl");
          const key = document.getElementById("sp-api-key-input").value.trim() || localStorage.getItem("independentApiKey");
          const model = getCurrentModel() || localStorage.getItem("independentApiModel");
          if (!urlRaw || !key || !model) return alert("请完整填写API信息");
          document.getElementById("sp-api-status").textContent = "正在测试...";
          try {
            const res = await fetch(`${urlRaw.replace(/\/$/, "")}/v1/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 100 })
            });
            if (!res.ok) throw new Error(`返回 ${res.status}`);
            document.getElementById("sp-api-status").textContent = `✅ 模型 ${model} 可用`;
          } catch (e) {
            document.getElementById("sp-api-status").textContent = "❌ 连接失败: " + e.message;
          }
        });

        document.getElementById("sp-api-refresh-models-btn").addEventListener("click", async () => {
          const url = document.getElementById("sp-api-url-input").value.trim() || localStorage.getItem("independentApiUrl");
          const key = document.getElementById("sp-api-key-input").value.trim() || localStorage.getItem("independentApiKey");
          if (!url || !key) return alert("请先填写 URL 和 Key");
          document.getElementById("sp-api-status").textContent = "正在获取模型列表...";
          try {
            const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`, { headers: { Authorization: `Bearer ${key}` } });
            const data = await res.json();
            let ids = [];
            if (Array.isArray(data.data)) ids = data.data.map(m => m.id || m.model || m.name).filter(Boolean);
            else if (Array.isArray(data.models)) ids = data.models.map(m => m.id || m.model || m.name).filter(Boolean);
            else if (Array.isArray(data)) ids = data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (ids.length === 0) throw new Error("未解析到模型");
            localStorage.setItem("independentApiModels", JSON.stringify(ids));
            populateModelSelect(ids);
            if (isManualMode) toggleBtn.click();
            document.getElementById("sp-api-status").textContent = `✅ 已拉取 ${ids.length} 个模型`;
          } catch (e) {
            document.getElementById("sp-api-status").textContent = "❌ 拉取失败: " + e.message + "\n💡 请点击「✏️」切换到手动输入模式";
          }
        });
      }

      // ========== 系统提示词配置 ==========
      function showSystemPromptConfig() {
        const content = document.getElementById('sp-content-area');
        const defaults = {
          systemMain: `你是一个独立的文本处理助手。你的唯一任务是根据<Tasks>中的要求处理文本。

重要规则：
1. 你不是角色扮演AI，不要扮演任何角色
2. 不要续写故事或对话
3. 不要模仿任何写作风格
4. 只执行<Tasks>中明确要求的任务
5. <WorldBook_Reference>和<ChatHistory_Reference>仅作为背景参考，不要基于它们进行创作

接下来你会收到：
- <WorldBook_Reference>：背景参考资料（仅供理解上下文）
- <ChatHistory_Reference>：聊天记录（仅供理解上下文）
- <Tasks>：你需要执行的具体任务`,
          systemMiddle: `以上是参考资料，仅用于帮助你理解上下文。
现在请专注于下面的任务要求，直接输出任务结果：`,
          tasksWrapper: `【重要提醒】
- 只输出任务要求的结果
- 不要续写、扩展或创作新内容
- 不要添加开场白或结束语
- 不要解释你在做什么`,
          assistantPrefill: ``
        };
        const saved = JSON.parse(localStorage.getItem('friendCircleSystemPrompts') || '{}');
        const config = { ...defaults, ...saved };

        content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
          <h3 style="color: #D87E5E; margin-bottom: 12px;">⚙️ 系统提示词</h3>
          <div style="margin-bottom: 12px;">
            <label style="color: #ddd; display: block; margin-bottom: 4px;">
              <span style="color: #A3C956;">❖</span> 主系统提示词
            </label>
            <textarea id="sp-sys-main" rows="6" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; resize: vertical; box-sizing: border-box; min-height: 120px; font-family: inherit; line-height: 1.5;">${config.systemMain}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #ddd; display: block; margin-bottom: 4px;">
              <span style="color: #A3C956;">❖</span> 过渡提示词
            </label>
            <textarea id="sp-sys-middle" rows="2" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; resize: vertical; box-sizing: border-box; font-family: inherit; line-height: 1.5;">${config.systemMiddle}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #ddd; display: block; margin-bottom: 4px;">
              <span style="color: #A3C956;">❖</span> 任务包装后缀
            </label>
            <textarea id="sp-sys-tasks" rows="3" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; resize: vertical; box-sizing: border-box; font-family: inherit; line-height: 1.5;">${config.tasksWrapper}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #ddd; display: block; margin-bottom: 4px;">
              <span style="color: #D87E5E;">❖</span> Assistant预填充
              <span style="color: #888; font-size: 11px; margin-left: 4px;">（可选）</span>
            </label>
            <textarea id="sp-sys-prefill" rows="2" placeholder="留空表示不预填充..." style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px dashed #588254; resize: vertical; box-sizing: border-box; font-family: inherit; line-height: 1.5;">${config.assistantPrefill}</textarea>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
            <button id="sp-sys-save" style="flex: 1; min-width: 100px; padding: 8px; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">保存设定</button>
            <button id="sp-sys-reset" style="padding: 8px 16px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">恢复默认</button>
          </div>
          <div id="sp-sys-status" style="margin-top: 8px; font-size: 12px; color: #A3C956;"></div>
        </div>
        `;

        document.getElementById('sp-sys-save').addEventListener('click', () => {
          const newConfig = {
            systemMain: document.getElementById('sp-sys-main').value,
            systemMiddle: document.getElementById('sp-sys-middle').value,
            tasksWrapper: document.getElementById('sp-sys-tasks').value,
            assistantPrefill: document.getElementById('sp-sys-prefill').value
          };
          localStorage.setItem('friendCircleSystemPrompts', JSON.stringify(newConfig));
          document.getElementById('sp-sys-status').textContent = '✅ 配置已保存！';
        });

        document.getElementById('sp-sys-reset').addEventListener('click', () => {
          if (confirm('确定要恢复默认提示词吗？')) {
            localStorage.removeItem('friendCircleSystemPrompts');
            showSystemPromptConfig();
          }
        });
      }

      // ========== 提示词配置 ==========
      function showPromptConfig() {
        content.innerHTML = `
          <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
            <h3 style="color: #A3C956; margin-bottom: 12px;">📝 固定提示词配置</h3>
            <textarea rows="3" id="sp-prompt-text" placeholder="输入提示词后失焦自动添加" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;"></textarea>
            <div id="sp-prompt-list" style="max-height: 180px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #588254; padding-top: 6px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
              <input type="text" id="sp-prompt-search" placeholder="按标签搜索" style="flex: 1; min-width: 120px; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;">
              <button id="sp-prompt-search-btn" style="padding: 8px 16px; border-radius: 4px; background: #588254; color: white; border: none; cursor: pointer;">搜索</button>
            </div>
            <button id="save-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">保存提示词</button>
          </div>
        `;

        const PROMPTS_KEY = 'friendCircleUserPrompts';
        let friendCirclePrompts = [];
        let promptTagFilter = "";

        function loadUserPrompts() {
          const raw = localStorage.getItem(PROMPTS_KEY);
          friendCirclePrompts = raw ? JSON.parse(raw) : [];
          return friendCirclePrompts;
        }

        function renderPromptList() {
          const container = document.getElementById('sp-prompt-list');
          container.innerHTML = '';
          friendCirclePrompts.forEach((p, idx) => {
            if (promptTagFilter && !(p.tags || []).some(tag => tag.toLowerCase().includes(promptTagFilter))) return;
            const div = document.createElement('div');
            div.style.cssText = 'margin-bottom:8px;border-bottom:1px solid #588254;padding-bottom:6px;';
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = p.enabled || false;
            checkbox.addEventListener('change', () => {
              friendCirclePrompts[idx].enabled = checkbox.checked;
              localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            });

            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ddd;font-size:0.9em;';

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

            const upBtn = document.createElement('button');
            upBtn.textContent = '↑';
            upBtn.title = '上移';
            upBtn.style.cssText = 'padding:4px 6px;background:#5B6262;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            if (idx === 0) upBtn.style.opacity = '0.3';
            upBtn.addEventListener('click', () => {
              if (idx > 0) {
                const temp = friendCirclePrompts[idx];
                friendCirclePrompts[idx] = friendCirclePrompts[idx - 1];
                friendCirclePrompts[idx - 1] = temp;
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
              }
            });

            const downBtn = document.createElement('button');
            downBtn.textContent = '↓';
            downBtn.title = '下移';
            downBtn.style.cssText = 'padding:4px 6px;background:#5B6262;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            if (idx === friendCirclePrompts.length - 1) downBtn.style.opacity = '0.3';
            downBtn.addEventListener('click', () => {
              if (idx < friendCirclePrompts.length - 1) {
                const temp = friendCirclePrompts[idx];
                friendCirclePrompts[idx] = friendCirclePrompts[idx + 1];
                friendCirclePrompts[idx + 1] = temp;
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
              }
            });

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.cssText = 'padding:4px 6px;background:#D87E5E;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            editBtn.addEventListener('click', () => {
              div.innerHTML = '';
              const editContainer = document.createElement('div');
              editContainer.style.cssText = 'display:flex; gap:5px; width:100%; padding:4px;';
              const textarea = document.createElement('textarea');
              textarea.value = p.text;
              textarea.style.cssText = 'flex:1; background:#444; color:#fff; border:1px solid #D87E5E; border-radius:4px; padding:4px; resize:vertical; min-height:40px; font-family:inherit;';
              const actionsDiv = document.createElement('div');
              actionsDiv.style.cssText = 'display:flex; flex-direction:column; gap:4px; justify-content:center;';
              const saveBtn = document.createElement('button');
              saveBtn.textContent = '✅';
              saveBtn.title = '保存';
              saveBtn.style.cssText = 'cursor:pointer; background:#588254; border:none; border-radius:3px; padding:4px; color:white;';
              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = '🔙';
              cancelBtn.title = '取消';
              cancelBtn.style.cssText = 'cursor:pointer; background:#5B6262; border:none; border-radius:3px; padding:4px; color:white;';
              saveBtn.onclick = () => {
                const val = textarea.value.trim();
                if (val) {
                  friendCirclePrompts[idx].text = val;
                  localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                  renderPromptList();
                }
              };
              cancelBtn.onclick = () => { renderPromptList(); };
              actionsDiv.append(saveBtn, cancelBtn);
              editContainer.append(textarea, actionsDiv);
              div.appendChild(editContainer);
            });

            const tagBtn = document.createElement('button');
            tagBtn.textContent = '🏷️';
            tagBtn.style.cssText = 'padding:4px 6px;background:#588254;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            tagBtn.addEventListener('click', () => {
              const newTag = prompt('输入标签:');
              if (newTag) {
                if (!Array.isArray(friendCirclePrompts[idx].tags)) friendCirclePrompts[idx].tags = [];
                friendCirclePrompts[idx].tags.push(newTag);
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
              }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.cssText = 'padding:4px 6px;background:#D87E5E;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            delBtn.addEventListener('click', () => {
              friendCirclePrompts.splice(idx, 1);
              localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
              renderPromptList();
            });

            btnContainer.append(upBtn, downBtn, editBtn, tagBtn, delBtn);
            row.append(checkbox, span, btnContainer);
            div.appendChild(row);

            if (p.tags && p.tags.length > 0) {
              const tagsRow = document.createElement('div');
              tagsRow.style.cssText = 'margin-left:20px;margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;';
              p.tags.forEach((t, tIdx) => {
                const tagEl = document.createElement('span');
                tagEl.textContent = t;
                tagEl.style.cssText = 'padding:2px 6px;font-size:11px;border-radius:10px;background:#588254;color:#fff;cursor:pointer;';
                tagEl.title = '点击删除';
                tagEl.addEventListener('click', () => {
                  friendCirclePrompts[idx].tags.splice(tIdx, 1);
                  localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                  renderPromptList();
                });
                tagsRow.appendChild(tagEl);
              });
              div.appendChild(tagsRow);
            }
            container.appendChild(div);
          });
        }

        document.getElementById('sp-prompt-search-btn').addEventListener('click', () => {
          promptTagFilter = document.getElementById('sp-prompt-search').value.trim().toLowerCase();
          renderPromptList();
        });

        document.getElementById('save-prompts-btn').addEventListener('click', () => {
          localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
          alert('提示词已保存');
        });

        document.getElementById('sp-prompt-text').addEventListener('blur', () => {
          const promptText = document.getElementById('sp-prompt-text').value.trim();
          if (promptText) {
            friendCirclePrompts.push({ text: promptText, enabled: true, tags: [] });
            localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            document.getElementById('sp-prompt-text').value = '';
            renderPromptList();
          }
        });

        loadUserPrompts();
        renderPromptList();
      }

      // ========== 随机提示词配置 ==========
      function showRandomPromptConfig() {
        content.innerHTML = `
          <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
            <h3 style="color: #D87E5E; margin-bottom: 12px;">🎲 随机提示词配置</h3>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 12px;">每次生成时将从已开启的随机抽取1条</p>
            <textarea rows="3" id="sp-random-prompt-text" placeholder="输入随机提示词" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;"></textarea>
            <div id="sp-random-prompt-list" style="max-height: 180px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #588254; padding-top: 6px;"></div>
            <button id="save-random-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background: #D87E5E; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">保存随机提示词</button>
          </div>
        `;

        const RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts';
        let randomPrompts = [];

        function loadRandomPrompts() {
          const raw = localStorage.getItem(RANDOM_PROMPTS_KEY);
          randomPrompts = raw ? JSON.parse(raw) : [];
          return randomPrompts;
        }

        function renderRandomPromptList() {
          const container = document.getElementById('sp-random-prompt-list');
          container.innerHTML = '';
          randomPrompts.forEach((p, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:6px;border-bottom:1px solid #588254;padding-bottom:6px;flex-wrap:wrap;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = p.enabled || false;
            checkbox.addEventListener('change', () => {
              randomPrompts[idx].enabled = checkbox.checked;
              localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
            });
            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ddd;font-size:0.9em;';
            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.cssText = 'padding:4px 6px;background:#D87E5E;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            delBtn.addEventListener('click', () => {
              randomPrompts.splice(idx, 1);
              localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
              renderRandomPromptList();
            });
            div.append(checkbox, span, delBtn);
            container.appendChild(div);
          });
        }

        document.getElementById('save-random-prompts-btn').addEventListener('click', () => {
          localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
          alert('随机提示词已保存');
        });

        document.getElementById('sp-random-prompt-text').addEventListener('blur', () => {
          const promptText = document.getElementById('sp-random-prompt-text').value.trim();
          if (promptText) {
            randomPrompts.push({ text: promptText, enabled: true, tags: [] });
            localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
            document.getElementById('sp-random-prompt-text').value = '';
            renderRandomPromptList();
          }
        });

        loadRandomPrompts();
        renderRandomPromptList();
      }

      // ========== 随机数宏配置 ==========
      function showRandomMacroConfig() {
        content.innerHTML = `
          <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
            <h3 style="color: #A3C956; margin-bottom: 12px;">🎯 随机数宏配置</h3>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 4px;">1. 定义宏: 使用 {{number1}} 等插入随机数。</p>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 4px;">2. 范围: <b>{{random:1-100}}</b> 表示1~100之间的整数。</p>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 12px;">3. 抽选: <b>{{pick:A,B,C}}</b> 或 <b>{{pick:1::100}}</b> 从中随机选一个。</p>
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              <input type="number" id="sp-macro-min" placeholder="最小值" style="flex: 1; min-width: 60px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
              <input type="number" id="sp-macro-max" placeholder="最大值" style="flex: 1; min-width: 60px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
              <button id="sp-add-macro-btn" style="padding: 8px 12px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">添加</button>
            </div>
            <div id="sp-macro-list" style="max-height: 180px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;"></div>
            <button id="sp-save-macros-btn" style="margin-top: 12px; padding: 10px; width: 100%; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">保存配置</button>
          </div>
        `;

        const MACROS_KEY = 'friendCircleRandomMacros';
        let randomMacros = [];

        function loadRandomMacros() {
          const raw = localStorage.getItem(MACROS_KEY);
          randomMacros = raw ? JSON.parse(raw) : [];
          return randomMacros;
        }

        function renderMacroList() {
          const container = document.getElementById('sp-macro-list');
          container.innerHTML = '';
          if (randomMacros.length === 0) {
            container.innerHTML = '<div style="color: #ddd; text-align: center; padding: 20px;">暂无随机数宏</div>';
            return;
          }
          randomMacros.forEach((macro, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;border-bottom:1px solid #588254;padding-bottom:4px;flex-wrap:wrap;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = macro.enabled !== false;
            checkbox.addEventListener('change', () => {
              randomMacros[idx].enabled = checkbox.checked;
              localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
            });
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `{{${macro.name}}}`;
            nameSpan.style.cssText = 'font-weight:bold;color:#A3C956;font-size:12px;';
            const rangeSpan = document.createElement('span');
            rangeSpan.textContent = `[${macro.min}~${macro.max}]`;
            rangeSpan.style.cssText = 'color:#ddd;font-size:11px;flex:1;';
            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.cssText = 'padding:2px 6px;font-size:12px;background:#D87E5E;border:none;border-radius:3px;cursor:pointer;';
            delBtn.addEventListener('click', () => {
              randomMacros.splice(idx, 1);
              localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
              renderMacroList();
            });
            div.append(checkbox, nameSpan, rangeSpan, delBtn);
            container.appendChild(div);
          });
        }

        document.getElementById('sp-add-macro-btn').addEventListener('click', () => {
          const min = parseInt(document.getElementById('sp-macro-min').value, 10);
          const max = parseInt(document.getElementById('sp-macro-max').value, 10);
          if (isNaN(min) || isNaN(max)) return alert('请输入有效数字');
          if (min >= max) return alert('由小到大输入哦');
          const existingNumbers = randomMacros.map(m => m.name.match(/^number(\d+)$/)).filter(Boolean).map(m => parseInt(m[1], 10));
          const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
          randomMacros.push({ name: `number${nextNumber}`, min, max, enabled: true });
          localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
          document.getElementById('sp-macro-min').value = '';
          document.getElementById('sp-macro-max').value = '';
          renderMacroList();
        });

        document.getElementById('sp-save-macros-btn').addEventListener('click', () => {
          localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
          alert('随机数宏配置已保存');
        });

        loadRandomMacros();
        renderMacroList();
      }

      // ========== 聊天配置 ==========
      function showChatConfig() {
        content.innerHTML = `
        <div style="padding:12px; background:#4D4135; color:#fff; border-radius:8px;">
          <h3 style="color: #A3C956; margin-bottom: 12px;">💬 聊天配置</h3>
          <div style="display:flex; align-items:center; margin-bottom:12px; flex-wrap: wrap; gap: 8px;">
            <span style="color: #ddd;">读取聊天条数: </span>
            <input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1; min-width: 100px;">
            <span id="sp-chat-slider-value" style="color: #A3C956; min-width: 30px;">10</span>
          </div>
          <div style="margin-bottom:12px;">
            <h4 style="color: #D87E5E;">正则修剪列表</h4>
            <p style="color:#aaa;font-size:11px;margin-bottom:8px;">支持：标签名(example) 或 完整格式</p>
            <div style="display:flex; gap:6px; margin-bottom:6px; flex-wrap: wrap;">
              <input type="text" id="sp-new-regex" placeholder="example" style="flex:1; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
              <button id="sp-add-regex" style="padding: 8px 12px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">添加</button>
            </div>
            <div id="sp-regex-list" style="max-height:150px; overflow-y:auto; border:1px solid #588254; padding:6px; border-radius:6px; background: #5B6262;"></div>
          </div>
        </div>
        `;

        const sliderInput = document.getElementById('sp-chat-slider');
        const sliderValue = document.getElementById('sp-chat-slider-value');
        const savedCount = localStorage.getItem('friendCircleChatCount');
        if (savedCount) {
          sliderInput.value = savedCount;
          sliderValue.textContent = savedCount;
        }

        sliderInput.addEventListener('input', () => {
          sliderValue.textContent = sliderInput.value;
          localStorage.setItem('friendCircleChatCount', sliderInput.value);
        });

        const regexListContainer = document.getElementById('sp-regex-list');

        function loadRegexList() {
          const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
          regexListContainer.innerHTML = '';
          list.forEach((item, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;margin-bottom:4px;gap:4px;border-bottom:1px solid #588254;padding-bottom:4px;flex-wrap:wrap;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.enabled;
            checkbox.addEventListener('change', () => {
              list[idx].enabled = checkbox.checked;
              localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
            });
            const text = document.createElement('span');
            text.textContent = item.pattern;
            text.style.cssText = 'flex:1;word-break:break-all;color:#ddd;font-size:12px;min-width:0;';
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.style.cssText = 'padding:4px 8px;background:#D87E5E;color:white;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            delBtn.addEventListener('click', () => {
              list.splice(idx, 1);
              localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
              loadRegexList();
            });
            div.append(checkbox, text, delBtn);
            regexListContainer.appendChild(div);
          });
        }

        document.getElementById('sp-add-regex').addEventListener('click', () => {
          const val = document.getElementById('sp-new-regex').value.trim();
          if (!val) return;
          const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
          list.push({ pattern: val, enabled: true });
          localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
          document.getElementById('sp-new-regex').value = '';
          loadRegexList();
        });

        loadRegexList();
      }

      // ========== 世界书配置 ==========
      async function showWorldbookPanel() {
        const STATIC_CONFIG_KEY = 'friendCircleStaticConfig';
        const DYNAMIC_CONFIG_KEY = 'friendCircleDynamicConfig';
        const LAST_WORLDBOOK_KEY = 'friendCircleLastWorldbook';
        const WORLDBOOK_ENABLED_KEY = 'friendCircleWorldbookEnabled';
        const lastState = JSON.parse(localStorage.getItem(LAST_WORLDBOOK_KEY) || '{}');
        const worldbookEnabled = localStorage.getItem(WORLDBOOK_ENABLED_KEY) !== '0';

        content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
          <h3 style="color: #A3C956; margin-bottom: 12px;">📚 世界书配置</h3>

          <div style="margin-bottom: 12px; padding: 10px; background: #3a3a4e; border-radius: 6px; border: 1px solid ${worldbookEnabled ? '#588254' : '#D87E5E'};">
            <label style="display: flex; align-items: center; gap: 8px; color: #ddd; cursor: pointer;">
              <input type="checkbox" id="sp-worldbook-toggle" ${worldbookEnabled ? 'checked' : ''} style="width: 18px; height: 18px;">
              <span style="font-weight: bold;">📚 启用世界书</span>
              <span style="font-size: 11px; color: #888;">（关闭可排查问题）</span>
            </label>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 1;">
              <label style="color: #ddd; display: block; margin-bottom: 4px;">📁 已配置的世界书:</label>
              <select id="sp-configured-books" style="width: 100%; padding: 6px 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;">
                <option value="">-- 选择已配置的世界书 --</option>
              </select>
            </div>
            <div style="display: flex; align-items: flex-end;">
              <button id="sp-delete-book-config" title="删除当前选中的配置" style="padding: 6px 10px; height: 32px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️</button>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <input type="text" id="sp-worldbook-input" placeholder="输入世界书名称" value="${lastState.worldbookName || ''}" style="flex: 1; min-width: 120px; padding: 6px 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;">
            <button id="sp-search-btn" style="padding: 6px 10px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">🔎静态</button>
            <button id="sp-robot-btn" style="padding: 6px 10px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">🤖动态</button>
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
            <label style="color: #ddd;"><input type="checkbox" id="sp-select-all"> 全选</label>
            <label style="color: #ddd;"><input type="checkbox" id="sp-deselect-all"> 全不选</label>
            <label style="color: #ddd;"><input type="checkbox" id="sp-show-disabled"> 显示禁用条目</label>
          </div>
          <div id="sp-entries-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;">
            <div style="color: #ddd; text-align: center;">点击搜索加载条目</div>
          </div>
          <button id="sp-save-config" style="margin-top: 12px; padding: 8px; width: 100%; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">💾 保存配置</button>
          <div id="sp-worldbook-status" style="margin-top: 8px; font-size: 12px; color: #A3C956;"></div>
        </div>
        `;

        document.getElementById('sp-worldbook-toggle').addEventListener('change', (e) => {
          const enabled = e.target.checked;
          localStorage.setItem(WORLDBOOK_ENABLED_KEY, enabled ? '1' : '0');
          const container = e.target.closest('div');
          container.style.borderColor = enabled ? '#588254' : '#D87E5E';
          document.getElementById('sp-worldbook-status').textContent = enabled ? '✅ 世界书已启用' : '⚠️ 世界书已禁用（生成时不会包含世界书内容）';
        });

        let currentWorldbookName = lastState.worldbookName || '';
        let currentFileId = lastState.fileId || '';
        let currentEntries = {};
        let currentMode = lastState.mode || '';
        let currentConfig = {};
        let showDisabled = false;

        let moduleWI;
        try { moduleWI = await import('/scripts/world-info.js'); } catch (e) {
          document.getElementById('sp-worldbook-status').textContent = '❌ world-info.js 加载失败: ' + e.message;
          return;
        }

        function populateConfiguredBooks() {
          const select = document.getElementById('sp-configured-books');
          select.innerHTML = '<option value="">-- 选择已配置的世界书 --</option>';
          const staticConfig = JSON.parse(localStorage.getItem(STATIC_CONFIG_KEY) || '{}');
          const dynamicConfig = JSON.parse(localStorage.getItem(DYNAMIC_CONFIG_KEY) || '{}');
          const allBooks = new Set([...Object.keys(staticConfig), ...Object.keys(dynamicConfig)]);
          allBooks.forEach(bookName => {
            const staticCount = staticConfig[bookName]?.enabledUids?.length || 0;
            const dynamicCount = dynamicConfig[bookName]?.enabledUids?.length || 0;
            const opt = document.createElement('option');
            opt.value = bookName;
            let label = bookName;
            const parts = [];
            if (staticCount > 0) parts.push(`静态:${staticCount}`);
            if (dynamicCount > 0) parts.push(`动态:${dynamicCount}`);
            if (parts.length > 0) label += ` (${parts.join(', ')})`;
            opt.textContent = label;
            if (bookName === currentWorldbookName) opt.selected = true;
            select.appendChild(opt);
          });
        }

        document.getElementById('sp-delete-book-config').addEventListener('click', () => {
          const select = document.getElementById('sp-configured-books');
          const bookName = select.value;
          if (!bookName) return alert('请先选择一个已配置的世界书');
          if (!confirm(`确定删除 "${bookName}" 的配置？`)) return;
          const staticConfig = JSON.parse(localStorage.getItem(STATIC_CONFIG_KEY) || '{}');
          const dynamicConfig = JSON.parse(localStorage.getItem(DYNAMIC_CONFIG_KEY) || '{}');
          if (staticConfig[bookName]) delete staticConfig[bookName];
          if (dynamicConfig[bookName]) delete dynamicConfig[bookName];
          localStorage.setItem(STATIC_CONFIG_KEY, JSON.stringify(staticConfig));
          localStorage.setItem(DYNAMIC_CONFIG_KEY, JSON.stringify(dynamicConfig));
          localStorage.removeItem(LAST_WORLDBOOK_KEY);
          document.getElementById('sp-entries-list').innerHTML = '<div style="color: #ddd; text-align: center;">配置已删除</div>';
          document.getElementById('sp-worldbook-status').textContent = '✅ 配置已删除';
          document.getElementById('sp-worldbook-input').value = '';
          currentWorldbookName = '';
          currentFileId = '';
          currentEntries = {};
          populateConfiguredBooks();
        });

        function getEntryDisplayName(entry, id) {
          if (entry.comment && entry.comment.trim()) return entry.comment.trim();
          if (entry.title && entry.title.trim()) return entry.title.trim();
          if (entry.name && entry.name.trim()) return entry.name.trim();
          if (entry.key) {
            if (Array.isArray(entry.key)) return entry.key.filter(k => k && k.trim()).join(', ') || `条目 #${id}`;
            if (typeof entry.key === 'string' && entry.key.trim()) return entry.key.trim();
          }
          return `条目 #${id}`;
        }

        function getEntryKeys(entry) {
          let keys = [];
          if (entry.key) {
            if (Array.isArray(entry.key)) keys = entry.key.filter(k => k && k.trim());
            else if (typeof entry.key === 'string' && entry.key.trim()) keys = entry.key.split(',').map(k => k.trim()).filter(Boolean);
          }
          if (entry.keys && Array.isArray(entry.keys)) keys = keys.concat(entry.keys.filter(k => k && k.trim()));
          return [...new Set(keys)];
        }

        function isConstant(entry) { return entry.constant === true || entry.constant === 1 || entry.alwaysActive === true; }
        function isDisabled(entry) { return entry.disable === true || entry.disabled === true || entry.enabled === false; }

        function saveCurrentConfig() {
          if (!currentWorldbookName || !currentMode) {
            document.getElementById('sp-worldbook-status').textContent = '⚠️ 请先搜索并选择世界书';
            return;
          }
          const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
          const checkedUids = Array.from(document.querySelectorAll('#sp-entries-list input[type="checkbox"][data-uid]:checked')).map(cb => cb.dataset.uid);
          currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
          currentConfig[currentWorldbookName] = { fileId: currentFileId, enabledUids: checkedUids };
          localStorage.setItem(configKey, JSON.stringify(currentConfig));
          localStorage.setItem(LAST_WORLDBOOK_KEY, JSON.stringify({ worldbookName: currentWorldbookName, fileId: currentFileId, mode: currentMode }));
          document.getElementById('sp-worldbook-status').textContent = `✅ 已保存 ${checkedUids.length} 个条目到 ${currentMode === 'static' ? '静态' : '动态'} 配置`;
          populateConfiguredBooks();
        }

        function renderEntries(entries, enabledUids = []) {
          const container = document.getElementById('sp-entries-list');
          container.innerHTML = '';
          const entryArray = Object.entries(entries).map(([id, entry]) => ({
            id,
            entry,
            sortInfo: getSortInfo(entry, id)
          }));

          entryArray.sort(compareEntries);

          let visibleCount = 0, totalCount = entryArray.length, disabledCount = 0, constantCount = 0;

          entryArray.forEach(({ id, entry, sortInfo }) => {
            const disabled = isDisabled(entry);
            const constant = isConstant(entry);
            if (disabled) disabledCount++;
            if (constant) constantCount++;
            if (disabled && !showDisabled) return;
            visibleCount++;

            const div = document.createElement('div');
            div.style.cssText = `display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding:6px;border-bottom:1px solid #588254;${disabled ? 'opacity:0.5;' : ''}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.uid = id;
            checkbox.checked = enabledUids.includes(id) || enabledUids.includes(String(id));
            checkbox.style.cssText = 'margin-top: 2px; flex-shrink: 0;';
            checkbox.addEventListener('change', () => {
              const checkedCount = document.querySelectorAll('#sp-entries-list input[type="checkbox"][data-uid]:checked').length;
              document.getElementById('sp-worldbook-status').textContent = `已选择 ${checkedCount} 个条目`;
            });

            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'flex: 1; min-width: 0;';
            const titleRow = document.createElement('div');
            titleRow.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;';

            const orderBadge = document.createElement('span');
            const posLabel = POS_LABELS[sortInfo.pos] || '?';
            orderBadge.textContent = `[${posLabel}:${sortInfo.order}]`;
            orderBadge.title = `位置: ${posLabel}, 顺序: ${sortInfo.order}, ID: ${id}`;
            orderBadge.style.cssText = 'font-size: 10px; color: #ccc; background: #444; padding: 1px 4px; border-radius: 3px; font-family: monospace;';

            const badges = document.createElement('span');
            badges.style.cssText = 'display: flex; gap: 4px; flex-shrink: 0;';
            if (constant) { const b = document.createElement('span'); b.textContent = '📌'; b.title = '常驻'; b.style.fontSize = '12px'; badges.appendChild(b); }
            if (disabled) { const b = document.createElement('span'); b.textContent = '🚫'; b.title = '已禁用'; b.style.fontSize = '12px'; badges.appendChild(b); }
            const keys = getEntryKeys(entry);
            if (keys.length > 0 && !constant) { const b = document.createElement('span'); b.textContent = '🔑'; b.title = '关键词触发'; b.style.fontSize = '12px'; badges.appendChild(b); }
            const titleSpan = document.createElement('strong');
            titleSpan.textContent = getEntryDisplayName(entry, id);
            titleSpan.style.cssText = 'color:#A3C956;font-size:13px;word-break:break-word;';
            titleRow.appendChild(orderBadge);
            titleRow.appendChild(badges);
            titleRow.appendChild(titleSpan);
            infoDiv.appendChild(titleRow);

            if (keys.length > 0) {
              const keysRow = document.createElement('div');
              keysRow.style.cssText = 'margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;';
              keys.slice(0, 5).forEach(k => {
                const keyTag = document.createElement('span');
                keyTag.textContent = k;
                keyTag.style.cssText = 'padding: 2px 6px; font-size: 10px; border-radius: 10px; background: #588254; color: #fff;';
                keysRow.appendChild(keyTag);
              });
              if (keys.length > 5) {
                const moreTag = document.createElement('span');
                moreTag.textContent = `+${keys.length - 5}`;
                moreTag.style.cssText = 'padding: 2px 6px; font-size: 10px; border-radius: 10px; background: #444; color: #aaa;';
                keysRow.appendChild(moreTag);
              }
              infoDiv.appendChild(keysRow);
            }

            if (entry.content && entry.content.trim()) {
              const previewRow = document.createElement('div');
              const previewText = entry.content.trim().substring(0, 50).replace(/\n/g, ' ');
              previewRow.textContent = previewText + (entry.content.length > 50 ? '...' : '');
              previewRow.style.cssText = 'margin-top: 4px; font-size: 11px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
              infoDiv.appendChild(previewRow);
            }
            div.append(checkbox, infoDiv);
            container.appendChild(div);
          });

          if (visibleCount === 0) container.innerHTML = `<div style="color: #ddd; text-align: center; padding: 20px;">没有可显示的条目</div>`;
          document.getElementById('sp-worldbook-status').textContent = `📊 ${currentWorldbookName} [${currentMode === 'static' ? '静态' : '动态'}] - 显示 ${visibleCount}/${totalCount}`;
        }

        document.getElementById('sp-select-all').addEventListener('change', (e) => {
          if (e.target.checked) {
            document.querySelectorAll('#sp-entries-list input[type="checkbox"][data-uid]').forEach(cb => { cb.checked = true; });
            document.getElementById('sp-deselect-all').checked = false;
          }
        });

        document.getElementById('sp-deselect-all').addEventListener('change', (e) => {
          document.querySelectorAll('#sp-entries-list input[type="checkbox"][data-uid]').forEach(cb => { cb.checked = false; });
          document.getElementById('sp-select-all').checked = false;
          e.target.checked = false;
        });

        document.getElementById('sp-show-disabled').addEventListener('change', (e) => {
          showDisabled = e.target.checked;
          if (Object.keys(currentEntries).length > 0) {
            const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
            currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            const enabledUids = currentConfig[currentWorldbookName]?.enabledUids || [];
            renderEntries(currentEntries, enabledUids);
          }
        });

        async function searchWorldbook(isDynamic = false) {
          const inputEl = document.getElementById('sp-worldbook-input');
          currentWorldbookName = inputEl ? inputEl.value.trim() : '';
          if (!currentWorldbookName) return alert('请输入世界书名称');
          currentMode = isDynamic ? 'dynamic' : 'static';
          document.getElementById('sp-worldbook-status').textContent = '正在搜索...';

          let allWorldBookNames = [];
          if (Array.isArray(moduleWI.world_names)) allWorldBookNames = moduleWI.world_names;
          else {
            const ctx = SillyTavern.getContext();
            if (ctx.worldInfo && Array.isArray(ctx.worldInfo)) allWorldBookNames = ctx.worldInfo.map(w => w.name || w);
          }
          if (allWorldBookNames.length === 0) {
            const selected = moduleWI.selected_world_info || [];
            const worldInfoData = moduleWI.world_info || {};
            allWorldBookNames = [...selected, ...Object.keys(worldInfoData)];
          }

          currentFileId = allWorldBookNames.find(name => {
            const n = name.toLowerCase();
            const s = currentWorldbookName.toLowerCase();
            return n === s || n.includes(s) || s.includes(n);
          });

          if (!currentFileId) {
            document.getElementById('sp-worldbook-status').textContent = `❌ 未找到 "${currentWorldbookName}"`;
            return;
          }

          try {
            document.getElementById('sp-worldbook-status').textContent = `正在加载 "${currentFileId}"...`;
            const worldInfo = await moduleWI.loadWorldInfo(currentFileId);
            currentEntries = worldInfo.entries || worldInfo || {};
            if (Object.keys(currentEntries).length === 0 && typeof worldInfo === 'object') {
              const possibleEntries = Object.values(worldInfo).find(v => typeof v === 'object' && v !== null);
              if (possibleEntries) currentEntries = possibleEntries;
            }
            const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
            currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            const enabledUids = currentConfig[currentWorldbookName]?.enabledUids || [];
            localStorage.setItem(LAST_WORLDBOOK_KEY, JSON.stringify({ worldbookName: currentWorldbookName, fileId: currentFileId, mode: currentMode }));
            renderEntries(currentEntries, enabledUids);
            populateConfiguredBooks();
          } catch (e) {
            console.error('[世界书] 加载失败:', e);
            document.getElementById('sp-worldbook-status').textContent = '❌ 加载失败: ' + e.message;
          }
        }

        document.getElementById('sp-configured-books').addEventListener('change', async (e) => {
          const bookName = e.target.value;
          if (!bookName) return;
          document.getElementById('sp-worldbook-input').value = bookName;
          const staticConfig = JSON.parse(localStorage.getItem(STATIC_CONFIG_KEY) || '{}');
          const dynamicConfig = JSON.parse(localStorage.getItem(DYNAMIC_CONFIG_KEY) || '{}');
          if (staticConfig[bookName]) await searchWorldbook(false);
          else if (dynamicConfig[bookName]) await searchWorldbook(true);
        });

        document.getElementById('sp-search-btn').addEventListener('click', () => searchWorldbook(false));
        document.getElementById('sp-robot-btn').addEventListener('click', () => searchWorldbook(true));
        document.getElementById('sp-save-config').addEventListener('click', saveCurrentConfig);
        populateConfiguredBooks();

        if (lastState.worldbookName && lastState.fileId && lastState.mode) {
          setTimeout(() => { searchWorldbook(lastState.mode === 'dynamic'); }, 100);
        }
      }

      // ========== 获取聊天记录 ==========
      async function getLastMessages() {
        try {
          const ctx = SillyTavern.getContext();
          if (!ctx || !Array.isArray(ctx.chat)) return [];
          const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
          const lastMessages = ctx.chat.slice(-count);
          const regexListRaw = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
          const regexList = regexListRaw.filter(r => r.enabled).map(r => {
            try {
              const pattern = r.pattern.trim();
              if (/^\w+$/.test(pattern)) return new RegExp(`<${pattern}>[\\s\\S]*?<\\/${pattern}>`, 'g');
              const openTag = pattern.match(/^<(\w+)>/);
              const closeTag = pattern.match(/<\/(\w+)>$/);
              if (openTag && closeTag && openTag[1] === closeTag[1]) return new RegExp(`<${openTag[1]}>[\\s\\S]*?<\\/${openTag[1]}>`, 'g');
              return new RegExp(pattern, 'g');
            } catch { return null; }
          }).filter(Boolean);
          const textMessages = lastMessages.map(m => {
            let text = (m.mes || m.original_mes || "").trim();
            regexList.forEach(regex => { text = text.replace(regex, ''); });
            return text;
          }).filter(Boolean);
          localStorage.setItem('cuttedLastMessages', JSON.stringify(textMessages));
          return textMessages;
        } catch { return []; }
      }

      // ========== 生成面板 ==========
      let autoMode = false, tuoguanMode = false, autoEventHandler = null, tuoguanEventHandler = null;
      let processedMessageIds = new Set(), contentClickHandler = null;
      let lastSentMessages = null, lastGeneratedOutput = '';
      let lastWorldbookContent = [];
      const AUTO_MODE_KEY = 'friendCircleAutoMode', TUOGUAN_MODE_KEY = 'friendCircleTuoguanMode';

      function getMessageId(msg) { return `${msg.send_date || ''}_${msg.mes ? msg.mes.substring(0, 50) : ''}_${msg.is_user}`; }

      // 🔧 核心修改：宏处理函数 - 增强版
      function processMacros(text, activeMacros) {
        if (!text || typeof text !== 'string') return text;
        let result = text;

        // 1. 处理自定义配置宏 (e.g. {{number1}}) -> 随机数范围
        if (activeMacros && activeMacros.length > 0) {
          activeMacros.forEach(macro => {
            const pattern = new RegExp(`\\{\\{${macro.name}\\}\\}`, 'g');
            if (pattern.test(result)) {
              const randomValue = Math.floor(Math.random() * (macro.max - macro.min + 1)) + macro.min;
              result = result.replace(pattern, randomValue.toString());
            }
          });
        }

        // 2. 统一处理通用宏 {{random:...}} 和 {{pick:...}}
        result = result.replace(/\{\{(random|pick):([\s\S]+?)\}\}/gi, (match, type, content) => {
          if (!content) return match;

          let options = [];

          // 判定逻辑优先级:
          // A. 如果包含 '::'，强制视为双冒号分隔列表
          if (content.includes('::')) {
            options = content.split('::');
          }
          // B. 如果符合 "数字-数字" 格式 (如 1-100)，视为范围随机
          else if (/^\s*-?\d+\s*-\s*-?\d+\s*$/.test(content)) {
            const rangeMatch = content.match(/^\s*(-?\d+)\s*-\s*(-?\d+)\s*$/);
            if (rangeMatch) {
              const min = parseInt(rangeMatch[1], 10);
              const max = parseInt(rangeMatch[2], 10);
              if (!isNaN(min) && !isNaN(max)) {
                const realMin = Math.min(min, max);
                const realMax = Math.max(min, max);
                return (Math.floor(Math.random() * (realMax - realMin + 1)) + realMin).toString();
              }
            }
            options = [content];
          }
          // C. 默认视为逗号分隔列表
          else {
            options = content.split(',');
          }

          if (options.length === 0) return match;

          // 随机抽取一个，并去除首尾空格
          return options[Math.floor(Math.random() * options.length)].trim();
        });

        return result;
      }

      function showGenPanel() {
        const content = document.getElementById('sp-content-area');
        if (contentClickHandler) { content.removeEventListener('click', contentClickHandler); contentClickHandler = null; }

        content.innerHTML = `
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <button id="sp-gen-now" style="padding: 8px 16px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">立刻生成</button>
            <button id="sp-gen-inject-input" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入输入框</button>
            <button id="sp-gen-inject-chat" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入聊天</button>
            <button id="sp-gen-inject-swipe" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入swipe</button>
            <button id="sp-gen-log" style="padding: 8px 16px; background: #6B5B95; color: white; border: none; border-radius: 4px; cursor: pointer;">📋日志</button>
            <button id="sp-gen-worldbook-log" style="padding: 8px 16px; background: #4a6fa5; color: white; border: none; border-radius: 4px; cursor: pointer;">📚世界书</button>
            <button id="sp-gen-auto" style="padding: 8px 16px; background: ${autoMode ? '#A3C956' : '#D87E5E'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${autoMode ? '自动化(运行中)' : '自动化'}</button>
            <button id="sp-gen-tuoguan" style="padding: 8px 16px; background: ${tuoguanMode ? '#A3C956' : '#D87E5E'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${tuoguanMode ? '托管(运行中)' : '托管'}</button>
          </div>
          <div id="sp-output-label" style="font-size:12px;color:#888;margin-bottom:4px;">📤 生成输出:</div>
          <div id="sp-gen-output" contenteditable="true" style="white-space:pre-wrap;max-height:200px;overflow-y:auto;padding:8px;border:1px solid #588254;border-radius:6px;background:#5B6262;color:#fff;min-height:60px;"></div>
        `;

        const PROMPTS_KEY = 'friendCircleUserPrompts', RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts';
        function loadUserPrompts() { try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); } catch { return []; } }
        function loadRandomPrompts() { try { return JSON.parse(localStorage.getItem(RANDOM_PROMPTS_KEY) || '[]'); } catch { return []; } }
        function getRandomPrompt() {
          const enabled = loadRandomPrompts().filter(p => p.enabled);
          if (enabled.length === 0) return null;
          return enabled[Math.floor(Math.random() * enabled.length)].text;
        }

        function formatMessagesLog(messages) {
          if (!messages || messages.length === 0) return '暂无发送记录';
          let output = `═══════════════════════════════════\n📨 发送给AI的完整内容 (${messages.length} 条消息)\n═══════════════════════════════════\n\n`;
          messages.forEach((msg, idx) => {
            const roleEmoji = msg.role === 'system' ? '⚙️' : msg.role === 'user' ? '👤' : '🤖';
            const roleName = msg.role === 'system' ? 'System' : msg.role === 'user' ? 'User' : 'Assistant';
            output += `┌─── ${roleEmoji} [${idx + 1}] ${roleName} ───\n│\n`;
            msg.content.split('\n').forEach(line => { output += `│ ${line}\n`; });
            output += `│\n└${'─'.repeat(40)}\n\n`;
          });
          output += `═══════════════════════════════════\n📊 统计: System=${messages.filter(m => m.role === 'system').length}, User=${messages.filter(m => m.role === 'user').length}, Assistant=${messages.filter(m => m.role === 'assistant').length}\n═══════════════════════════════════`;
          return output;
        }

        function formatWorldbookLog(worldbookContent) {
          if (!worldbookContent || worldbookContent.length === 0) return '📚 世界书内容为空\n\n可能原因：\n1. 未配置世界书\n2. 世界书开关已关闭\n3. 未选择任何条目';
          let output = `═══════════════════════════════════\n📚 世界书发送内容 (${worldbookContent.length} 个条目)\n═══════════════════════════════════\n\n`;
          worldbookContent.forEach((item, idx) => {
            output += `┌─── 📖 [${idx + 1}] ───\n`;
            item.split('\n').forEach(line => { output += `│ ${line}\n`; });
            output += `└${'─'.repeat(40)}\n\n`;
          });
          output += `═══════════════════════════════════\n💡 如果发现预设内容混入，请检查世界书条目\n═══════════════════════════════════`;
          return output;
        }

        async function generateFriendCircle(selectedChat = []) {
          const url = localStorage.getItem('independentApiUrl'), key = localStorage.getItem('independentApiKey'), model = localStorage.getItem('independentApiModel');
          if (!url || !key || !model) { alert('请先配置独立 API'); return; }

          const sysDefaults = {
            systemMain: `你是一个独立的文本处理助手。你的唯一任务是根据<Tasks>中的要求处理文本...`,
            systemMiddle: `以上是参考资料，仅用于帮助你理解上下文...`,
            tasksWrapper: `【重要提醒】...`,
            assistantPrefill: ``
          };
          const sysConfig = { ...sysDefaults, ...JSON.parse(localStorage.getItem('friendCircleSystemPrompts') || '{}') };
          const enabledPrompts = loadUserPrompts().filter(p => p.enabled).map(p => p.text);
          const randomPrompt = getRandomPrompt();
          const allPrompts = [...enabledPrompts];
          if (randomPrompt) allPrompts.push(randomPrompt);

          // 🔧 加载所有启用的宏
          const activeMacros = JSON.parse(localStorage.getItem('friendCircleRandomMacros') || '[]').filter(m => m.enabled !== false);

          // 🔧 对所有类型的内容应用宏替换
          const processedPrompts = allPrompts.map(p => processMacros(p, activeMacros));
          const processedSysMain = processMacros(sysConfig.systemMain, activeMacros);
          const processedSysMiddle = processMacros(sysConfig.systemMiddle, activeMacros);
          const processedTasksWrapper = processMacros(sysConfig.tasksWrapper, activeMacros);

          let worldbookContent = [];
          lastWorldbookContent = [];

          const worldbookEnabled = localStorage.getItem('friendCircleWorldbookEnabled') !== '0';

          if (worldbookEnabled) {
            try {
              const moduleWI = await import('/scripts/world-info.js');
              const lastState = JSON.parse(localStorage.getItem('friendCircleLastWorldbook') || '{}');
              const currentBookName = lastState.worldbookName;
              const staticConfig = JSON.parse(localStorage.getItem('friendCircleStaticConfig') || '{}');
              const dynamicConfig = JSON.parse(localStorage.getItem('friendCircleDynamicConfig') || '{}');

              const processConfig = async (config) => {
                if (config && config.enabledUids?.length > 0) {
                   try {
                    const worldInfo = await moduleWI.loadWorldInfo(config.fileId);
                    const entries = worldInfo.entries || worldInfo || {};

                    const sortedUids = config.enabledUids
                      .map(uid => ({ id: uid, entry: entries[uid], sortInfo: getSortInfo(entries[uid], uid) }))
                      .filter(item => item.entry)
                      .sort(compareEntries)
                      .map(item => item.id);

                    sortedUids.forEach(uid => {
                      const entry = entries[uid];
                      if (entry?.content) {
                        const entryName = entry.comment || entry.title || entry.name || '未命名';
                        const cleanedContent = sanitizeWorldbookContent(entry.content);
                        if (cleanedContent) {
                          // 🔧 宏替换同样应用在世界书内容上
                          const finalContent = processMacros(cleanedContent, activeMacros);
                          worldbookContent.push(`【${currentBookName} - ${entryName}】\n${finalContent}`);
                        }
                      }
                    });
                  } catch (e) { console.warn(`[世界书] 加载配置失败: ${currentBookName}`, e); }
                }
              };

              if (currentBookName && staticConfig[currentBookName]) await processConfig(staticConfig[currentBookName]);
              if (currentBookName && dynamicConfig[currentBookName]) await processConfig(dynamicConfig[currentBookName]);

            } catch (e) { console.warn('[世界书] 模块加载失败:', e); }
          }

          lastWorldbookContent = [...worldbookContent];

          const messages = [{ role: "system", content: processedSysMain }];

          if (worldbookContent.length > 0) {
            messages.push({
              role: "user",
              content: `<WorldBook_Reference>
以下是背景参考资料，仅供理解上下文使用，不要基于这些内容进行创作或续写：

${worldbookContent.join('\n\n---\n\n')}

</WorldBook_Reference>`
            });
          }

          if (selectedChat.length > 0) {
            messages.push({
              role: "user",
              content: `<ChatHistory_Reference>
以下是聊天记录，仅供理解上下文使用，不要续写这些对话：

${selectedChat.join('\n')}

</ChatHistory_Reference>`
            });
          }

          messages.push({ role: "system", content: processedSysMiddle });

          if (processedPrompts.length > 0) {
            messages.push({
              role: "user",
              content: `<Tasks>
请执行以下任务（这是你唯一需要做的事情）：

${processedPrompts.join('\n\n')}

${processedTasksWrapper}
</Tasks>`
            });
          }

          if (sysConfig.assistantPrefill?.trim()) {
            messages.push({ role: "assistant", content: processMacros(sysConfig.assistantPrefill, activeMacros) });
          }

          lastSentMessages = messages;

          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model, messages, max_tokens: 20000 })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const output = data.choices?.map(c => c.message?.content || '').join('\n') || '[未生成内容]';
            lastGeneratedOutput = output;
            const outputEl = document.getElementById('sp-gen-output');
            const labelEl = document.getElementById('sp-output-label');
            if (outputEl) outputEl.textContent = output;
            if (labelEl) labelEl.textContent = '📤 生成输出:';
            return output;
          } catch (e) {
            const outputEl = document.getElementById('sp-gen-output');
            if (outputEl) outputEl.textContent = '生成失败: ' + e.message;
            throw e;
          }
        }

        function simulateEditMessage(mesElement, newText) {
          if (!mesElement) return;
          const editBtn = mesElement.querySelector('.mes_edit');
          if (!editBtn) return;
          editBtn.click();
          const textarea = mesElement.querySelector('.edit_textarea');
          if (!textarea) return;
          textarea.value = newText;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          const doneBtn = mesElement.querySelector('.mes_edit_done');
          if (doneBtn) doneBtn.click();
        }

        function toggleAutoMode(forceState) {
          const targetState = typeof forceState === 'boolean' ? forceState : !autoMode;
          if (targetState === autoMode) return;
          autoMode = targetState;
          localStorage.setItem(AUTO_MODE_KEY, autoMode ? '1' : '0');
          const autoBtn = document.getElementById('sp-gen-auto');
          if (autoMode) {
            if (autoBtn) { autoBtn.textContent = '自动化(运行中)'; autoBtn.style.background = '#A3C956'; }
            if (autoEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler); } catch {} }
            const { eventSource, event_types } = SillyTavern.getContext();
            autoEventHandler = async () => {
              const ctx = SillyTavern.getContext();
              if (!ctx?.chat?.length) return;
              const lastMsg = ctx.chat[ctx.chat.length - 1];
              if (!lastMsg || lastMsg.is_user) return;
              const msgId = getMessageId(lastMsg);
              if (processedMessageIds.has(msgId)) return;
              processedMessageIds.add(msgId);
              if (processedMessageIds.size > 100) processedMessageIds = new Set(Array.from(processedMessageIds).slice(-100));
              try { const cutted = await getLastMessages(); await generateFriendCircle(cutted); } catch {}
            };
            eventSource.on(event_types.GENERATION_ENDED, autoEventHandler);
          } else {
            if (autoBtn) { autoBtn.textContent = '自动化'; autoBtn.style.background = '#D87E5E'; }
            if (autoEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler); autoEventHandler = null; } catch {} }
          }
        }

        function toggleTuoguanMode(forceState) {
          const targetState = typeof forceState === 'boolean' ? forceState : !tuoguanMode;
          if (targetState === tuoguanMode) return;
          tuoguanMode = targetState;
          localStorage.setItem(TUOGUAN_MODE_KEY, tuoguanMode ? '1' : '0');
          const tuoguanBtn = document.getElementById('sp-gen-tuoguan');
          if (tuoguanMode) {
            if (tuoguanBtn) { tuoguanBtn.textContent = '托管(运行中)'; tuoguanBtn.style.background = '#A3C956'; }
            if (tuoguanEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler); } catch {} }
            const { eventSource, event_types } = SillyTavern.getContext();
            tuoguanEventHandler = async () => {
              const ctx = SillyTavern.getContext();
              if (!ctx?.chat?.length) return;
              const lastMsg = ctx.chat[ctx.chat.length - 1];
              if (!lastMsg || lastMsg.is_user !== false) return;
              const msgId = getMessageId(lastMsg);
              if (processedMessageIds.has(msgId)) return;
              processedMessageIds.add(msgId);
              if (processedMessageIds.size > 100) processedMessageIds = new Set(Array.from(processedMessageIds).slice(-100));
              let generatedText = '';
              try { const cutted = await getLastMessages(); generatedText = await generateFriendCircle(cutted); } catch { return; }
              if (!generatedText || generatedText.includes('生成失败')) return;
              const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
              if (!lastAiMes) return;
              const allMes = Array.from(document.querySelectorAll('.mes'));
              const aiMes = [...allMes].reverse().find(m => !m.classList.contains('user'));
              if (!aiMes) return;
              const oldRaw = lastAiMes.mes;
              simulateEditMessage(aiMes, oldRaw + '\n' + generatedText);
            };
            eventSource.on(event_types.GENERATION_ENDED, tuoguanEventHandler);
          } else {
            if (tuoguanBtn) { tuoguanBtn.textContent = '托管'; tuoguanBtn.style.background = '#D87E5E'; }
            if (tuoguanEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler); tuoguanEventHandler = null; } catch {} }
          }
        }

        if (localStorage.getItem(AUTO_MODE_KEY) === '1') toggleAutoMode(true);
        if (localStorage.getItem(TUOGUAN_MODE_KEY) === '1') toggleTuoguanMode(true);

        let currentLogView = 'output';

        contentClickHandler = async (e) => {
          const target = e.target;
          if (target.id === 'sp-gen-now') {
            currentLogView = 'output';
            const outputEl = document.getElementById('sp-gen-output');
            const labelEl = document.getElementById('sp-output-label');
            const genBtn = document.getElementById('sp-gen-now');
            const logBtn = document.getElementById('sp-gen-log');
            const wbLogBtn = document.getElementById('sp-gen-worldbook-log');
            if (outputEl) outputEl.textContent = '⏳ 正在生成中，请稍候...';
            if (labelEl) labelEl.textContent = '📤 生成输出: (生成中...)';
            if (genBtn) { genBtn.disabled = true; genBtn.style.opacity = '0.6'; genBtn.textContent = '生成中...'; }
            if (logBtn) { logBtn.textContent = '📋日志'; logBtn.style.background = '#6B5B95'; }
            if (wbLogBtn) { wbLogBtn.textContent = '📚世界书'; wbLogBtn.style.background = '#4a6fa5'; }
            try {
              const cutted = await getLastMessages();
              await generateFriendCircle(cutted);
              if (labelEl) labelEl.textContent = '📤 生成输出: ✅ 已完成';
            } catch (err) {
              debugLog('生成异常', err.message);
              if (outputEl) outputEl.textContent = '❌ 生成失败: ' + err.message;
              if (labelEl) labelEl.textContent = '📤 生成输出: ❌ 失败';
            } finally {
              if (genBtn) { genBtn.disabled = false; genBtn.style.opacity = '1'; genBtn.textContent = '立刻生成'; }
            }
          } else if (target.id === 'sp-gen-log') {
            const outputEl = document.getElementById('sp-gen-output');
            const labelEl = document.getElementById('sp-output-label');
            const logBtn = document.getElementById('sp-gen-log');
            const wbLogBtn = document.getElementById('sp-gen-worldbook-log');

            if (currentLogView !== 'messages') {
              currentLogView = 'messages';
              if (outputEl) outputEl.textContent = formatMessagesLog(lastSentMessages);
              if (labelEl) labelEl.textContent = '📋 发送日志:';
              if (logBtn) { logBtn.textContent = '📤输出'; logBtn.style.background = '#588254'; }
              if (wbLogBtn) { wbLogBtn.textContent = '📚世界书'; wbLogBtn.style.background = '#4a6fa5'; }
            } else {
              currentLogView = 'output';
              if (outputEl) outputEl.textContent = lastGeneratedOutput || '暂无生成内容';
              if (labelEl) labelEl.textContent = '📤 生成输出:';
              if (logBtn) { logBtn.textContent = '📋日志'; logBtn.style.background = '#6B5B95'; }
            }
          } else if (target.id === 'sp-gen-worldbook-log') {
            const outputEl = document.getElementById('sp-gen-output');
            const labelEl = document.getElementById('sp-output-label');
            const logBtn = document.getElementById('sp-gen-log');
            const wbLogBtn = document.getElementById('sp-gen-worldbook-log');

            if (currentLogView !== 'worldbook') {
              currentLogView = 'worldbook';
              if (outputEl) outputEl.textContent = formatWorldbookLog(lastWorldbookContent);
              if (labelEl) labelEl.textContent = '📚 世界书内容:';
              if (wbLogBtn) { wbLogBtn.textContent = '📤输出'; wbLogBtn.style.background = '#588254'; }
              if (logBtn) { logBtn.textContent = '📋日志'; logBtn.style.background = '#6B5B95'; }
            } else {
              currentLogView = 'output';
              if (outputEl) outputEl.textContent = lastGeneratedOutput || '暂无生成内容';
              if (labelEl) labelEl.textContent = '📤 生成输出:';
              if (wbLogBtn) { wbLogBtn.textContent = '📚世界书'; wbLogBtn.style.background = '#4a6fa5'; }
            }
          } else if (target.id === 'sp-gen-inject-input') {
            const texts = lastGeneratedOutput || document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts || currentLogView !== 'output') return alert('请先生成内容');
            const inputEl = document.getElementById('send_textarea');
            if (inputEl) { inputEl.value = texts; inputEl.dispatchEvent(new Event('input', { bubbles: true })); }
          } else if (target.id === 'sp-gen-inject-chat') {
            const texts = lastGeneratedOutput || document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts || currentLogView !== 'output') return alert('请先生成内容');
            const ctx = SillyTavern.getContext();
            if (!ctx?.chat?.length) return alert('未找到消息');
            const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
            if (!lastAiMes) return alert('未找到AI消息');
            const allMes = Array.from(document.querySelectorAll('.mes'));
            const aiMes = [...allMes].reverse().find(m => !m.classList.contains('user'));
            if (!aiMes) return alert('未找到DOM中的AI消息');
            simulateEditMessage(aiMes, lastAiMes.mes + '\n' + texts);
          } else if (target.id === 'sp-gen-inject-swipe') {
            const texts = lastGeneratedOutput || document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts || currentLogView !== 'output') return alert('请先生成内容');
            const inputEl = document.getElementById('send_textarea');
            if (inputEl) { inputEl.value = `/addswipe ${texts}`; inputEl.dispatchEvent(new Event('input', { bubbles: true })); }
            const sendBtn = document.getElementById('send_but');
            if (sendBtn) sendBtn.click();
          } else if (target.id === 'sp-gen-auto') {
            toggleAutoMode();
          } else if (target.id === 'sp-gen-tuoguan') {
            toggleTuoguanMode();
          }
        };
        content.addEventListener('click', contentClickHandler);
      }

      // 面板按钮绑定
      panel.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'api') showApiConfig();
          else if (key === 'system-prompt') showSystemPromptConfig();
          else if (key === 'prompt') showPromptConfig();
          else if (key === 'random-prompt') showRandomPromptConfig();
          else if (key === 'random-macro') showRandomMacroConfig();
          else if (key === 'chat') showChatConfig();
          else if (key === 'worldbook') showWorldbookPanel();
          else if (key === 'gen') showGenPanel();
        });
      });

      debugLog('拓展已加载');
    } catch (err) {
      console.error(`[${MODULE_NAME}] 初始化失败:`, err);
    }
  });
})();
