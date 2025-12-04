import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, saveChat } from "../../../../script.js";

(function () {
  const MODULE_NAME = 'pyq-creator';

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
          <div class="sp-btn" data-key="random-prompt">随机提示词</div>
          <div class="sp-btn" data-key="random-macro">随机数宏</div>
          <div class="sp-btn" data-key="chat">聊天配置</div>
          <div class="sp-btn" data-key="worldbook">世界书配置</div>
          <div class="sp-btn" data-key="gen">生成</div>
        </div>
        <div id="sp-content-area" class="sp-subpanel">
          <div class="sp-small">请选择一个功能</div>
        </div>
        <div id="sp-debug" class="sp-debug">[调试面板输出]</div>
      `;
      document.body.appendChild(panel);

      // 应用保存的面板尺寸（带安全检查）
      function applySavedPanelSize() {
        const savedHeight = localStorage.getItem('starPanelHeight');
        const savedWidth = localStorage.getItem('starPanelWidth');
        const maxWidth = window.innerWidth - 20;
        
        if (savedHeight) {
          panel.style.maxHeight = savedHeight + 'vh';
        }
        if (savedWidth) {
          const width = Math.min(parseInt(savedWidth), maxWidth);
          panel.style.width = width + 'px';
        }
      }
      applySavedPanelSize();

      // 窗口大小变化时重新检查
      window.addEventListener('resize', () => {
        const maxWidth = window.innerWidth - 20;
        const currentWidth = parseInt(panel.style.width) || 340;
        if (currentWidth > maxWidth) {
          panel.style.width = maxWidth + 'px';
          localStorage.setItem('starPanelWidth', maxWidth);
        }
      });

      setTimeout(() => {
        const genBtn = panel.querySelector('.sp-btn[data-key="gen"]');
        if (genBtn) genBtn.click();
      }, 0);

      // 单击显示/隐藏面板
      fab.addEventListener('click', () => {
        if (panel.classList.contains('sp-visible')) {
          panel.classList.remove('sp-visible');
          panel.style.display = 'none';
        } else {
          panel.classList.add('sp-visible');
          panel.style.display = 'flex';
        }
      });

      // 双击重置设置
      fab.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('双击检测到！是否重置界面设置？\n（解决面板显示异常问题）')) {
          localStorage.removeItem('starPanelScale');
          localStorage.removeItem('starPanelHeight');
          localStorage.removeItem('starPanelWidth');
          panel.className = 'sp-scale-normal';
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

      // ========== 界面设置面板 ==========
      function showSettingsPanel() {
        const content = document.getElementById('sp-content-area');
        const currentScale = localStorage.getItem('starPanelScale') || 'normal';
        const maxWidth = Math.min(500, window.innerWidth - 20);
        const currentWidth = Math.min(parseInt(localStorage.getItem('starPanelWidth') || '340'), maxWidth);
        
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
          
          <div style="margin-bottom: 12px;">
            <span style="color: #ddd;">面板宽度：<span style="font-size:11px;color:#888;">(最大${maxWidth}px)</span></span>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <input type="range" id="sp-width-slider" min="260" max="${maxWidth}" value="${currentWidth}" style="flex: 1;">
              <span id="sp-width-value" style="color: #A3C956; min-width: 50px;">${currentWidth}px</span>
            </div>
          </div>
          
          <button id="sp-reset-settings" style="width: 100%; padding: 10px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px;">恢复默认设置</button>
          
          <p style="color: #888; font-size: 11px; margin-top: 12px;">
            💡 双击星星按钮也可以重置设置
          </p>
        </div>
        `;
        
        document.getElementById('sp-scale-select').addEventListener('change', (e) => {
          const scale = e.target.value;
          localStorage.setItem('starPanelScale', scale);
          panel.className = `sp-scale-${scale}`;
          if (panel.classList.contains('sp-visible')) panel.classList.add('sp-visible');
        });
        
        document.getElementById('sp-height-slider').addEventListener('input', (e) => {
          const height = e.target.value;
          document.getElementById('sp-height-value').textContent = height + '%';
          localStorage.setItem('starPanelHeight', height);
          panel.style.maxHeight = height + 'vh';
        });
        
        document.getElementById('sp-width-slider').addEventListener('input', (e) => {
          const width = e.target.value;
          document.getElementById('sp-width-value').textContent = width + 'px';
          localStorage.setItem('starPanelWidth', width);
          panel.style.width = width + 'px';
        });
        
        document.getElementById('sp-reset-settings').addEventListener('click', () => {
          localStorage.removeItem('starPanelScale');
          localStorage.removeItem('starPanelHeight');
          localStorage.removeItem('starPanelWidth');
          panel.className = 'sp-scale-normal sp-visible';
          panel.style.maxHeight = '85vh';
          panel.style.width = '340px';
          showSettingsPanel();
        });
      }

      // ========== API配置面板 ==========
      function showApiConfig() {
        const content = document.getElementById("sp-content-area");
        content.innerHTML = `
          <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
            <h3 style="color: #A3C956; margin-bottom: 12px;">🔌 API配置</h3>
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              API URL: 
              <input type="text" id="api-url-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;">
            </label>
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              API Key: 
              <input type="text" id="api-key-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;">
            </label>
            <label style="color: #ddd; display: block; margin-bottom: 8px;">
              模型: 
              <select id="api-model-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px; box-sizing: border-box;"></select>
            </label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
              <button id="api-save-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
              <button id="api-test-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">测试</button>
              <button id="api-refresh-models-btn" style="flex: 1; min-width: 80px; padding: 8px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新模型</button>
            </div>
            <div id="api-status" style="margin-top:8px;font-size:12px;color:#A3C956;"></div>
            <pre id="api-debug" style="margin-top:8px;font-size:11px;color:#ddd;white-space:pre-wrap;background:#5B6262;padding:8px;border-radius:4px;max-height:80px;overflow-y:auto;"></pre>
          </div>
        `;

        const modelSelect = document.getElementById("api-model-select");

        document.getElementById("api-url-input").value = localStorage.getItem("independentApiUrl") || "";
        document.getElementById("api-key-input").value = localStorage.getItem("independentApiKey") || "";
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
              existing.textContent = savedModel + "(已保存)";
              modelSelect.value = savedModel;
            } else {
              const opt = document.createElement("option");
              opt.value = savedModel;
              opt.textContent = savedModel + "(已保存)";
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
          } catch { }
        } else if (savedModel) {
          const opt = document.createElement("option");
          opt.value = savedModel;
          opt.textContent = savedModel + "(已保存)";
          modelSelect.appendChild(opt);
          modelSelect.value = savedModel;
        }

        document.getElementById("api-save-btn").addEventListener("click", () => {
          const url = document.getElementById("api-url-input").value;
          const key = document.getElementById("api-key-input").value;
          const model = modelSelect.value;
          if (!url || !key || !model) return alert("请完整填写API信息");
          localStorage.setItem("independentApiUrl", url);
          localStorage.setItem("independentApiKey", key);
          localStorage.setItem("independentApiModel", model);
          document.getElementById("api-status").textContent = "✅ 已保存";
        });

        document.getElementById("api-test-btn").addEventListener("click", async () => {
          const urlRaw = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
          const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
          const model = modelSelect.value || localStorage.getItem("independentApiModel");
          if (!urlRaw || !key || !model) return alert("请完整填写API信息");
          const baseUrl = urlRaw.replace(/\/$/, "");
          document.getElementById("api-status").textContent = "正在测试...";
          try {
            const res = await fetch(`${baseUrl}/v1/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 100 })
            });
            if (!res.ok) throw new Error(`返回 ${res.status}`);
            document.getElementById("api-status").textContent = `✅ 模型 ${model} 可用`;
          } catch (e) {
            document.getElementById("api-status").textContent = "❌ 连接失败: " + e.message;
          }
        });

        document.getElementById("api-refresh-models-btn").addEventListener("click", async () => {
          const url = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
          const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
          if (!url || !key) return alert("请先填写 URL 和 Key");
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
            document.getElementById("api-status").textContent = `✅ 已拉取 ${ids.length} 个模型`;
          } catch (e) {
            document.getElementById("api-status").textContent = "❌ 拉取失败: " + e.message;
          }
        });
      }

      // ========== 系统提示词配置 ==========
      function showSystemPromptConfig() {
        const content = document.getElementById('sp-content-area');
        const defaults = {
          systemMain: `你是文本处理助手。接下来会收到三部分信息：
1. <WorldBook_Reference>：背景参考资料（仅参考，不输出）
2. <ChatHistory_Reference>：聊天记录（仅参考，不输出）
3. <Tasks>：具体任务要求

请直接按<Tasks>中的要求输出结果，不要添加任何开场白、解释或确认语句。`,
          systemMiddle: `以上参考信息结束。接下来是任务要求，请直接输出结果内容：`,
          tasksWrapper: `注意：只输出摘要/处理结果本身，不要续写聊天内容。`,
          assistantPrefill: ``
        };
        const saved = JSON.parse(localStorage.getItem('friendCircleSystemPrompts') || '{}');
        const config = { ...defaults, ...saved };

        content.innerHTML = `
        <div style="padding: 10px; background: #2a2a3e; border-radius: 8px;">
          <h3 style="color: #fff; margin-bottom: 12px;">⚙️ 系统提示词配置</h3>
          <div style="margin-bottom: 12px;">
            <label style="color: #fff; display: block; margin-bottom: 4px;">📌 主系统提示词</label>
            <textarea id="sp-sys-main" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; background: #1a1a2e; color: #fff; border: 1px solid #444; resize: vertical; box-sizing: border-box; min-height: 80px;">${config.systemMain}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #fff; display: block; margin-bottom: 4px;">📌 过渡提示词</label>
            <textarea id="sp-sys-middle" rows="2" style="width: 100%; padding: 8px; border-radius: 4px; background: #1a1a2e; color: #fff; border: 1px solid #444; resize: vertical; box-sizing: border-box;">${config.systemMiddle}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #fff; display: block; margin-bottom: 4px;">📌 任务包装后缀</label>
            <textarea id="sp-sys-tasks" rows="2" style="width: 100%; padding: 8px; border-radius: 4px; background: #1a1a2e; color: #fff; border: 1px solid #444; resize: vertical; box-sizing: border-box;">${config.tasksWrapper}</textarea>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="color: #fff; display: block; margin-bottom: 4px;">📌 Assistant预填充（可选）</label>
            <textarea id="sp-sys-prefill" rows="2" placeholder="留空表示不预填充" style="width: 100%; padding: 8px; border-radius: 4px; background: #1a1a2e; color: #fff; border: 1px solid #444; resize: vertical; box-sizing: border-box;">${config.assistantPrefill}</textarea>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="sp-sys-save" style="flex: 1; min-width: 100px; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 保存</button>
            <button id="sp-sys-reset" style="padding: 10px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 恢复默认</button>
          </div>
          <div id="sp-sys-status" style="margin-top: 8px; color: #4caf50; font-size: 12px;"></div>
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

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.cssText = 'padding:4px 6px;background:#D87E5E;border:none;border-radius:3px;cursor:pointer;font-size:12px;';
            editBtn.addEventListener('click', () => {
              const newText = prompt('编辑提示词:', p.text);
              if (newText !== null && newText.trim()) {
                friendCirclePrompts[idx].text = newText.trim();
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
              }
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

            btnContainer.append(editBtn, tagBtn, delBtn);
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
            <p style="color: #ddd; font-size: 12px; margin-bottom: 12px;">替换提示词中的 {{number1}} 等为随机数</p>
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              <input type="number" id="sp-macro-min" placeholder="最小值" style="flex: 1; min-width: 60px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
              <input type="number" id="sp-macro-max" placeholder="最大值" style="flex: 1; min-width: 60px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
              <button id="sp-add-macro-btn" style="padding: 8px 12px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">添加</button>
            </div>
            <div id="sp-macro-list" style="max-height: 180px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;"></div>
            <button id="sp-save-macros-btn" style="margin-top: 12px; padding: 10px; width: 100%; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">保存配置</button>
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
          if (isNaN(min) || isNaN(max) || min > max) return alert('请输入有效数字');
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
            <p style="color:#aaa;font-size:11px;margin-bottom:8px;">支持输入：标签名(如 example) 或 完整格式(如 &lt;think&gt;&lt;/think&gt;)</p>
            <div style="display:flex; gap:6px; margin-bottom:6px; flex-wrap: wrap;">
              <input type="text" id="sp-new-regex" placeholder="example 或 <think></think>" style="flex:1; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; box-sizing: border-box;">
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
        content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
          <h3 style="color: #A3C956; margin-bottom: 12px;">📚 世界书配置</h3>
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <input type="text" id="sp-worldbook-input" placeholder="输入世界书名称" style="flex: 1; min-width: 120px; padding: 6px 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254; box-sizing: border-box;">
            <button id="sp-search-btn" style="padding: 6px 10px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">🔎静态</button>
            <button id="sp-robot-btn" style="padding: 6px 10px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">🤖动态</button>
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <label style="color: #ddd;"><input type="checkbox" id="sp-select-all"> 全选</label>
            <label style="color: #ddd;"><input type="checkbox" id="sp-deselect-all"> 全不选</label>
          </div>
          <div id="sp-entries-list" style="max-height: 120px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;">
            <div style="color: #ddd; text-align: center;">点击搜索按钮加载条目</div>
          </div>
          <button id="sp-save-config" style="margin-top: 12px; padding: 8px; width: 100%; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">保存配置</button>
          <div id="sp-worldbook-status" style="margin-top: 8px; font-size: 12px; color: #A3C956;"></div>
        </div>
        `;

        const STATIC_CONFIG_KEY = 'friendCircleStaticConfig';
        const DYNAMIC_CONFIG_KEY = 'friendCircleDynamicConfig';
        let currentWorldbookName = '', currentFileId = '', currentEntries = {}, currentMode = '', currentConfig = {};

        let moduleWI;
        try { moduleWI = await import('/scripts/world-info.js'); } catch (e) {
          document.getElementById('sp-worldbook-status').textContent = '❌ world-info.js 加载失败';
          return;
        }

        function saveCurrentConfig() {
          if (!currentWorldbookName || !currentMode) return;
          const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
          const checkedUids = Array.from(document.querySelectorAll('#sp-entries-list input[type="checkbox"]:checked')).map(cb => cb.dataset.uid);
          currentConfig[currentWorldbookName] = { fileId: currentFileId, enabledUids: checkedUids };
          localStorage.setItem(configKey, JSON.stringify(currentConfig));
          document.getElementById('sp-worldbook-status').textContent = `✅ 已保存 ${checkedUids.length} 个条目`;
        }

        function renderEntries(entries, enabledUids = []) {
          const container = document.getElementById('sp-entries-list');
          container.innerHTML = '';
          Object.keys(entries).forEach(id => {
            const entry = entries[id];
            if (entry.disable) return;
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding:4px;border-bottom:1px solid #588254;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.uid = id;
            checkbox.checked = enabledUids.includes(id);
            checkbox.addEventListener('change', saveCurrentConfig);
            const titleSpan = document.createElement('strong');
            titleSpan.textContent = entry.title || entry.key || '无标题';
            titleSpan.style.cssText = 'color:#A3C956;font-size:13px;';
            div.append(checkbox, titleSpan);
            container.appendChild(div);
          });
        }

        document.getElementById('sp-select-all').addEventListener('change', (e) => {
          if (e.target.checked) document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => { cb.checked = true; });
          saveCurrentConfig();
        });
        document.getElementById('sp-deselect-all').addEventListener('change', (e) => {
          document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => { cb.checked = false; });
          e.target.checked = false;
          saveCurrentConfig();
        });

        async function searchWorldbook(isDynamic = false) {
          currentWorldbookName = document.getElementById('sp-worldbook-input').value.trim();
          if (!currentWorldbookName) return alert('请输入世界书名称');
          currentMode = isDynamic ? 'dynamic' : 'static';
          const selected = moduleWI.selected_world_info || [];
          currentFileId = selected.find(wi => wi.toLowerCase().includes(currentWorldbookName.toLowerCase()));
          if (!currentFileId) return alert(`未找到 "${currentWorldbookName}"`);
          try {
            const worldInfo = await moduleWI.loadWorldInfo(currentFileId);
            currentEntries = worldInfo.entries || {};
            const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
            currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            const enabledUids = currentConfig[currentWorldbookName]?.enabledUids || [];
            renderEntries(currentEntries, enabledUids);
            document.getElementById('sp-worldbook-status').textContent = `✅ ${currentMode} 加载成功`;
          } catch (e) {
            document.getElementById('sp-worldbook-status').textContent = '❌ 加载失败: ' + e.message;
          }
        }

        document.getElementById('sp-search-btn').addEventListener('click', () => searchWorldbook(false));
        document.getElementById('sp-robot-btn').addEventListener('click', () => searchWorldbook(true));
        document.getElementById('sp-save-config').addEventListener('click', saveCurrentConfig);
      }

      // ========== 获取聊天记录（修复正则匹配）==========
      async function getLastMessages() {
        try {
          const ctx = SillyTavern.getContext();
          if (!ctx || !Array.isArray(ctx.chat)) return [];
          const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
          const lastMessages = ctx.chat.slice(-count);
          
          const regexListRaw = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
          const regexList = regexListRaw
            .filter(r => r.enabled)
            .map(r => {
              try {
                const pattern = r.pattern.trim();
                
                // 格式1: 只输入标签名，如 "example" 或 "think"
                if (/^\w+$/.test(pattern)) {
                  return new RegExp(`<${pattern}>[\\s\\S]*?<\\/${pattern}>`, 'g');
                }
                
                // 格式2: 输入 <tag></tag> 或 <tag>...</tag>
                const openTag = pattern.match(/^<(\w+)>/);
                const closeTag = pattern.match(/<\/(\w+)>$/);
                if (openTag && closeTag && openTag[1] === closeTag[1]) {
                  return new RegExp(`<${openTag[1]}>[\\s\\S]*?<\\/${openTag[1]}>`, 'g');
                }
                
                // 格式3: 直接输入完整正则表达式
                return new RegExp(pattern, 'g');
              } catch (e) {
                console.warn('[正则修剪] 无效:', r.pattern);
                return null;
              }
            })
            .filter(Boolean);
          
          const textMessages = lastMessages.map(m => {
            let text = (m.mes || m.original_mes || "").trim();
            regexList.forEach(regex => { text = text.replace(regex, ''); });
            return text;
          }).filter(Boolean);
          
          localStorage.setItem('cuttedLastMessages', JSON.stringify(textMessages));
          return textMessages;
        } catch (e) { return []; }
      }

      // ========== 生成面板 ==========
      let autoMode = false, tuoguanMode = false, autoEventHandler = null, tuoguanEventHandler = null;
      let processedMessageIds = new Set(), contentClickHandler = null;
      const AUTO_MODE_KEY = 'friendCircleAutoMode', TUOGUAN_MODE_KEY = 'friendCircleTuoguanMode';

      function getMessageId(msg) { return `${msg.send_date || ''}_${msg.mes ? msg.mes.substring(0, 50) : ''}_${msg.is_user}`; }

      function replaceRandomMacros(text) {
        const macros = JSON.parse(localStorage.getItem('friendCircleRandomMacros') || '[]').filter(m => m.enabled !== false);
        let result = text;
        macros.forEach(macro => {
          const pattern = new RegExp(`\\{\\{${macro.name}\\}\\}`, 'g');
          const randomValue = Math.floor(Math.random() * (macro.max - macro.min + 1)) + macro.min;
          result = result.replace(pattern, randomValue.toString());
        });
        return { text: result, replacements: {} };
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
            <button id="sp-gen-auto" style="padding: 8px 16px; background: ${autoMode ? '#A3C956' : '#D87E5E'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${autoMode ? '自动化(运行中)' : '自动化'}</button>
            <button id="sp-gen-tuoguan" style="padding: 8px 16px; background: ${tuoguanMode ? '#A3C956' : '#D87E5E'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${tuoguanMode ? '托管(运行中)' : '托管'}</button>
          </div>
          <div id="sp-gen-output" contenteditable="true" style="margin-top:8px;white-space:pre-wrap;max-height:200px;overflow-y:auto;padding:8px;border:1px solid #588254;border-radius:6px;background:#5B6262;color:#fff;min-height:60px;"></div>
        `;

        const PROMPTS_KEY = 'friendCircleUserPrompts', RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts';

        function loadUserPrompts() { try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); } catch { return []; } }
        function loadRandomPrompts() { try { return JSON.parse(localStorage.getItem(RANDOM_PROMPTS_KEY) || '[]'); } catch { return []; } }
        function getRandomPrompt() {
          const enabled = loadRandomPrompts().filter(p => p.enabled);
          if (enabled.length === 0) return null;
          return enabled[Math.floor(Math.random() * enabled.length)].text;
        }

        async function generateFriendCircle(selectedChat = []) {
          const url = localStorage.getItem('independentApiUrl'), key = localStorage.getItem('independentApiKey'), model = localStorage.getItem('independentApiModel');
          if (!url || !key || !model) { alert('请先配置独立 API'); return; }

          const sysDefaults = {
            systemMain: `你是文本处理助手。接下来会收到三部分信息：\n1. <WorldBook_Reference>：背景参考资料\n2. <ChatHistory_Reference>：聊天记录\n3. <Tasks>：具体任务要求\n\n请直接按<Tasks>中的要求输出结果。`,
            systemMiddle: `以上参考信息结束。接下来是任务要求：`,
            tasksWrapper: `注意：只输出摘要/处理结果本身。`,
            assistantPrefill: ``
          };
          const sysConfig = { ...sysDefaults, ...JSON.parse(localStorage.getItem('friendCircleSystemPrompts') || '{}') };

          const enabledPrompts = loadUserPrompts().filter(p => p.enabled).map(p => p.text);
          const randomPrompt = getRandomPrompt();
          const allPrompts = [...enabledPrompts];
          if (randomPrompt) allPrompts.push(randomPrompt);
          const replacedPrompts = allPrompts.map(p => replaceRandomMacros(p).text);

          let worldbookContent = [];
          try {
            const moduleWI = await import('/scripts/world-info.js');
            for (const [bookName, config] of Object.entries(JSON.parse(localStorage.getItem('friendCircleStaticConfig') || '{}'))) {
              if (config.enabledUids?.length > 0) {
                const worldInfo = await moduleWI.loadWorldInfo(config.fileId);
                config.enabledUids.forEach(uid => {
                  const entry = worldInfo.entries?.[uid];
                  if (entry?.content) worldbookContent.push(`【${bookName} - ${entry.title || '未命名'}】\n${entry.content}`);
                });
              }
            }
            for (const [bookName, config] of Object.entries(JSON.parse(localStorage.getItem('friendCircleDynamicConfig') || '{}'))) {
              if (config.enabledUids?.length > 0) {
                const worldInfo = await moduleWI.loadWorldInfo(config.fileId);
                config.enabledUids.forEach(uid => {
                  const entry = worldInfo.entries?.[uid];
                  if (entry?.content) worldbookContent.push(`【${bookName} - ${entry.title || '未命名'}】\n${entry.content}`);
                });
              }
            }
          } catch { }

          const messages = [{ role: "system", content: sysConfig.systemMain }];
          if (worldbookContent.length > 0) messages.push({ role: "user", content: `<WorldBook_Reference>\n${worldbookContent.join('\n\n')}\n</WorldBook_Reference>` });
          if (selectedChat.length > 0) messages.push({ role: "user", content: `<ChatHistory_Reference>\n${selectedChat.join('\n')}\n</ChatHistory_Reference>` });
          messages.push({ role: "system", content: sysConfig.systemMiddle });
          if (replacedPrompts.length > 0) messages.push({ role: "system", content: `<Tasks>\n${replacedPrompts.join('\n')}\n\n${sysConfig.tasksWrapper}\n</Tasks>` });
          if (sysConfig.assistantPrefill?.trim()) messages.push({ role: "assistant", content: sysConfig.assistantPrefill });

          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model, messages, max_tokens: 20000 })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const output = data.choices?.map(c => c.message?.content || '').join('\n') || '[未生成内容]';
            const outputEl = document.getElementById('sp-gen-output');
            if (outputEl) outputEl.textContent = output;
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
            if (autoEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler); } catch { } }
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
              try { const cutted = await getLastMessages(); await generateFriendCircle(cutted); } catch { }
            };
            eventSource.on(event_types.GENERATION_ENDED, autoEventHandler);
          } else {
            if (autoBtn) { autoBtn.textContent = '自动化'; autoBtn.style.background = '#D87E5E'; }
            if (autoEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler); autoEventHandler = null; } catch { } }
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
            if (tuoguanEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler); } catch { } }
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
            if (tuoguanEventHandler) { try { const { eventSource, event_types } = SillyTavern.getContext(); eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler); tuoguanEventHandler = null; } catch { } }
          }
        }

        if (localStorage.getItem(AUTO_MODE_KEY) === '1') toggleAutoMode(true);
        if (localStorage.getItem(TUOGUAN_MODE_KEY) === '1') toggleTuoguanMode(true);

        contentClickHandler = async (e) => {
          const target = e.target;
          if (target.id === 'sp-gen-now') {
            try { await getLastMessages(); const cutted = await getLastMessages(); generateFriendCircle(cutted); } catch (err) { debugLog('生成异常', err.message); }
          } else if (target.id === 'sp-gen-inject-input') {
            const texts = document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts) return alert('生成内容为空');
            const inputEl = document.getElementById('send_textarea');
            if (inputEl) { inputEl.value = texts; inputEl.dispatchEvent(new Event('input', { bubbles: true })); }
          } else if (target.id === 'sp-gen-inject-chat') {
            const texts = document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts) return alert('生成内容为空');
            const ctx = SillyTavern.getContext();
            if (!ctx?.chat?.length) return alert('未找到消息');
            const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
            if (!lastAiMes) return alert('未找到AI消息');
            const allMes = Array.from(document.querySelectorAll('.mes'));
            const aiMes = [...allMes].reverse().find(m => !m.classList.contains('user'));
            if (!aiMes) return alert('未找到DOM中的AI消息');
            simulateEditMessage(aiMes, lastAiMes.mes + '\n' + texts);
          } else if (target.id === 'sp-gen-inject-swipe') {
            const texts = document.getElementById('sp-gen-output')?.textContent.trim();
            if (!texts) return alert('生成内容为空');
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
