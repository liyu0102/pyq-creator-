import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced,saveChat } from "../../../../script.js";

(function () {
  const MODULE_NAME = 'pyq-creator';

  // 等待 ST 环境准备
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

      // 初始化 extensionSettings 存储
      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          apiConfig: {},
          prompts: [],
          chatConfig: { strength: 5, regexList: [] },
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      // 防重复
      if (document.getElementById('star-fab')) return;

     // 🌟按钮
const fab = document.createElement('div');
fab.id = 'star-fab';
fab.title = MODULE_NAME;
fab.innerText = '🌟';
fab.style.position = 'fixed';

// 如果有存储位置,用存储的位置;否则默认居中
const savedTop = localStorage.getItem('starFabTop');
const savedRight = localStorage.getItem('starFabRight');
if (savedTop && savedRight) {
  fab.style.top = savedTop;
  fab.style.right = savedRight;
} else {
  const centerTop = (window.innerHeight / 2 - 16) + 'px';
  const centerRight = (window.innerWidth / 2 - 16) + 'px';
  fab.style.top = centerTop;
  fab.style.right = centerRight;
}

fab.style.zIndex = '99999';
fab.style.cursor = 'grab';
fab.style.userSelect = 'none';
fab.style.fontSize = '22px';
fab.style.lineHeight = '28px';
fab.style.width = '32px';
fab.style.height = '32px';
fab.style.textAlign = 'center';
fab.style.borderRadius = '50%';
fab.style.background = 'transparent';
fab.style.boxShadow = 'none';
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
      panel.innerHTML = `
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

setTimeout(() => {
  const genBtn = panel.querySelector('.sp-btn[data-key="gen"]');
  if (genBtn) genBtn.click();
}, 0);

      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      function saveSettings() {
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
        else console.warn('saveSettingsDebounced not available');
      }

      function debugLog(...args) {
        const dbg = document.getElementById('sp-debug');
        if (dbg) dbg.innerText = args.join(' ');
        if (window.DEBUG_STAR_PANEL) console.log('[pyq-creator]', ...args);
      }

      const content = panel.querySelector('#sp-content-area');

     function showApiConfig() {
  const ctx = SillyTavern.getContext();
  const content = document.getElementById("sp-content-area");

  content.innerHTML = `
    <div style="padding: 12px; background: #4D4135; border-radius: 8px;">
      <h3 style="color: #A3C956; margin-bottom: 12px; text-shadow: none;">🔌 API配置</h3>
      <label style="color: #ddd; text-shadow: none;">API URL: <input type="text" id="api-url-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px;"></label><br><br>
      <label style="color: #ddd; text-shadow: none;">API Key: <input type="text" id="api-key-input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px;"></label><br><br>
      <label style="color: #ddd; text-shadow: none;">模型: <select id="api-model-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff; margin-top: 4px;"></select></label><br><br>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="api-save-btn" style="padding: 8px 16px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">保存配置</button>
        <button id="api-test-btn" style="padding: 8px 16px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">测试连接</button>
        <button id="api-refresh-models-btn" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新模型</button>
      </div>
      <div id="api-status" style="margin-top:8px;font-size:12px;color:#A3C956;text-shadow:none;"></div>
      <pre id="api-debug" style="margin-top:8px;font-size:12px;color:#ddd;white-space:pre-wrap;text-shadow:none;background:#5B6262;padding:8px;border-radius:4px;max-height:100px;overflow-y:auto;"></pre>
    </div>
  `;

  const modelSelect = document.getElementById("api-model-select");
  const debugArea = document.getElementById("api-debug");

  function debugLog(title, data) {
    console.log(title, data);
    debugArea.textContent = `${title}:\n${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }

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
    } catch {}
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

    Array.from(modelSelect.options).forEach(o => {
      if (o.value === model) o.textContent = model + "(已保存)";
      else if (o.textContent.endsWith("(已保存)")) o.textContent = o.value;
    });

    document.getElementById("api-status").textContent = "✅ 已保存";
    debugLog("保存API配置", { url, model });
  });

