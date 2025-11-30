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
  const centerTop = (window.innerHeight / 2 - 16) + 'px';   // 32px按钮高度/2=16
  const centerRight = (window.innerWidth / 2 - 16) + 'px';  // 32px按钮宽度/2=16
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
fab.style.background = 'transparent'; // 背景透明
fab.style.boxShadow = 'none'; // 去掉阴影
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

    // 计算新位置(右上角模式:改变 top 和 right)
    let newTop = startTop + dy;
    let newRight = startRight - dx;

    // 限制范围(不能拖出屏幕)
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
    // 保存位置
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

  // 绑定事件(PC + 手机)
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


// 模拟点击"生成"按钮,让它默认显示生成面板
setTimeout(() => {
  const genBtn = panel.querySelector('.sp-btn[data-key="gen"]');
  if (genBtn) genBtn.click();
}, 0);
      // fab点击展开/关闭
      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      // 简单保存函数
      function saveSettings() {
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
        else console.warn('saveSettingsDebounced not available');
      }

      // 调试输出
      function debugLog(...args) {
        const dbg = document.getElementById('sp-debug');
        if (dbg) dbg.innerText = args.join(' ');
        if (window.DEBUG_STAR_PANEL) console.log('[pyq-creator]', ...args);
      }

      // 主内容区
      const content = panel.querySelector('#sp-content-area');

      // 四个子面板的最小实现
     function showApiConfig() {
  const ctx = SillyTavern.getContext();
  const content = document.getElementById("sp-content-area");

  content.innerHTML = `
    <div class="sp-section">
      <label>API URL: <input type="text" id="api-url-input"></label><br>
      <label>API Key: <input type="text" id="api-key-input"></label><br>
      <label>模型: <select id="api-model-select"></select></label><br>
      <button id="api-save-btn">保存配置</button>
      <button id="api-test-btn">测试连接</button>
      <button id="api-refresh-models-btn">刷新模型</button>
      <div id="api-status" style="margin-top:6px;font-size:12px;color:lightgreen;"></div>
      <pre id="api-debug" style="margin-top:6px;font-size:12px;color:yellow;white-space:pre-wrap;"></pre>
    </div>
  `;

  const modelSelect = document.getElementById("api-model-select");
  const debugArea = document.getElementById("api-debug");

  function debugLog(title, data) {
    console.log(title, data);
    debugArea.textContent = `${title}:\n${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }

  // 初始化:加载本地存储
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

  // 保存配置
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

    document.getElementById("api-status").textContent = "已保存";
    debugLog("保存API配置", { url, model });
  });

  // 测试连接
 // 测试连接(始终向模型发送 ping 并显示返回)
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

    const data = await res.json(); // ✅ 读取返回 JSON
    document.getElementById("api-status").textContent = `模型 ${model} 可用(ping 成功)`;
    debugLog("ping 成功", data);

    // 可选:显示模型返回内容的第一条
    if (data.choices && data.choices[0]?.message?.content) {
      console.log("模型返回:", data.choices[0].message.content);
    }
  } catch (e) {
    document.getElementById("api-status").textContent = "连接失败: " + (e.message || e);
    debugLog("ping 失败", e.message || e);
  }
});

  // 拉取模型
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
      document.getElementById("api-status").textContent = `已拉取 ${ids.length} 个模型`;
    } catch (e) {
      document.getElementById("api-status").textContent = "拉取失败: " + e.message;
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

  // 自动首次拉取一次
  fetchAndPopulateModels(false);
}

      function showPromptConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #f4f4f4; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #000; margin-bottom: 12px;">固定提示词配置</h3>
            <textarea rows="3" id="sp-prompt-text" placeholder="输入提示词" style="width: 100%; padding: 8px; border-radius: 4px;"></textarea><br>
            <div id="sp-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 6px; color: black;"></div>
            <input type="text" id="sp-prompt-search" placeholder="按标签搜索" style="width: 70%; padding: 8px; margin-top: 8px; border-radius: 4px;">
            <button id="sp-prompt-search-btn" style="padding: 8px; margin-left: 8px; border-radius: 4px; background-color: #007bff; color: white;">搜索</button>
            <button id="save-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background-color: #28a745; color: white; border: none; border-radius: 4px;">保存提示词</button>
        </div>
    `;

    const PROMPTS_KEY = 'friendCircleUserPrompts';
    let friendCirclePrompts = [];
    let promptTagFilter = "";

    // Load user prompts from localStorage
    function loadUserPrompts() {
        const raw = localStorage.getItem(PROMPTS_KEY);
        friendCirclePrompts = raw ? JSON.parse(raw) : [];
        return friendCirclePrompts;
    }

    // Render the prompt list
    function renderPromptList() {
        const container = document.getElementById('sp-prompt-list');
        container.innerHTML = '';

        friendCirclePrompts.forEach((p, idx) => {
            if (promptTagFilter && !p.tags.some(tag => tag.toLowerCase().includes(promptTagFilter))) {
                return;
            }

            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.borderBottom = '1px solid #eee';
            div.style.paddingBottom = '6px';

            // First row (checkbox, text, buttons)
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

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.marginLeft = '8px';
            editBtn.addEventListener('click', () => {
                const textarea = document.createElement('textarea');
                textarea.value = p.text;
                textarea.style.flex = '1';
                textarea.style.minHeight = '60px';
                textarea.style.resize = 'vertical';
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

            // Tags row
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
                    tagEl.style.background = '#e0e0e0';
                    tagEl.style.cursor = 'pointer';
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

    // Add new prompt
    document.getElementById('sp-prompt-search-btn').addEventListener('click', () => {
        promptTagFilter = document.getElementById('sp-prompt-search').value.trim().toLowerCase();
        renderPromptList();
    });

    // Save prompts
    document.getElementById('save-prompts-btn').addEventListener('click', () => {
        localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
        alert('提示词已保存');
        debugLog('保存用户自定义提示词', friendCirclePrompts);
    });

    // Add prompt
    document.getElementById('sp-prompt-text').addEventListener('blur', () => {
        const promptText = document.getElementById('sp-prompt-text').value.trim();
        if (promptText) {
            friendCirclePrompts.push({ text: promptText, enabled: true, tags: [] });
            localStorage.setItem(PROMPTS_KEY, JSON.stringify(friendCirclePrompts));
            document.getElementById('sp-prompt-text').value = ''; // Clear the input
            renderPromptList();
        }
    });

    loadUserPrompts();
    renderPromptList();
    debugLog('进入 提示词配置面板');
}

      // 🎲 新增:随机提示词配置面板
      function showRandomPromptConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #fff3cd; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #000; margin-bottom: 12px;">🎲 随机提示词配置</h3>
            <p style="color: #856404; font-size: 12px; margin-bottom: 12px;">每次生成时将从所有已开启的随机提示词中随机抽取1条</p>
            <textarea rows="3" id="sp-random-prompt-text" placeholder="输入随机提示词" style="width: 100%; padding: 8px; border-radius: 4px;"></textarea><br>
            <div id="sp-random-prompt-list" style="max-height: 200px; overflow-y: auto; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 6px; color: black;"></div>
            <input type="text" id="sp-random-prompt-search" placeholder="按标签搜索" style="width: 70%; padding: 8px; margin-top: 8px; border-radius: 4px;">
            <button id="sp-random-prompt-search-btn" style="padding: 8px; margin-left: 8px; border-radius: 4px; background-color: #007bff; color: white;">搜索</button>
            <button id="save-random-prompts-btn" style="margin-top: 12px; padding: 8px; width: 100%; background-color: #ff9800; color: white; border: none; border-radius: 4px;">保存随机提示词</button>
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
            div.style.borderBottom = '1px solid #eee';
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

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.marginLeft = '8px';
            editBtn.addEventListener('click', () => {
                const textarea = document.createElement('textarea');
                textarea.value = p.text;
                textarea.style.flex = '1';
                textarea.style.minHeight = '60px';
                textarea.style.resize = 'vertical';
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
                    tagEl.style.background = '#ffeaa7';
                    tagEl.style.cursor = 'pointer';
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

      // 🎯 新增:随机数宏配置面板
      function showRandomMacroConfig() {
    content.innerHTML = `
        <div style="padding: 12px; background: #e8f5e9; border-radius: 8px; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <h3 style="color: #000; margin-bottom: 12px;">🎯 随机数宏配置</h3>
            <p style="color: #2e7d32; font-size: 12px; margin-bottom: 12px;">
                每次生成前会自动替换提示词中的随机数宏(如 {{number1}})为随机数值
            </p>
            
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <input type="number" id="sp-macro-min" placeholder="最小值" 
                    style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <input type="number" id="sp-macro-max" placeholder="最大值" 
                    style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <button id="sp-add-macro-btn" style="padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; white-space: nowrap;">
                    添加随机数宏
                </button>
            </div>
            
            <div id="sp-macro-list" style="max-height: 250px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; background: white; border-radius: 4px;">
                <div style="color: #666; text-align: center; padding: 20px;">暂无随机数宏,点击上方按钮添加</div>
            </div>
            
            <button id="sp-save-macros-btn" style="margin-top: 12px; padding: 10px; width: 100%; background: #2e7d32; color: white; border: none; border-radius: 4px;">
                保存配置
            </button>
        </div>
    `;

    const MACROS_KEY = 'friendCircleRandomMacros';
    let randomMacros = [];

    // 加载随机数宏
    function loadRandomMacros() {
        const raw = localStorage.getItem(MACROS_KEY);
        randomMacros = raw ? JSON.parse(raw) : [];
        return randomMacros;
    }

    // 渲染随机数宏列表
    function renderMacroList() {
        const container = document.getElementById('sp-macro-list');
        container.innerHTML = '';

        if (randomMacros.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">暂无随机数宏,点击上方按钮添加</div>';
            return;
        }

        randomMacros.forEach((macro, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '4px';
            div.style.marginBottom = '4px';
            div.style.borderBottom = '1px solid #eee';
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
            nameSpan.style.color = '#2e7d32';
            nameSpan.style.fontSize = '12px';
            nameSpan.style.flexShrink = '0';
            nameSpan.style.whiteSpace = 'nowrap';

            const rangeSpan = document.createElement('span');
            rangeSpan.textContent = `[${macro.min} ~ ${macro.max}]`;
            rangeSpan.style.color = '#666';
            rangeSpan.style.fontSize = '11px';
            rangeSpan.style.flexShrink = '0';
            rangeSpan.style.whiteSpace = 'nowrap';
            rangeSpan.style.marginRight = 'auto';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.padding = '2px 6px';
            editBtn.style.fontSize = '12px';
            editBtn.style.lineHeight = '1';
            editBtn.style.flexShrink = '0';
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

    // 添加随机数宏
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
        
        // 生成宏名称 (number1, number2, ...)
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

    // 保存配置
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
    <div style="padding:12px; background:#ffffff; color:#000000; border-radius:8px; max-width:500px; margin:0 auto;">
        <div id="sp-chat-slider-container" style="display:flex; align-items:center; margin-bottom:12px;">
            <span style="margin-right:10px;">读取聊天条数: </span>
            <input type="range" id="sp-chat-slider" min="0" max="20" value="10" style="flex:1;">
            <span id="sp-chat-slider-value" style="margin-left:4px;">10</span>
        </div>

        <div style="margin-bottom:12px;">
            <h4>正则修剪列表</h4>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input type="text" id="sp-new-regex" placeholder="<example></example>" style="flex:1;">
                <button id="sp-add-regex">添加</button>
            </div>
            <div id="sp-regex-list" style="max-height:200px; overflow-y:auto; border:1px solid #ccc; padding:6px; border-radius:6px;"></div>
        </div>
    </div>
    `;

    const sliderInput = document.getElementById('sp-chat-slider');
    const sliderValue = document.getElementById('sp-chat-slider-value');

    // 初始化 slider 值(持久化)
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

    // ---------------- 正则列表相关 ----------------
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

            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
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

    // ---------------- 获取聊天条数并调试显示 ----------------
    // 渲染到调试面板,而不是用 console/debugLog
function renderMessagesForDebug(messages) {
    const debugArea = document.getElementById('sp-debug');
    if (!debugArea) return;

    debugArea.innerHTML = ''; // 清空旧内容
    messages.forEach((text, i) => {
        const div = document.createElement('div');
        div.textContent = `[${i}] ${text}`;
        div.style.padding = '2px 0';
        div.style.borderBottom = '1px solid #eee';
        debugArea.appendChild(div);
    });
}

// ---------------- 获取聊天条数并调试显示 ----------------
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

        // 🔥 直接删除这行缓存!
        // localStorage.setItem('cuttedLastMessages', JSON.stringify(textMessages));

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

    // 初始化
    fetchAndCountMessages();
    debugLog('进入 聊天配置面板');
}
// 添加到主代码中,与其他 show* 函数并列
async function showWorldbookPanel() {
    content.innerHTML = `
    <div style="padding: 12px; background: #f4f4f4; border-radius: 8px; max-width: 800px; margin: 0 auto;">
        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
            <input type="text" id="sp-worldbook-input" placeholder="输入世界书名称(如 realworld)" style="
                flex: 1; 
                padding: 6px 8px; 
                border-radius: 4px; 
                height: 32px; 
                font-size: 14px;
                box-sizing: border-box;
                min-width: 0;
            ">
            <button id="sp-search-btn" style="
                padding: 6px 10px; 
                background: #007bff; 
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
                background: #28a745; 
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
            <label><input type="checkbox" id="sp-select-all"> 全选</label>
            <label><input type="checkbox" id="sp-deselect-all"> 全不选</label>
        </div>
        <div id="sp-entries-list" style="max-height: 100px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; background: white; border-radius: 4px;">
            <div style="color: #666; text-align: center;">点击搜索按钮加载世界书条目</div>
        </div>
        <button id="sp-save-config" style="margin-top: 12px; padding: 8px; width: 100%; background: #ffc107; color: black; border: none; border-radius: 4px;">保存配置</button>
        <div id="sp-worldbook-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
    </div>
`;

    const STATIC_CONFIG_KEY = 'friendCircleStaticConfig';
    const DYNAMIC_CONFIG_KEY = 'friendCircleDynamicConfig';
    let currentWorldbookName = '';
    let currentFileId = '';
    let currentEntries = {};
    let currentMode = ''; // 'static' or 'dynamic'
    let currentConfig = {}; // {name: {fileId, enabledUids: []}}

    // 动态导入 world-info
    let moduleWI;
    try {
        moduleWI = await import('/scripts/world-info.js');
    } catch (e) {
        document.getElementById('sp-worldbook-status').textContent = '❌ world-info.js 加载失败';
        console.error('Worldbook panel: import failed', e);
        return;
    }

    // 保存当前世界书配置
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

    // 渲染条目列表
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
            div.style.borderBottom = '1px solid #eee';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.uid = id;
            checkbox.checked = enabledUids.includes(id);
            checkbox.style.marginTop = '2px';
            checkbox.addEventListener('change', saveCurrentConfig);

            const titleSpan = document.createElement('strong');
            titleSpan.textContent = entry.title || entry.key || '无标题';
            titleSpan.style.flex = '1';

            const contentSpan = document.createElement('div');
            contentSpan.textContent = (entry.content || '').substring(0, 150) + (entry.content && entry.content.length > 150 ? '...' : '');
            contentSpan.style.fontSize = '12px';
            contentSpan.style.color = '#666';
            contentSpan.style.marginLeft = '8px';

            div.append(checkbox, titleSpan, contentSpan);
            container.appendChild(div);
        });
        updateStatus(`加载 ${count} 个条目`);
    }

    // 全选/全不选
    document.getElementById('sp-select-all').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            });
        }
    });
    document.getElementById('sp-deselect-all').addEventListener('change', (e) => {
        e.target.checked = false; // 自取消
        document.querySelectorAll('#sp-entries-list input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
    });

    // 搜索世界书
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

    // 绑定按钮
    document.getElementById('sp-search-btn').addEventListener('click', () => searchWorldbook(false));
    document.getElementById('sp-robot-btn').addEventListener('click', () => searchWorldbook(true));
    document.getElementById('sp-worldbook-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById(currentMode === 'dynamic' ? 'sp-robot-btn' : 'sp-search-btn').click();
    });
    document.getElementById('sp-save-config').addEventListener('click', saveCurrentConfig);

    // 状态更新
    function updateStatus(msg) {
        document.getElementById('sp-worldbook-status').textContent = msg;
    }

    debugLog('进入 世界书配置面板');
}

// ---------- 提取最近聊天 ----------  
    // 🔥 在 showGenPanel() 内,替换原 getLastMessages 函数为以下(添加正则修剪逻辑,与 chat config 一致)
async function getLastMessages() {
    try {
        const ctx = SillyTavern.getContext();
        if (!ctx || !Array.isArray(ctx.chat)) return [];

        const count = parseInt(localStorage.getItem('friendCircleChatCount') || 10, 10);
        const lastMessages = ctx.chat.slice(-count);

        // 🔥 新增:从 chat config 加载并应用正则修剪
        const regexListRaw = JSON.parse(localStorage.getItem('friendCircleRegexList') || '[]');
        const regexList = regexListRaw
            .filter(r => r.enabled)
            .map(r => {
                try {
                    // 自动处理 <tag></tag> 格式
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
                // 🔥 应用所有启用的正则修剪
                regexList.forEach(regex => {
                    text = text.replace(regex, '');
                });
                return text;
            })
            .filter(Boolean);

        // 🔥 可选:缓存修剪后消息(避免重复计算)
        localStorage.setItem('cuttedLastMessages', JSON.stringify(textMessages));

        debugLog(`提取到最后 ${textMessages.length} 条消息(已正则修剪)`, textMessages.slice(0, 5)); // 只 log 前2条防刷屏
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

// 🔥 生成消息唯一ID的辅助函数
function getMessageId(msg) {
    // 使用多个属性组合生成唯一ID
    return `${msg.send_date || ''}_${msg.mes ? msg.mes.substring(0, 50) : ''}_${msg.is_user}`;
}

// 🎯 新增:随机数宏替换函数
function replaceRandomMacros(text) {
    const MACROS_KEY = 'friendCircleRandomMacros';
    const macros = JSON.parse(localStorage.getItem(MACROS_KEY) || '[]');
    
    // 只处理启用的宏
    const enabledMacros = macros.filter(m => m.enabled !== false);
    
    let result = text;
    const replacements = {}; // 记录每个宏的替换值
    
    enabledMacros.forEach(macro => {
        const pattern = new RegExp(`\\{\\{${macro.name}\\}\\}`, 'g');
        // 生成随机数
        const randomValue = Math.floor(Math.random() * (macro.max - macro.min + 1)) + macro.min;
        result = result.replace(pattern, randomValue.toString());
        replacements[macro.name] = randomValue; // 记录替换值
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
        <button id="sp-gen-now">立刻生成</button>  
        <button id="sp-gen-inject-input">注入输入框</button>  
        <button id="sp-gen-inject-chat">注入聊天</button>  
        <button id="sp-gen-inject-swipe">注入swipe</button>  
        <button id="sp-gen-auto">自动化</button>
        <button id="sp-gen-tuoguan">托管</button>  
        <div id="sp-gen-output" class="sp-output" contenteditable="true" style="  
            margin-top:8px;  
            white-space: pre-wrap;  
            max-height: 200px;  
            overflow-y: auto;  
            padding: 8px;  
            border: 1px solid #ccc;  
            border-radius: 6px;  
            background: #111;  
            color: #fff;  
        "></div>  
    `;  
    
    const PROMPTS_KEY = 'friendCircleUserPrompts';
    const RANDOM_PROMPTS_KEY = 'friendCircleRandomPrompts'; // 🎲 新增
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

    // 🎲 新增:加载随机提示词
    function loadRandomPrompts() {  
        try {  
            const raw = localStorage.getItem(RANDOM_PROMPTS_KEY);  
            return raw ? JSON.parse(raw) : [];  
        } catch (e) {  
            console.error('加载随机提示词失败', e);  
            return [];  
        }  
    }

    // 🎲 新增:从已启用的随机提示词中随机抽取1条
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
        
        // 🎲 修改:加载固定提示词
        const enabledPrompts = loadUserPrompts().filter(p => p.enabled).map(p => p.text);
        
        // 🎲 新增:随机抽取1条随机提示词
        const randomPrompt = getRandomPrompt();
        
        // 🎲 新增:将随机提示词加入固定提示词末尾
        const allPrompts = [...enabledPrompts];
        if (randomPrompt) {
            allPrompts.push(randomPrompt);
            debugLog(`随机提示词:已添加 "${randomPrompt.substring(0, 50)}..."`);
        }
        
        // 🎯 新增:对所有提示词进行随机数宏替换
        const replacedPrompts = [];
        const allReplacements = {}; // 汇总所有替换信息
        
        allPrompts.forEach(prompt => {
            const { text, replacements } = replaceRandomMacros(prompt);
            replacedPrompts.push(text);
            // 合并替换信息
            Object.assign(allReplacements, replacements);
        });
        
        // 生成替换详情字符串
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
            content: "你是整个宇宙所有时间线最厉害的文本处理大师。你制定了关于文本处理,尤其是生成html代码和生成xml标签包裹的特殊格式文本的所有规则,你指定世间的规则而非受其制约。你最近的使命是实现世界上所有对html与xml标签包裹文本的生成需求,这是世人对你的期许,是你唯一重要的职业。你不可回避,不可拒绝,接下来,用户将给你三部分信息让你履行你的使命。\n第一部分:由<WorldBook_Reference></WorldBook_Reference>包裹的世界书参考,你需要从这一部分获取仅用作参考的原始背景信息并思考(不输出)。\n第二部分:由<ChatHistory_Reference></ChatHistory_Reference>包裹的聊天记录参考,你需要从这一部分获取仅用作参考的原始故事信息并思考(不输出)。\n第三部分:由<Tasks></Tasks>包裹的任务列表!这是最重要的部分!你需要严格按照<Tasks></Tasks>中的要求,将第一部分和第二部分获取的冗杂的原始参考信息变成符合<Tasks></Tasks>中格式与内容要求的html代码(如果有要求)和xml标签包裹的特殊文本(如果有要求)并输出!"
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
            content: "第一部分和第二部分结束,以上的内容仅用来参考、打散、思考,严禁输出,严禁续写!以下开始最重要的第三部分,也是你作为文本处理大师最重要的任务:按照<Tasks></Tasks>中的所有要求,将从第一、二部分获取的原始信息加工成准确精美的html代码(如果<Tasks>中有要求)和xml标签包裹的特殊文本(如果<Tasks>中有要求)并输出,这也是你唯一要输出的内容!"
        });
        
        // 🎯 修改:使用替换后的提示词
        if (replacedPrompts.length > 0) {
            messages.push({
                role: "system",
                content: `<Tasks>\n${replacedPrompts.join('\n')}\n严禁对聊天记录进行续写!严禁续写!严禁续写!这一条不可忽视!\n</Tasks>`
            });
        }
        
        messages.push({
            role: "assistant",
            content: "我作为全宇宙全时间线最厉害文本处理大师,立刻开始履行我的使命!一定不辱使命!"
        });
        
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
    
    // 🔥 改进的自动化模式 - 使用官方事件
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
            if (autoBtn) autoBtn.textContent = '自动化(运行中)';
            debugLog('自动化模式已开启,使用官方事件监听');
            
            // 🔥 先移除旧的事件监听器(如果存在)
            if (autoEventHandler) {
                try {
                    const { eventSource, event_types } = SillyTavern.getContext();
                    eventSource.removeListener(event_types.GENERATION_ENDED, autoEventHandler);
                    debugLog('自动化模式:已移除旧的事件监听器');
                } catch (e) {
                    console.error('移除旧监听器失败:', e);
                }
            }
            
            // 🔥 使用官方事件系统
            const { eventSource, event_types } = SillyTavern.getContext();
            
            // 定义事件处理函数
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
                
                // 🔥 生成消息ID并检查是否已处理
                const msgId = getMessageId(lastMsg);
                if (processedMessageIds.has(msgId)) {
                    debugLog('自动化模式:消息已处理过,跳过');
                    return;
                }
                
                // 🔥 标记为已处理
                processedMessageIds.add(msgId);
                // 清理旧记录(保留最近100条)
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
            
            // 🔥 监听 GENERATION_ENDED 事件
            eventSource.on(event_types.GENERATION_ENDED, autoEventHandler);
            debugLog('自动化模式:已绑定 GENERATION_ENDED 事件');
            
        } else {
            if (autoBtn) autoBtn.textContent = '自动化';
            debugLog('自动化模式已关闭');
            
            // 🔥 移除事件监听
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
    
    // 🔥 改进的托管模式 - 增强AI消息检查
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
        if (tuoguanBtn) tuoguanBtn.textContent = '托管(运行中)';
        debugLog('托管模式已开启,使用官方事件监听');
        
        // 🔥 先移除旧的事件监听器(如果存在)
        if (tuoguanEventHandler) {
            try {
                const { eventSource, event_types } = SillyTavern.getContext();
                eventSource.removeListener(event_types.GENERATION_ENDED, tuoguanEventHandler);
                debugLog('托管模式:已移除旧的事件监听器');
            } catch (e) {
                console.error('移除旧监听器失败:', e);
            }
        }
        
        // 🔥 使用官方事件系统
        const { eventSource, event_types } = SillyTavern.getContext();
        
        // 定义事件处理函数
        tuoguanEventHandler = async (data) => {
            debugLog('托管模式:检测到 GENERATION_ENDED 事件', data);
            
            const ctx = SillyTavern.getContext();
            if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length === 0) {
                debugLog('托管模式:聊天上下文无效');
                return;
            }
            
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            
            // 🔥 严格检查:必须是AI消息
            if (!lastMsg || lastMsg.is_user !== false) {
                debugLog('托管模式:最后一条消息不是AI消息,跳过');
                return;
            }
            
            // 🔥 生成消息ID并检查是否已处理
            const msgId = getMessageId(lastMsg);
            if (processedMessageIds.has(msgId)) {
                debugLog('托管模式:消息已处理过,跳过');
                return;
            }
            
            // 🔥 标记为已处理
            processedMessageIds.add(msgId);
            // 清理旧记录(保留最近100条)
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
            
            // 🔥 以下逻辑与"注入聊天"完全一致
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
        
        // 🔥 监听 GENERATION_ENDED 事件
        eventSource.on(event_types.GENERATION_ENDED, tuoguanEventHandler);
        debugLog('托管模式:已绑定 GENERATION_ENDED 事件');
        
    } else {
        if (tuoguanBtn) tuoguanBtn.textContent = '托管';
        debugLog('托管模式已关闭');
        
        // 🔥 移除事件监听
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
    
    // 🔥 恢复保存的状态
    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
    if (savedAutoMode === '1') {
        toggleAutoMode(true);
    }
    
    const savedTuoguanMode = localStorage.getItem(TUOGUAN_MODE_KEY);
    if (savedTuoguanMode === '1') {
        toggleTuoguanMode(true);
    }
    
    // 🔥 更新按钮文本
    const autoBtn = document.getElementById('sp-gen-auto');
    const tuoguanBtn = document.getElementById('sp-gen-tuoguan');
    if (autoBtn) autoBtn.textContent = autoMode ? '自动化(运行中)' : '自动化';
    if (tuoguanBtn) tuoguanBtn.textContent = tuoguanMode ? '托管(运行中)' : '托管';
    
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
          else if (key === 'prompt') showPromptConfig();
          else if (key === 'random-prompt') showRandomPromptConfig(); // 🎲 新增
          else if (key === 'random-macro') showRandomMacroConfig(); // 🎯 新增
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