document.getElementById("api-test-btn").addEventListener("click", async () => {
  const urlRaw = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
  const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
  const model = modelSelect.value || localStorage.getItem("independentApiModel");

  if (!urlRaw || !key || !model) return alert("请完整填写API信息");

  const baseUrl = urlRaw.replace(/\/$/, "");
  document.getElementById("api-status").textContent = "正在向模型发送 ping ...";
  debugLog("测试连接开始", { baseUrl, model });

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 100
      })
    });

    if (!res.ok) throw new Error(`chat/completions 返回 ${res.status}`);

    const data = await res.json();
    document.getElementById("api-status").textContent = `✅ 模型 ${model} 可用(ping 成功)`;
    debugLog("ping 成功", data);

    if (data.choices && data.choices[0]?.message?.content) {
      console.log("模型返回:", data.choices[0].message.content);
    }
  } catch (e) {
    document.getElementById("api-status").textContent = "❌ 连接失败: " + (e.message || e);
    debugLog("ping 失败", e.message || e);
  }
});

  async function fetchAndPopulateModels(force = false) {
    const url = document.getElementById("api-url-input").value || localStorage.getItem("independentApiUrl");
    const key = document.getElementById("api-key-input").value || localStorage.getItem("independentApiKey");
    if (!url || !key) {
      document.getElementById("api-status").textContent = "请先填写 URL 和 Key";
      debugLog("拉取模型失败", "未配置 URL 或 Key");
      return;
    }

    const lastFetch = localStorage.getItem("independentApiModelsFetchedAt");
    if (!force && lastFetch) {
      const ts = new Date(parseInt(lastFetch, 10));
      document.getElementById("api-status").textContent = `模型已在 ${ts.toLocaleString()} 拉取过,请点击刷新`;
      return;
    }

    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${key}` }
      });
      const data = await res.json();
      debugLog("拉取模型原始返回", data);

      const ids = parseModelIdsFromResponse(data);
      if (ids.length === 0) throw new Error("未解析到模型");

      localStorage.setItem("independentApiModels", JSON.stringify(ids));
      localStorage.setItem("independentApiModelsFetchedAt", String(Date.now()));

      populateModelSelect(ids);
      document.getElementById("api-status").textContent = `✅ 已拉取 ${ids.length} 个模型`;
    } catch (e) {
      document.getElementById("api-status").textContent = "❌ 拉取失败: " + e.message;
      debugLog("拉取模型失败", e.message);
    }
  }

  function parseModelIdsFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data.data)) return data.data.map(m => m.id || m.model || m.name).filter(Boolean);
    if (Array.isArray(data.models)) return data.models.map(m => m.id || m.model || m.name).filter(Boolean);
    if (Array.isArray(data)) return data.map(m => m.id || m.model || m.name).filter(Boolean);
    if (data.model) return [data.model];
    if (data.id) return [data.id];
    return [];
  }

  document.getElementById("api-refresh-models-btn").addEventListener("click", async () => {
    debugLog("手动刷新模型", "");
    await fetchAndPopulateModels(true);
  });

  fetchAndPopulateModels(false);
}

// ========== 系统提示词配置面板 ==========
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
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    content.innerHTML = `
    <div style="padding: 12px; background: #2a2a3e; border-radius: 8px; max-width: 700px; margin: 0 auto;">
        <h3 style="color: #fff; margin-bottom: 16px; text-shadow: none;">⚙️ 系统提示词配置</h3>
        <p style="color: #aaa; font-size: 12px; margin-bottom: 16px; text-shadow: none;">
            这些是发送给摘要API的系统级指令，修改后点击保存生效
        </p>
        
        <div style="margin-bottom: 16px;">
            <label style="color: #fff; display: block; margin-bottom: 6px; text-shadow: none;">
                📌 主系统提示词（开头的角色设定）
            </label>
            <textarea id="sp-sys-main" rows="6" style="
                width: 100%; 
                padding: 8px; 
                border-radius: 4px; 
                background: #1a1a2e; 
                color: #fff; 
                border: 1px solid #444;
                resize: vertical;
                text-shadow: none;
            ">${escapeHtml(config.systemMain)}</textarea>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="color: #fff; display: block; margin-bottom: 6px; text-shadow: none;">
                📌 过渡提示词（世界书和聊天记录之后，任务之前）
            </label>
            <textarea id="sp-sys-middle" rows="3" style="
                width: 100%; 
                padding: 8px; 
                border-radius: 4px; 
                background: #1a1a2e; 
                color: #fff; 
                border: 1px solid #444;
                resize: vertical;
                text-shadow: none;
            ">${escapeHtml(config.systemMiddle)}</textarea>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="color: #fff; display: block; margin-bottom: 6px; text-shadow: none;">
                📌 任务包装后缀（加在 &lt;Tasks&gt; 末尾的提醒）
            </label>
            <textarea id="sp-sys-tasks" rows="2" style="
                width: 100%; 
                padding: 8px; 
                border-radius: 4px; 
                background: #1a1a2e; 
                color: #fff; 
                border: 1px solid #444;
                resize: vertical;
                text-shadow: none;
            ">${escapeHtml(config.tasksWrapper)}</textarea>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="color: #fff; display: block; margin-bottom: 6px; text-shadow: none;">
                📌 Assistant预填充（可选，留空=不使用）
            </label>
            <textarea id="sp-sys-prefill" rows="2" placeholder="留空表示不预填充" style="
                width: 100%; 
                padding: 8px; 
                border-radius: 4px; 
                background: #1a1a2e; 
                color: #fff; 
                border: 1px solid #444;
                resize: vertical;
                text-shadow: none;
            ">${escapeHtml(config.assistantPrefill)}</textarea>
            <p style="color: #888; font-size: 11px; margin-top: 4px; text-shadow: none;">
                ⚠️ 对Claude建议留空，对Gemini可能需要填写
            </p>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button id="sp-sys-save" style="
                flex: 1;
                padding: 10px; 
                background: #28a745; 
                color: white; 
                border: none; 
                border-radius: 4px;
                cursor: pointer;
            ">💾 保存配置</button>
            
            <button id="sp-sys-reset" style="
                padding: 10px 20px; 
                background: #dc3545; 
                color: white; 
                border: none; 
                border-radius: 4px;
                cursor: pointer;
            ">🔄 恢复默认</button>
        </div>
        
        <div id="sp-sys-status" style="margin-top: 10px; color: #4caf50; font-size: 12px; text-shadow: none;"></div>
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
        debugLog('系统提示词配置已保存', newConfig);
    });
    
    document.getElementById('sp-sys-reset').addEventListener('click', () => {
        if (confirm('确定要恢复默认提示词吗？')) {
            localStorage.removeItem('friendCircleSystemPrompts');
            showSystemPromptConfig();
            debugLog('系统提示词已恢复默认');
        }
    });
    
    debugLog('进入 系统提示词配置面板');
}

      function showPromptConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #A3C956; margin-bottom: 12px; text-shadow: none;">📝 固定提示词配置</h3>
            <textarea rows="3" id="sp-prompt-text" placeholder="输入提示词" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254;"></textarea><br>
            <div id="sp-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #588254; padding-top: 6px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                <input type="text" id="sp-prompt-search" placeholder="按标签搜索" style="flex: 1; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254;">
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
            if (promptTagFilter && !p.tags.some(tag => tag.toLowerCase().includes(promptTagFilter))) {
                return;
            }

            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.borderBottom = '1px solid #588254';
            div.style.paddingBottom = '6px';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = p.enabled || false;
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', () => {
                friendCirclePrompts[idx].enabled = checkbox.checked;
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            });

            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.flex = '1';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            span.style.whiteSpace = 'nowrap';
            span.style.color = '#ddd';
            span.style.textShadow = 'none';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.marginLeft = '8px';
            editBtn.style.padding = '4px 8px';
            editBtn.style.background = '#D87E5E';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '3px';
            editBtn.style.cursor = 'pointer';
            editBtn.addEventListener('click', () => {
                const textarea = document.createElement('textarea');
                textarea.value = p.text;
                textarea.style.flex = '1';
                textarea.style.minHeight = '60px';
                textarea.style.resize = 'vertical';
                textarea.style.background = '#5B6262';
                textarea.style.color = '#fff';
                textarea.style.border = '1px solid #588254';
                textarea.style.borderRadius = '4px';
                row.replaceChild(textarea, span);

                textarea.addEventListener('blur', () => {
                    const newText = textarea.value.trim();
                    if (newText) {
                        friendCirclePrompts[idx].text = newText;
                        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                    }
                    renderPromptList();
                });
                textarea.focus();
            });

            const tagBtn = document.createElement('button');
            tagBtn.textContent = '🏷️';
            tagBtn.style.marginLeft = '8px';
            tagBtn.style.padding = '4px 8px';
            tagBtn.style.background = '#588254';
            tagBtn.style.border = 'none';
            tagBtn.style.borderRadius = '3px';
            tagBtn.style.cursor = 'pointer';
            tagBtn.addEventListener('click', () => {
                const newTag = prompt('输入标签:');
                if (newTag) {
                    if (!Array.isArray(friendCirclePrompts[idx].tags)) {
                        friendCirclePrompts[idx].tags = [];
                    }
                    friendCirclePrompts[idx].tags.push(newTag);
                    localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                    renderPromptList();
                }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.marginLeft = '8px';
            delBtn.style.padding = '4px 8px';
            delBtn.style.background = '#D87E5E';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '3px';
            delBtn.style.cursor = 'pointer';
            delBtn.addEventListener('click', () => {
                friendCirclePrompts.splice(idx, 1);
                localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
                renderPromptList();
            });

            row.appendChild(checkbox);
            row.appendChild(span);
            row.appendChild(editBtn);
            row.appendChild(tagBtn);
            row.appendChild(delBtn);

            div.appendChild(row);

            if (p.tags && p.tags.length > 0) {
                const tagsRow = document.createElement('div');
                tagsRow.style.marginLeft = '20px';
                tagsRow.style.marginTop = '6px';

                p.tags.forEach((t, tIdx) => {
                    const tagEl = document.createElement('span');
                    tagEl.textContent = t;
                    tagEl.style.display = 'inline-block';
                    tagEl.style.padding = '4px 8px';
                    tagEl.style.margin = '0 6px 6px 0';
                    tagEl.style.fontSize = '12px';
                    tagEl.style.borderRadius = '10px';
                    tagEl.style.background = '#588254';
                    tagEl.style.color = '#fff';
                    tagEl.style.cursor = 'pointer';
                    tagEl.style.textShadow = 'none';
                    tagEl.title = '点击删除标签';
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
        debugLog('保存用户自定义提示词', friendCirclePrompts);
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
    debugLog('进入 提示词配置面板');
}

      function showRandomPromptConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #D87E5E; margin-bottom: 12px; text-shadow: none;">🎲 随机提示词配置</h3>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 12px; text-shadow: none;">每次生成时将从所有已开启的随机提示词中随机抽取1条</p>
            <textarea rows="3" id="sp-random-prompt-text" placeholder="输入随机提示词" style="width: 100%; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254;"></textarea><br>
            <div id="sp-random-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #588254; padding-top: 6px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                <input type="text" id="sp-random-prompt-search" placeholder="按标签搜索" style="flex: 1; padding: 8px; border-radius: 4px; background: #5B6262; color: #fff; border: 1px solid #588254;">
                <button id="sp-random-prompt-search-btn" style="padding: 8px 16px; border-radius: 4px; background: #588254; color: white; border: none; cursor: pointer;">搜索</button>
            </div>
            <button id="save-random-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background: #D87E5E; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">保存随机提示词</button>
        </div>
    `;

    const RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts';
    let randomPrompts = [];
    let randomPromptTagFilter = "";

    function loadRandomPrompts() {
        const raw = localStorage.getItem(RANDOM_PROMPTS_KEY);
        randomPrompts = raw ? JSON.parse(raw) : [];
        return randomPrompts;
    }

    function renderRandomPromptList() {
        const container = document.getElementById('sp-random-prompt-list');
        container.innerHTML = '';

        randomPrompts.forEach((p, idx) => {
            if (randomPromptTagFilter && !p.tags.some(tag => tag.toLowerCase().includes(randomPromptTagFilter))) {
                return;
            }

            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.borderBottom = '1px solid #588254';
            div.style.paddingBottom = '6px';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = p.enabled || false;
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', () => {
                randomPrompts[idx].enabled = checkbox.checked;
                localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
            });

            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.flex = '1';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            span.style.whiteSpace = 'nowrap';
            span.style.color = '#ddd';
            span.style.textShadow = 'none';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.marginLeft = '8px';
            editBtn.style.padding = '4px 8px';
            editBtn.style.background = '#D87E5E';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '3px';
            editBtn.style.cursor = 'pointer';
            editBtn.addEventListener('click', () => {
                const textarea = document.createElement('textarea');
                textarea.value = p.text;
                textarea.style.flex = '1';
                textarea.style.minHeight = '60px';
                textarea.style.resize = 'vertical';
                textarea.style.background = '#5B6262';
                textarea.style.color = '#fff';
                textarea.style.border = '1px solid #588254';
                textarea.style.borderRadius = '4px';
                row.replaceChild(textarea, span);

                textarea.addEventListener('blur', () => {
                    const newText = textarea.value.trim();
                    if (newText) {
                        randomPrompts[idx].text = newText;
                        localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
                    }
                    renderRandomPromptList();
                });
                textarea.focus();
            });

            const tagBtn = document.createElement('button');
            tagBtn.textContent = '🏷️';
            tagBtn.style.marginLeft = '8px';
            tagBtn.style.padding = '4px 8px';
            tagBtn.style.background = '#588254';
            tagBtn.style.border = 'none';
            tagBtn.style.borderRadius = '3px';
            tagBtn.style.cursor = 'pointer';
            tagBtn.addEventListener('click', () => {
                const newTag = prompt('输入标签:');
                if (newTag) {
                    if (!Array.isArray(randomPrompts[idx].tags)) {
                        randomPrompts[idx].tags = [];
                    }
                    randomPrompts[idx].tags.push(newTag);
                    localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
                    renderRandomPromptList();
                }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.marginLeft = '8px';
            delBtn.style.padding = '4px 8px';
            delBtn.style.background = '#D87E5E';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '3px';
            delBtn.style.cursor = 'pointer';
            delBtn.addEventListener('click', () => {
                randomPrompts.splice(idx, 1);
                localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
                renderRandomPromptList();
            });

            row.appendChild(checkbox);
            row.appendChild(span);
            row.appendChild(editBtn);
            row.appendChild(tagBtn);
            row.appendChild(delBtn);

            div.appendChild(row);

            if (p.tags && p.tags.length > 0) {
                const tagsRow = document.createElement('div');
                tagsRow.style.marginLeft = '20px';
                tagsRow.style.marginTop = '6px';

                p.tags.forEach((t, tIdx) => {
                    const tagEl = document.createElement('span');
                    tagEl.textContent = t;
                    tagEl.style.display = 'inline-block';
                    tagEl.style.padding = '4px 8px';
                    tagEl.style.margin = '0 6px 6px 0';
                    tagEl.style.fontSize = '12px';
                    tagEl.style.borderRadius = '10px';
                    tagEl.style.background = '#D87E5E';
                    tagEl.style.color = '#fff';
                    tagEl.style.cursor = 'pointer';
                    tagEl.style.textShadow = 'none';
                    tagEl.title = '点击删除标签';
                    tagEl.addEventListener('click', () => {
                        randomPrompts[idx].tags.splice(tIdx, 1);
                        localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
                        renderRandomPromptList();
                    });
                    tagsRow.appendChild(tagEl);
                });

                div.appendChild(tagsRow);
            }

            container.appendChild(div);
        });
    }

    document.getElementById('sp-random-prompt-search-btn').addEventListener('click', () => {
        randomPromptTagFilter = document.getElementById('sp-random-prompt-search').value.trim().toLowerCase();
        renderRandomPromptList();
    });

    document.getElementById('save-random-prompts-btn').addEventListener('click', () => {
        localStorage.setItem(RANDOM_PROMPTS_KEY, JSON.stringify(randomPrompts));
        alert('随机提示词已保存');
        debugLog('保存随机提示词', randomPrompts);
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
    debugLog('进入 随机提示词配置面板');
}
      function showRandomMacroConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #4D4135; border-radius: 8px; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <h3 style="color: #A3C956; margin-bottom: 12px; text-shadow: none;">🎯 随机数宏配置</h3>
            <p style="color: #ddd; font-size: 12px; margin-bottom: 12px; text-shadow: none;">
                每次生成前会自动替换提示词中的随机数宏(如 {{number1}})为随机数值
            </p>
            
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <input type="number" id="sp-macro-min" placeholder="最小值" 
                    style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff;">
                <input type="number" id="sp-macro-max" placeholder="最大值" 
                    style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff;">
                <button id="sp-add-macro-btn" style="padding: 8px 16px; background: #588254; color: white; border: none; border-radius: 4px; white-space: nowrap; cursor: pointer;">
                    添加随机数宏
                </button>
            </div>
            
            <div id="sp-macro-list" style="max-height: 250px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;">
                <div style="color: #ddd; text-align: center; padding: 20px; text-shadow: none;">暂无随机数宏,点击上方按钮添加</div>
            </div>
            
            <button id="sp-save-macros-btn" style="margin-top: 12px; padding: 10px; width: 100%; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">
                保存配置
            </button>
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
            container.innerHTML = '<div style="color: #ddd; text-align: center; padding: 20px; text-shadow: none;">暂无随机数宏,点击上方按钮添加</div>';
            return;
        }

        randomMacros.forEach((macro, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '4px';
            div.style.marginBottom = '4px';
            div.style.borderBottom = '1px solid #588254';
            div.style.paddingBottom = '4px';
            div.style.flexWrap = 'nowrap';
            div.style.lineHeight = '1.2';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = macro.enabled !== false;
            checkbox.style.marginRight = '2px';
            checkbox.style.transform = 'scale(0.9)';
            checkbox.style.flexShrink = '0';
            checkbox.addEventListener('change', () => {
                randomMacros[idx].enabled = checkbox.checked;
                localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
            });

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `{{${macro.name}}}`;
            nameSpan.style.fontWeight = 'bold';
            nameSpan.style.color = '#A3C956';
            nameSpan.style.fontSize = '12px';
            nameSpan.style.flexShrink = '0';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.textShadow = 'none';

            const rangeSpan = document.createElement('span');
            rangeSpan.textContent = `[${macro.min} ~ ${macro.max}]`;
            rangeSpan.style.color = '#ddd';
            rangeSpan.style.fontSize = '11px';
            rangeSpan.style.flexShrink = '0';
            rangeSpan.style.whiteSpace = 'nowrap';
            rangeSpan.style.marginRight = 'auto';
            rangeSpan.style.textShadow = 'none';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.padding = '2px 6px';
            editBtn.style.fontSize = '12px';
            editBtn.style.lineHeight = '1';
            editBtn.style.flexShrink = '0';
            editBtn.style.background = '#D87E5E';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '3px';
            editBtn.style.cursor = 'pointer';
            editBtn.addEventListener('click', () => {
                const newMin = prompt('输入最小值:', macro.min);
                if (newMin === null) return;
                const newMax = prompt('输入最大值:', macro.max);
                if (newMax === null) return;
                
                const min = parseInt(newMin, 10);
                const max = parseInt(newMax, 10);
                
                if (isNaN(min) || isNaN(max) || min > max) {
                    alert('输入无效,请确保最小值≤最大值');
                    return;
                }
                
                randomMacros[idx].min = min;
                randomMacros[idx].max = max;
                localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
                renderMacroList();
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.padding = '2px 6px';
            delBtn.style.fontSize = '12px';
            delBtn.style.lineHeight = '1';
            delBtn.style.flexShrink = '0';
            delBtn.style.background = '#D87E5E';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '3px';
            delBtn.style.cursor = 'pointer';
            delBtn.addEventListener('click', () => {
                if (confirm(`确定删除 {{${macro.name}}} ?`)) {
                    randomMacros.splice(idx, 1);
                    localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
                    renderMacroList();
                }
            });

            div.appendChild(checkbox);
            div.appendChild(nameSpan);
            div.appendChild(rangeSpan);
            div.appendChild(editBtn);
            div.appendChild(delBtn);

            container.appendChild(div);
        });
    }

    document.getElementById('sp-add-macro-btn').addEventListener('click', () => {
        const minInput = document.getElementById('sp-macro-min');
        const maxInput = document.getElementById('sp-macro-max');
        
        const min = parseInt(minInput.value, 10);
        const max = parseInt(maxInput.value, 10);
        
        if (isNaN(min) || isNaN(max)) {
            alert('请输入有效的数字');
            return;
        }
        
        if (min > max) {
            alert('最小值不能大于最大值');
            return;
        }
        
        const existingNumbers = randomMacros
            .map(m => m.name.match(/^number(\d+)$/))
            .filter(Boolean)
            .map(m => parseInt(m[1], 10));
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        const macroName = `number${nextNumber}`;
        
        randomMacros.push({
            name: macroName,
            min: min,
            max: max,
            enabled: true
        });
        
        localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
        
        minInput.value = '';
        maxInput.value = '';
        
        renderMacroList();
        debugLog(`添加随机数宏: {{${macroName}}} [${min} ~ ${max}]`);
    });

    document.getElementById('sp-save-macros-btn').addEventListener('click', () => {
        localStorage.setItem(MACROS_KEY, JSON.stringify(randomMacros));
        alert('随机数宏配置已保存');
        debugLog('保存随机数宏配置', randomMacros);
    });

    loadRandomMacros();
    renderMacroList();
    debugLog('进入 随机数宏配置面板');
}

 function showChatConfig() {
    const content = document.getElementById('sp-content-area');
    content.innerHTML = `
    <div style="padding:12px; background:#4D4135; color:#fff; border-radius:8px; max-width:500px; margin:0 auto;">
        <h3 style="color: #A3C956; margin-bottom: 12px; text-shadow: none;">💬 聊天配置</h3>
        <div id="sp-chat-slider-container" style="display:flex; align-items:center; margin-bottom:12px;">
            <span style="margin-right:10px; color: #ddd; text-shadow: none;">读取聊天条数: </span>
            <input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1;">
            <span id="sp-chat-slider-value" style="margin-left:4px; color: #A3C956; text-shadow: none;">10</span>
        </div>

        <div style="margin-bottom:12px;">
            <h4 style="color: #D87E5E; text-shadow: none;">正则修剪列表</h4>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input type="text" id="sp-new-regex" placeholder="<example></example>" style="flex:1; padding: 8px; border-radius: 4px; border: 1px solid #588254; background: #5B6262; color: #fff;">
                <button id="sp-add-regex" style="padding: 8px 12px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">添加</button>
            </div>
            <div id="sp-regex-list" style="max-height:200px; overflow-y:auto; border:1px solid #588254; padding:6px; border-radius:6px; background: #5B6262;"></div>
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
        debugLog(`已设置读取聊天条数为 ${sliderInput.value}`);
        fetchAndCountMessages();
    });

    const regexListContainer = document.getElementById('sp-regex-list');
    const addRegexInput = document.getElementById('sp-new-regex');
    const addRegexButton = document.getElementById('sp-add-regex');

    function loadRegexList() {
        const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
        regexListContainer.innerHTML = '';
        list.forEach((item, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.marginBottom = '4px';
            div.style.gap = '4px';
            div.style.borderBottom = '1px solid #588254';
            div.style.paddingBottom = '4px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.enabled;
            checkbox.addEventListener('change', () => {
                list[idx].enabled = checkbox.checked;
                localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
            });

            const text = document.createElement('span');
            text.textContent = item.pattern;
            text.style.flex = '1';
            text.style.wordBreak = 'break-all';
            text.style.color = '#ddd';
            text.style.textShadow = 'none';

            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.style.padding = '4px 8px';
            editBtn.style.background = '#D87E5E';
            editBtn.style.color = 'white';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '3px';
            editBtn.style.cursor = 'pointer';
            editBtn.addEventListener('click', () => {
                const newVal = prompt('编辑正则', item.pattern);
                if (newVal !== null) {
                    list[idx].pattern = newVal;
                    localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
                    loadRegexList();
                }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.style.padding = '4px 8px';
            delBtn.style.background = '#D87E5E';
            delBtn.style.color = 'white';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '3px';
            delBtn.style.cursor = 'pointer';
            delBtn.addEventListener('click', () => {
                list.splice(idx, 1);
                localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
                loadRegexList();
            });

            div.appendChild(checkbox);
            div.appendChild(text);
            div.appendChild(editBtn);
            div.appendChild(delBtn);
            regexListContainer.appendChild(div);
        });
        regexListContainer.scrollTop = regexListContainer.scrollHeight;
    }

    addRegexButton.addEventListener('click', () => {
        const val = addRegexInput.value.trim();
        if (!val) return;
        const list = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
        list.push({ pattern: val, enabled: true });
        localStorage.setItem('friendCircleRegexList', JSON.stringify(list));
        addRegexInput.value = '';
        loadRegexList();
    });

    loadRegexList();

function renderMessagesForDebug(messages) {
    const debugArea = document.getElementById('sp-debug');
    if (!debugArea) return;

    debugArea.innerHTML = '';
    messages.forEach((text, i) => {
        const div = document.createElement('div');
        div.textContent = `[${i}] ${text}`;
        div.style.padding = '2px 0';
        div.style.borderBottom = '1px solid #588254';
        div.style.color = '#ddd';
        div.style.textShadow = 'none';
        debugArea.appendChild(div);
    });
}

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
                    const tagMatch = r.pattern.match(/^<(\w+)>.*<\/\1>$/);
                    if (tagMatch) {
                        const tag = tagMatch[1];
                        return new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
                    }
                    return new RegExp(r.pattern, 'g');
                } catch (e) {
                    console.warn('[FocusMode] 无效正则:', r.pattern, e);
                    return null;
                }
            })
            .filter(Boolean);

        const textMessages = lastMessages
            .map(m => {
                let text = (m.mes || m.original_mes || "").trim();
                regexList.forEach(regex => {
                    text = text.replace(regex, '');
                });
                return text;
            })
            .filter(Boolean);

        debugLog(`提取到最后 ${textMessages.length} 条消息(已正则修剪)`);
        return textMessages;
    } catch (e) {
        console.error('getLastMessages 出错', e);
        return [];
    }
}
    async function fetchAndCountMessages() {
        await getLastMessages();
    }

    fetchAndCountMessages();
    debugLog('进入 聊天配置面板');
}

async function showWorldbookPanel() {
    content.innerHTML = `
    <div style="padding: 12px; background: #4D4135; border-radius: 8px; max-width: 800px; margin: 0 auto;">
        <h3 style="color: #A3C956; margin-bottom: 12px; text-shadow: none;">📚 世界书配置</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
            <input type="text" id="sp-worldbook-input" placeholder="输入世界书名称(如 realworld)" style="
                flex: 1; 
                padding: 6px 8px; 
                border-radius: 4px; 
                height: 32px; 
                font-size: 14px;
                box-sizing: border-box;
                min-width: 0;
                background: #5B6262;
                color: #fff;
                border: 1px solid #588254;
            ">
            <button id="sp-search-btn" style="
                padding: 6px 10px; 
                background: #588254; 
                color: white; 
                border: none; 
                border-radius: 4px;
                height: 32px;
                font-size: 14px;
                white-space: nowrap;
                cursor: pointer;
                box-sizing: border-box;
            ">🔎</button>
            <button id="sp-robot-btn" style="
                padding: 6px 10px; 
                background: #D87E5E; 
                color: white; 
                border: none; 
                border-radius: 4px;
                height: 32px;
                font-size: 14px;
                white-space: nowrap;
                cursor: pointer;
                box-sizing: border-box;
            ">🤖</button>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <label style="color: #ddd; text-shadow: none;"><input type="checkbox" id="sp-select-all"> 全选</label>
            <label style="color: #ddd; text-shadow: none;"><input type="checkbox" id="sp-deselect-all"> 全不选</label>
        </div>
        <div id="sp-entries-list" style="max-height: 100px; overflow-y: auto; border: 1px solid #588254; padding: 8px; background: #5B6262; border-radius: 4px;">
            <div style="color: #ddd; text-align: center; text-shadow: none;">点击搜索按钮加载世界书条目</div>
        </div>
        <button id="sp-save-config" style="margin-top: 12px; padding: 8px; width: 100%; background: #A3C956; color: #4D4135; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">保存配置</button>
        <div id="sp-worldbook-status" style="margin-top: 8px; font-size: 12px; color: #A3C956; text-shadow: none;"></div>
    </div>
`;

    const STATIC_CONFIG_KEY = 'friendCircleStaticConfig';
    const DYNAMIC_CONFIG_KEY = 'friendCircleDynamicConfig';
    let currentWorldbookName = '';
    let currentFileId = '';
    let currentEntries = {};
    let currentMode = '';
    let currentConfig = {};

    let moduleWI;
    try {
        moduleWI = await import('/scripts/world-info.js');
    } catch (e) {
        document.getElementById('sp-worldbook-status').textContent = '❌ world-info.js 加载失败';
        console.error('Worldbook panel: import failed', e);
        return;
    }

    function saveCurrentConfig() {
        if (!currentWorldbookName || !currentMode) return;
        const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
        const checkedUids = Array.from(document.querySelectorAll('#sp-entries-list input[type="checkbox"]:checked'))
            .map(cb => cb.dataset.uid);
        currentConfig[currentWorldbookName] = {
            fileId: currentFileId,
            enabledUids: checkedUids
        };
        localStorage.setItem(configKey, JSON.stringify(currentConfig));
        updateStatus(`✅ ${currentMode === 'static' ? '静态' : '动态'} 配置已保存: ${checkedUids.length} 个条目启用`);
        debugLog(`世界书 ${currentMode} 配置保存: ${currentWorldbookName}, 启用 ${checkedUids.length} 条`);
    }

    function renderEntries(entries, enabledUids = []) {
        const container = document.getElementById('sp-entries-list');
        container.innerHTML = '';
        let count = 0;
        Object.keys(entries).forEach(id => {
            const entry = entries[id];
            if (entry.disable) return;
            count++;
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'flex-start';
            div.style.gap = '8px';
            div.style.marginBottom = '6px';
            div.style.padding = '4px';
            div.style.borderBottom = '1px solid #588254';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.uid = id;
            checkbox.checked = enabledUids.includes(id);
            checkbox.style.marginTop = '2px';
            checkbox.addEventListener('change', saveCurrentConfig);

            const titleSpan = document.createElement('strong');
            titleSpan.textContent = entry.title || entry.key || '无标题';
            titleSpan.style.flex = '1';
            titleSpan.style.color = '#A3C956';
            titleSpan.style.textShadow = 'none';

            const contentSpan = document.createElement('div');
            contentSpan.textContent = (entry.content || '').substring(0, 150) + (entry.content && entry.content.length > 150 ? '...' : '');
            contentSpan.style.fontSize = '12px';
            contentSpan.style.color = '#ddd';
            contentSpan.style.marginLeft = '8px';
            contentSpan.style.textShadow = 'none';

            div.append(checkbox, titleSpan, contentSpan);
            container.appendChild(div);
        });
        updateStatus(`加载 ${count} 个条目`);
    }

    document.getElementById('sp-select-all').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            });
        }
    });
    document.getElementById('sp-deselect-all').addEventListener('change', (e) => {
        e.target.checked = false;
        document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
    });

    async function searchWorldbook(isDynamic = false) {
        const input = document.getElementById('sp-worldbook-input');
        currentWorldbookName = input.value.trim();
        if (!currentWorldbookName) return alert('请输入世界书名称');
        currentMode = isDynamic ? 'dynamic' : 'static';

        const selected = moduleWI.selected_world_info || [];
        currentFileId = selected.find(wi => wi.toLowerCase().includes(currentWorldbookName.toLowerCase()));
        if (!currentFileId) return alert(`未找到包含 "${currentWorldbookName}" 的世界书`);

        try {
            const worldInfo = await moduleWI.loadWorldInfo(currentFileId);
            currentEntries = worldInfo.entries || {};

            const configKey = currentMode === 'static' ? STATIC_CONFIG_KEY : DYNAMIC_CONFIG_KEY;
            currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            const savedConfig = currentConfig[currentWorldbookName];
            const enabledUids = savedConfig?.enabledUids || [];

            renderEntries(currentEntries, enabledUids);
            updateStatus(`✅ ${currentMode === 'static' ? '静态' : '动态'} 搜索成功: ${currentFileId}`);
            debugLog(`世界书搜索: ${currentMode} ${currentWorldbookName} -> ${Object.keys(currentEntries).length} 条目`);
        } catch (e) {
            updateStatus('❌ 加载世界书失败: ' + e.message);
            console.error('Worldbook load failed', e);
        }
    }

    document.getElementById('sp-search-btn').addEventListener('click', () => searchWorldbook(false));
    document.getElementById('sp-robot-btn').addEventListener('click', () => searchWorldbook(true));
    document.getElementById('sp-worldbook-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById(currentMode === 'dynamic' ? 'sp-robot-btn' : 'sp-search-btn').click();
    });
    document.getElementById('sp-save-config').addEventListener('click', saveCurrentConfig);

    function updateStatus(msg) {
        document.getElementById('sp-worldbook-status').textContent = msg;
    }

    debugLog('进入 世界书配置面板');
}

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
                    const tagMatch = r.pattern.match(/^<(\w+)>.*<\/\1>$/);
                    if (tagMatch) {
                        const tag = tagMatch[1];
                        return new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
                    }
                    return new RegExp(r.pattern, 'g');
                } catch (e) {
                    console.warn('[FocusMode] 无效正则:', r.pattern, e);
                    return null;
                }
            })
            .filter(Boolean);

        const textMessages = lastMessages
            .map(m => {
                let text = (m.mes || m.original_mes || "").trim();
                regexList.forEach(regex => {
                    text = text.replace(regex, '');
                });
                return text;
            })
            .filter(Boolean);

        localStorage.setItem('cuttedLastMessages', JSON.stringify(textMessages));

        debugLog(`提取到最后 ${textMessages.length} 条消息(已正则修剪)`, textMessages.slice(0, 5));
        return textMessages;
    } catch (e) {
        console.error('getLastMessages 出错', e);
        return [];
    }
}


let autoMode = false;
let tuoguanMode = false;
let autoEventHandler = null;
let tuoguanEventHandler = null;
let processedMessageIds = new Set();
let contentClickHandler = null;

const AUTO_MODE_KEY = 'friendCircleAutoMode';
const TUOGUAN_MODE_KEY = 'friendCircleTuoguanMode';

function getMessageId(msg) {
    return `${msg.send_date || ''}_${msg.mes ? msg.mes.substring(0, 50) : ''}_${msg.is_user}`;
}

function replaceRandomMacros(text) {
    const MACROS_KEY = 'friendCircleRandomMacros';
    const macros = JSON.parse(localStorage.getItem(MACROS_KEY) || '[]');
    
    const enabledMacros = macros.filter(m => m.enabled !== false);
    
    let result = text;
    const replacements = {};
    
    enabledMacros.forEach(macro => {
        const pattern = new RegExp(`\\{\\{${macro.name}\\}\\}`, 'g');
        const randomValue = Math.floor(Math.random() * (macro.max - macro.min + 1)) + macro.min;
        result = result.replace(pattern, randomValue.toString());
        replacements[macro.name] = randomValue;
    });
    
    return { text: result, replacements };
}

function showGenPanel() {  
    const content = document.getElementById('sp-content-area');  
    
    if (contentClickHandler) {
        content.removeEventListener('click', contentClickHandler);
        contentClickHandler = null;
    }
    
    content.innerHTML = `  
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <button id="sp-gen-now" style="padding: 8px 16px; background: #588254; color: white; border: none; border-radius: 4px; cursor: pointer;">立刻生成</button>  
            <button id="sp-gen-inject-input" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入输入框</button>  
            <button id="sp-gen-inject-chat" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入聊天</button>  
            <button id="sp-gen-inject-swipe" style="padding: 8px 16px; background: #5B6262; color: white; border: none; border-radius: 4px; cursor: pointer;">注入swipe</button>  
            <button id="sp-gen-auto" style="padding: 8px 16px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">自动化</button>
            <button id="sp-gen-tuoguan" style="padding: 8px 16px; background: #D87E5E; color: white; border: none; border-radius: 4px; cursor: pointer;">托管</button>  
        </div>
        <div id="sp-gen-output" class="sp-output" contenteditable="true" style="  
            margin-top:8px;  
            white-space: pre-wrap;  
            max-height: 200px;  
            overflow-y: auto;  
            padding: 8px;  
            border: 1px solid #588254;  
            border-radius: 6px;  
            background: #5B6262;  
            color: #fff;
            text-shadow: none;  
        "></div>  
    `;  
    
    const PROMPTS_KEY = 'friendCircleUserPrompts';
    const RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts';
    const debugArea = document.getElementById('sp-debug');
    
    function debugLog(...args) {  
        if (debugArea) debugArea.innerText += args.join(' ') + '\n';  
        console.log('[星标拓展-生成]', ...args);  
    }  
    
    function loadUserPrompts() {  
        try {  
            const raw = localStorage.getItem(PROMPTS_KEY);  
            return raw ? JSON.parse(raw) : [];  
        } catch (e) {  
            console.error('加载提示词失败', e);  
            return [];  
        }  
    }

    function loadRandomPrompts() {  
        try {  
            const raw = localStorage.getItem(RANDOM_PROMPTS_KEY);  
            return raw ? JSON.parse(raw) : [];  
        } catch (e) {  
            console.error('加载随机提示词失败', e);  
            return [];  
        }  
    }

    function getRandomPrompt() {
        const randomPrompts = loadRandomPrompts();
        const enabledRandomPrompts = randomPrompts.filter(p => p.enabled);
        
        if (enabledRandomPrompts.length === 0) {
            debugLog('随机提示词:没有启用的随机提示词');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * enabledRandomPrompts.length);
        const selected = enabledRandomPrompts[randomIndex];
        debugLog(`随机提示词:从 ${enabledRandomPrompts.length} 条中抽取了第 ${randomIndex + 1} 条`);
        return selected.text;
    }
    
    async function generateFriendCircle(selectedChat = [], selectedWorldbooks = []) {
        const url = localStorage.getItem('independentApiUrl');
        const key = localStorage.getItem('independentApiKey');
        const model = localStorage.getItem('independentApiModel');
        
        if (!url || !key || !model) {
            alert('请先配置独立 API 并保存');
            return;
        }
        
        const sysPromptDefaults = {
            systemMain: `你是文本处理助手。接下来会收到三部分信息：
1. <WorldBook_Reference>：背景参考资料（仅参考，不输出）
2. <ChatHistory_Reference>：聊天记录（仅参考，不输出）
3. <Tasks>：具体任务要求

请直接按<Tasks>中的要求输出结果，不要添加任何开场白、解释或确认语句。`,
            systemMiddle: `以上参考信息结束。接下来是任务要求，请直接输出结果内容：`,
            tasksWrapper: `注意：只输出摘要/处理结果本身，不要续写聊天内容。`,
            assistantPrefill: ``
        };
        const sysPromptSaved = JSON.parse(localStorage.getItem('friendCircleSystemPrompts') || '{}');
        const sysConfig = { ...sysPromptDefaults, ...sysPromptSaved };
        
        const enabledPrompts = loadUserPrompts().filter(p => p.enabled).map(p => p.text);
        
        const randomPrompt = getRandomPrompt();
        
        const allPrompts = [...enabledPrompts];
        if (randomPrompt) {
            allPrompts.push(randomPrompt);
            debugLog(`随机提示词:已添加 "${randomPrompt.substring(0, 50)}..."`);
        }
        
        const replacedPrompts = [];
        const allReplacements = {};
        
        allPrompts.forEach(prompt => {
            const { text, replacements } = replaceRandomMacros(prompt);
            replacedPrompts.push(text);
            Object.assign(allReplacements, replacements);
        });
        
        const replacementDetails = Object.keys(allReplacements).length > 0
            ? Object.entries(allReplacements)
                .map(([name, value]) => `{{${name}}}=${value}`)
                .join('，')
            : '无';
        
        debugLog(`已加载 ${enabledPrompts.length} 条固定提示词 + ${randomPrompt ? 1 : 0} 条随机提示词`);
        debugLog(`随机数宏替换完成: ${replacementDetails}`);
        
        let worldbookContent = [];
        
        const staticConfig = JSON.parse(localStorage.getItem('friendCircleStaticConfig') || '{}');
        const dynamicConfig = JSON.parse(localStorage.getItem('friendCircleDynamicConfig') || '{}');
        
        try {
            const moduleWI = await import('/scripts/world-info.js');
            
            for (const [bookName, config] of Object.entries(staticConfig)) {
                if (config.enabledUids && config.enabledUids.length > 0) {
                    try {
                        const worldInfo = await moduleWI.loadWorldInfo(config.fileId);
                        const entries = worldInfo.entries || {};
                        
                        config.enabledUids.forEach(uid => {
                            const entry = entries[uid];
                            if (entry && !entry.disable && entry.content) {
                                worldbookContent.push(`【${bookName} - ${entry.title || entry.key || '未命名'}】\n${entry.content}`);
                            }
                        });
                    } catch (e) {
                        console.error(`加载静态世界书 ${bookName} 失败:`, e);
                    }
                }
            }
            
            for (const [bookName, config] of Object.entries(dynamicConfig)) {
                if (config.enabledUids && config.enabledUids.length > 0) {
                    try {
                        const worldInfo = await moduleWI.loadWorldInfo(config.fileId);
                        const entries = worldInfo.entries || {};
                        
                        config.enabledUids.forEach(uid => {
                            const entry = entries[uid];
                            if (entry && !entry.disable && entry.content) {
                                worldbookContent.push(`【${bookName} - ${entry.title || entry.key || '未命名'}】\n${entry.content}`);
                            }
                        });
                    } catch (e) {
                        console.error(`加载动态世界书 ${bookName} 失败:`, e);
                    }
                }
            }
        } catch (e) {
            console.error('导入 world-info.js 失败:', e);
        }
        
        const messages = [];
        
        messages.push({
            role: "system",
            content: sysConfig.systemMain
        });
        
        if (worldbookContent.length > 0) {
            messages.push({
                role: "user",
                content: `<WorldBook_Reference>\n【世界书参考】\n${worldbookContent.join('\n\n')}\n</WorldBook_Reference>`
            });
            debugLog(`加载了 ${worldbookContent.length} 个世界书条目`);
        }
        
        if (selectedChat.length > 0) {
            messages.push({
                role: "user",
                content: `<ChatHistory_Reference>\n【聊天记录参考】\n${selectedChat.join('\n')}\n</ChatHistory_Reference>`
            });
        }
        
        messages.push({
            role: "system",
            content: sysConfig.systemMiddle
        });
        
        if (replacedPrompts.length > 0) {
            messages.push({
                role: "system",
                content: `<Tasks>\n${replacedPrompts.join('\n')}\n\n${sysConfig.tasksWrapper}\n</Tasks>`
            });
        }
        
        if (sysConfig.assistantPrefill && sysConfig.assistantPrefill.trim()) {
            messages.push({
                role: "assistant",
                content: sysConfig.assistantPrefill
            });
        }
        
        debugLog('准备生成朋友圈,使用 API 信息:', { url, model });
        
        try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 20000
                })
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            let output = '';
            
            if (data.choices && data.choices.length > 0) {
                output = data.choices.map(c => c.message?.content || '').join('\n');
            } else {
                output = '[未生成内容]';
            }
            
            const currentOutputContainer = document.getElementById('sp-gen-output');
            if (currentOutputContainer) {
                currentOutputContainer.textContent = output;
            }
            
            debugLog('生成结果输出到面板:', output);
            return output;
        } catch (e) {
            console.error('生成朋友圈失败:', e);
            const currentOutputContainer = document.getElementById('sp-gen-output');
            if (currentOutputContainer) {
                currentOutputContainer.textContent = '生成失败: ' + (e.message || e);
            }
            debugLog('生成失败', e.message || e);
            throw e;
        }
    }
    
    function simulateEditMessage(mesElement, newText) {
        if (!mesElement) return;
        const editBtn = mesElement.querySelector('.mes_edit');
        if (!editBtn) {
            debugLog('未找到编辑按钮 mes_edit');
            return;
        }
        editBtn.click();
        const textarea = mesElement.querySelector('.edit_textarea');
        if (!textarea) {
            debugLog('未找到编辑文本框 edit_textarea');
            return;
        }
        textarea.value = newText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const doneBtn = mesElement.querySelector('.mes_edit_done');
        if (!doneBtn) {
            debugLog('未找到完成按钮 mes_edit_done');
            return;
        }
        doneBtn.click();
    }
    
    function toggleAutoMode(forceState) {
        const targetState = typeof forceState === 'boolean' ? forceState : !autoMode;
        
        if (targetState === autoMode) {
            debugLog('自动化模式状态未改变,跳过');
            return;
        }
        
        autoMode = targetState;
        localStorage.setItem(AUTO_MODE_KEY, autoMode ? '1' : '0');
        const autoBtn = document.getElementById('sp-gen-auto');
        
        if (autoMode) {
            if (autoBtn) {
                autoBtn.textContent = '自动化(运行中)';
                autoBtn.style.background = '#A3C956';
            }
            debugLog('自动化模式已开启,使用官方事件监听');
            
            if (autoEventHandler) {
                try {
                    const { eventSource, event_types } = SillyTavern.getContext();
                    eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler);
                    debugLog('自动化模式:已移除旧的事件监听器');
                } catch (e) {
                    console.error('移除旧监听器失败:', e);
                }
            }
            
            const { eventSource, event_types } = SillyTavern.getContext();
            
            autoEventHandler = async (data) => {
                debugLog('自动化模式:检测到 GENERATION_ENDED 事件', data);
                
                const ctx = SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length === 0) {
                    debugLog('自动化模式:聊天上下文无效');
                    return;
                }
                
                const lastMsg = ctx.chat[ctx.chat.length - 1];
                if (!lastMsg || lastMsg.is_user) {
                    debugLog('自动化模式:最后一条消息不是AI消息,跳过');
                    return;
                }
                
                const msgId = getMessageId(lastMsg);
                if (processedMessageIds.has(msgId)) {
                    debugLog('自动化模式:消息已处理过,跳过');
                    return;
                }
                
                processedMessageIds.add(msgId);
                if (processedMessageIds.size > 100) {
                    const arr = Array.from(processedMessageIds);
                    processedMessageIds = new Set(arr.slice(-100));
                }
                
                debugLog('自动化模式:开始生成朋友圈(仅更新面板)');
                
                try {
                    const cutted = await getLastMessages();
                    await generateFriendCircle(cutted, ['']);
                    debugLog('自动化模式:生成完成,结果已显示在面板中');
                } catch (e) {
                    debugLog('自动化模式:生成失败', e.message);
                }
            };
            
            eventSource.on(event_types.GENERATION_ENDED, autoEventHandler);
            debugLog('自动化模式:已绑定 GENERATION_ENDED 事件');
            
        } else {
            if (autoBtn) {
                autoBtn.textContent = '自动化';
                autoBtn.style.background = '#D87E5E';
            }
            debugLog('自动化模式已关闭');
            
            if (autoEventHandler) {
                try {
                    const { eventSource, event_types } = SillyTavern.getContext();
                    eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler);
                    autoEventHandler = null;
                    debugLog('自动化模式:已移除事件监听');
                } catch (e) {
                    console.error('移除事件监听失败:', e);
                }
            }
        }
    }
    
   function toggleTuoguanMode(forceState) {
    const targetState = typeof forceState === 'boolean' ? forceState : !tuoguanMode;
    
    if (targetState === tuoguanMode) {
        debugLog('托管模式状态未改变,跳过');
        return;
    }
    
    tuoguanMode = targetState;
    localStorage.setItem(TUOGUAN_MODE_KEY, tuoguanMode ? '1' : '0');
    const tuoguanBtn = document.getElementById('sp-gen-tuoguan');
    
    if (tuoguanMode) {
        if (tuoguanBtn) {
            tuoguanBtn.textContent = '托管(运行中)';
            tuoguanBtn.style.background = '#A3C956';
        }
        debugLog('托管模式已开启,使用官方事件监听');
        
        if (tuoguanEventHandler) {
            try {
                const { eventSource, event_types } = SillyTavern.getContext();
                eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler);
                debugLog('托管模式:已移除旧的事件监听器');
            } catch (e) {
                console.error('移除旧监听器失败:', e);
            }
        }
        
        const { eventSource, event_types } = SillyTavern.getContext();
        
        tuoguanEventHandler = async (data) => {
            debugLog('托管模式:检测到 GENERATION_ENDED 事件', data);
            
            const ctx = SillyTavern.getContext();
            if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length === 0) {
                debugLog('托管模式:聊天上下文无效');
                return;
            }
            
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            
            if (!lastMsg || lastMsg.is_user !== false) {
                debugLog('托管模式:最后一条消息不是AI消息,跳过');
                return;
            }
            
            const msgId = getMessageId(lastMsg);
            if (processedMessageIds.has(msgId)) {
                debugLog('托管模式:消息已处理过,跳过');
                return;
            }
            
            processedMessageIds.add(msgId);
            if (processedMessageIds.size > 100) {
                const arr = Array.from(processedMessageIds);
                processedMessageIds = new Set(arr.slice(-100));
            }
            
            debugLog('托管模式:开始生成朋友圈');
            
            let generatedText = '';
            try {
                const cutted = await getLastMessages();
                generatedText = await generateFriendCircle(cutted, ['']);
            } catch (e) {
                debugLog('托管模式:生成失败', e.message);
                return;
            }
            
            if (!generatedText || generatedText.includes('生成失败')) {
                debugLog('托管模式:生成内容为空或失败,跳过注入');
                return;
            }
            
            debugLog('托管模式:开始自动注入聊天');
            
            const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
            if (!lastAiMes) {
                debugLog('托管模式:未找到内存中的 AI 消息');
                return;
            }
            
            const allMes = Array.from(document.querySelectorAll('.mes'));
            if (allMes.length === 0) {
                debugLog('托管模式:未找到任何 DOM 消息');
                return;
            }
            
            const aiMes = [...allMes].reverse().find(m => !m.classList.contains('user'));
            if (!aiMes) {
                debugLog('托管模式:未找到 DOM 中的 AI 消息');
                return;
            }
            
            const mesTextEl = aiMes.querySelector('.mes_text');
            if (!mesTextEl) {
                debugLog('托管模式:AI DOM 消息中未找到 mes_text');
                return;
            }
            
            const oldRaw = lastAiMes.mes;
            const newContent = oldRaw + '\n' + generatedText;
            simulateEditMessage(aiMes, newContent);
            debugLog('托管模式:自动注入聊天完成');
        };
        
        eventSource.on(event_types.GENERATION_ENDED, tuoguanEventHandler);
        debugLog('托管模式:已绑定 GENERATION_ENDED 事件');
        
    } else {
        if (tuoguanBtn) {
            tuoguanBtn.textContent = '托管';
            tuoguanBtn.style.background = '#D87E5E';
        }
        debugLog('托管模式已关闭');
        
        if (tuoguanEventHandler) {
            try {
                const { eventSource, event_types } = SillyTavern.getContext();
                eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler);
                tuoguanEventHandler = null;
                debugLog('托管模式:已移除事件监听');
            } catch (e) {
                console.error('移除事件监听失败:', e);
            }
        }
    }
}
    
    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
    if (savedAutoMode === '1') {
        toggleAutoMode(true);
    }
    
    const savedTuoguanMode = localStorage.getItem(TUOGUAN_MODE_KEY);
    if (savedTuoguanMode === '1') {
        toggleTuoguanMode(true);
    }
    
    const autoBtn = document.getElementById('sp-gen-auto');
    const tuoguanBtn = document.getElementById('sp-gen-tuoguan');
    if (autoBtn) {
        autoBtn.textContent = autoMode ? '自动化(运行中)' : '自动化';
        autoBtn.style.background = autoMode ? '#A3C956' : '#D87E5E';
    }
    if (tuoguanBtn) {
        tuoguanBtn.textContent = tuoguanMode ? '托管(运行中)' : '托管';
        tuoguanBtn.style.background = tuoguanMode ? '#A3C956' : '#D87E5E';
    }
    
    contentClickHandler = async (e) => {
        const target = e.target;
        
        if (target.id === 'sp-gen-now') {
            try {    
                debugLog('立刻生成:开始更新聊天记录...');
                await getLastMessages();
                await new Promise(resolve => setTimeout(resolve, 100));
                const cutted = await getLastMessages();
                debugLog(`立刻生成:获取到 ${cutted.length} 条修剪后的消息`);
                generateFriendCircle(cutted);
            } catch (e) {    
                console.error('生成异常', e);    
                debugLog('生成异常', e.message || e);    
            }
        }
        
        else if (target.id === 'sp-gen-inject-chat') {
            const outputContainer = document.getElementById('sp-gen-output');
            const texts = outputContainer ? outputContainer.textContent.trim() : '';
            if (!texts) return alert('生成内容为空');
            const ctx = SillyTavern.getContext();
            if (!ctx || !ctx.chat || ctx.chat.length === 0) {
                return alert('未找到任何内存消息');
            }
            const lastAiMes = [...ctx.chat].reverse().find(m => m.is_user === false);
            if (!lastAiMes) return alert('未找到内存中的 AI 消息');
            const allMes = Array.from(document.querySelectorAll('.mes'));
            if (allMes.length === 0) return alert('未找到任何 DOM 消息');
            const aiMes = [...allMes].reverse().find(m => !m.classList.contains('user'));
            if (!aiMes) return alert('未找到 DOM 中的 AI 消息');
            const mesTextEl = aiMes.querySelector('.mes_text');
            if (!mesTextEl) return alert('AI DOM 消息中未找到 mes_text');
            const oldRaw = lastAiMes.mes;
            const newContent = oldRaw + '\n' + texts;
            simulateEditMessage(aiMes, newContent);
            debugLog('注入聊天成功,并模拟了编辑完成(可被其他脚本监听渲染)');
        }
        
        else if (target.id === 'sp-gen-inject-swipe') {
            const outputContainer = document.getElementById('sp-gen-output');
            const texts = outputContainer ? outputContainer.textContent.trim() : '';
            if (!texts) return alert('生成内容为空');  
            const command = `/addswipe ${texts}`;  
            const inputEl = document.getElementById('send_textarea');  
            if (!inputEl) return alert('未找到输入框 send_textarea');  
            inputEl.value = command;  
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));  
            const sendBtn = document.getElementById('send_but') || document.querySelector('button');  
            if (sendBtn) sendBtn.click();
        }
        
        else if (target.id === 'sp-gen-auto') {
            toggleAutoMode();
        }
        
        else if (target.id === 'sp-gen-tuoguan') {
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
