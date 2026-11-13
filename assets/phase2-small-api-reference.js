(() => {
  const apiPanel = document.querySelector('[data-config-panel="api"]');
  const systemPanel = document.querySelector('[data-config-panel="system"]');
  const language = document.querySelector('#p2-interface-language');
  if (!apiPanel || !systemPanel || !language) return;

  const key = 'x3-reference-settings-v1';
  const defaults = {
    mode: 'local', recognition: 'Paraformer + SenseVoice · 本地',
    dialogue: 'DeepSeek-v4.1-Flash', synthesis: 'MOSS-TTS-Nano · ≈1.1G',
    localShortcut: '⌃⌥D', cloudShortcut: '',
    wake: false, wakeWord: '小瑞', microphone: false, sync: false,
  };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(phase2Storage.getItem(key) || '{}');
    if (saved.shortcut) {
      const field = saved.mode === 'cloud' ? 'cloudShortcut' : 'localShortcut';
      saved[field] ??= saved.shortcut;
    }
    delete saved.shortcut;
    preferences = { ...defaults, ...saved };
  } catch {}
  let modelTab = 'llm';

  const asset = name => `assets/api-settings-figma/${name}`;
  const voiceProviders = [
    ['qwen-realtime', '阿里百炼', [
      ['qwen-audio-3.1-realtime-plus', 'Qwen Audio 3.1 Realtime Plus'],
      ['qwen-audio-3.1-realtime-flash', 'Qwen Audio 3.1 Realtime Flash'],
    ], ['longanqian_v3.1', 'longanwen_v3.1']],
    ['doubao-realtime', '火山引擎', [['1.2.6.1', '豆包实时语音 3.0（Seeduplex）']], ['Vivi 2.0', '小何 2.0']],
    ['openai-realtime', 'OpenAI', [
      ['gpt-realtime-2.1', 'GPT-Realtime-2.1'],
      ['gpt-realtime-2.1-mini', 'GPT-Realtime-2.1 mini'],
    ], ['marin', 'cedar']],
    ['gemini-live', 'Google', [['gemini-3.8-live', 'Gemini 3.8 Live']], ['Kore', 'Puck']],
  ];
  const voiceProvider = id => voiceProviders.find(entry => entry[0] === id);
  const llmLabels = { deepseek: '深度求索', qwen: '阿里百炼' };
  const modelNames = { 'deepseek-v4-pro': 'DeepSeek-V4 Pro', 'deepseek-v4-flash': 'DeepSeek-V4 Flash', 'qwen3-max': 'Qwen3-Max', 'gpt-4.1': 'GPT-4.1' };
  const modelLabel = (provider, model) => voiceProvider(provider)?.[2].find(option => option[0] === model)?.[1] || modelNames[model] || model;
  const legacyQwen = '阿里百炼 · Qwen Audio Realtime / qwen-audio-3.1-realtime-plus';
  const previewModels = [
    ['deepseek', 'deepseek-v4-pro'], ['qwen', 'qwen3-max'], ['openai', 'gpt-4.1'],
  ].map(([providerId, model]) => ({
    configId: `demo-${model}`, category: 'llm', providerId, model,
    displayName: modelLabel(providerId, model), provider: llmLabels[providerId] || 'OpenAI',
    values: { baseUrl: apiProviderById(providerId, 'llm').baseUrl }, demo: true,
  }));
  const tabs = [['llm', '大语言模型'], ['voice', '语音模型']];
  const tabHtml = active => '<div class="x3-tabs" role="tablist" aria-label="设置分类">' +
    tabs.map(([id, label]) => `<button type="button" role="tab" data-x3-tab="${id}" aria-selected="${id === active}">${label}</button>`).join('') + '</div>';
  const option = ([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`;
  const select = (name, label, options) => `<label>${label}<select name="${name}">${options.map(option).join('')}</select></label>`;
  const singleSelect = (name, label, value) => select(name, label, [[value, value]]);
  const input = (name, label, type = 'text', placeholder = '') =>
    `<label>${label}<input name="${name}" type="${type}" placeholder="${placeholder}"></label>`;
  const keyField = scope => `<div class="x3-key-field"><label for="x3-${scope}-key">API Key</label><div class="x3-key-row"><span class="x3-key"><input id="x3-${scope}-key" name="apiKey" type="password" autocomplete="new-password" aria-describedby="x3-${scope}-key-error"><button type="button" data-x3-reveal aria-label="显示 API Key" aria-pressed="false"><img src="${asset('eye.svg')}" width="18" height="18" alt=""></button></span><button type="button" class="x3-test-connection" data-x3-test-connection title="模拟测试，可输入 demo-key 或 demo-fail 预览结果">测试连接</button></div><p id="x3-${scope}-key-error" class="x3-key-error" hidden></p></div>`;
  const save = '<div class="x3-save-row"><button type="submit" class="x3-save">保存</button></div><p class="x3-feedback" role="status" hidden></p>';
  const toast = '<div class="x3-toast" role="status" hidden></div>';
  const toggle = (name, label) => `<input class="x3-switch" type="checkbox" role="switch" name="${name}" aria-label="${label}">`;
  const dropdown = (id, name, label, options, searchable = false) => `
    <div class="x3-provider" data-x3-picker${searchable ? ' data-x3-searchable' : ''}>
      <span id="${id}-label">${label}</span>
      <button type="button" data-x3-picker-trigger aria-labelledby="${id}-label ${id}-value" aria-expanded="false" aria-controls="${id}-menu"><span id="${id}-value" data-x3-picker-value></span><span aria-hidden="true">⌄</span></button>
      <div id="${id}-menu" class="x3-picker-menu" hidden>
        ${searchable ? `<label class="x3-provider-search"><img src="${asset('search.svg')}" width="16" height="16" alt=""><input type="search" placeholder="搜索提供商" aria-label="搜索提供商"></label>` : ''}
        <div class="x3-provider-list"></div>
        ${searchable ? '<p class="x3-provider-empty" role="status" hidden>没有匹配的提供商</p>' : ''}
      </div>
      <select name="${name}" hidden>${options.map(option).join('')}</select>
    </div>`;
  const list = (category, title, add = '') => `<section class="x3-card x3-configs" data-x3-configs="${category}">
    <header><h3>${title}</h3>${add}</header><div data-x3-config-rows></div>
  </section>`;
  const llmProviders = API_UNIFIED_PROVIDERS.llm.filter(p => p.group !== 'custom')
    .map(p => [p.id, p.id === 'qwen' ? '阿里百炼' : p.label]);
  const api = document.createElement('div');
  api.className = 'x3-reference';
  api.innerHTML = tabHtml('llm') + `
    <div data-x3-view="llm" role="tabpanel" aria-label="大语言模型">
      ${list('llm', '已配置模型', '<button type="button" class="x3-save" data-x3-add>＋ 添加模型</button>')}
      <dialog class="x3-model-dialog" aria-labelledby="x3-dialog-title">
        ${toast}
        <form class="x3-card" data-x3-model="llm" novalidate>
          <header class="x3-dialog-heading"><h3 id="x3-dialog-title">添加模型</h3><button type="button" class="x3-close-dialog" aria-label="关闭">×</button></header>
          ${dropdown('x3-llm-provider', 'provider', '提供商', [...llmProviders, ['custom', '＋ 自定义模型']], true)}
          <div data-x3-custom hidden>${select('protocol', 'API 协议', [['', '选择协议'], ['custom-openai', 'OpenAI 兼容'], ['custom-anthropic', 'Anthropic 兼容']])}</div>
          <div data-x3-preset-model>${singleSelect('model', '模型', '')}</div>
          <div data-x3-custom hidden>${input('modelId', '模型 ID', 'text', '请输入服务商提供的模型 ID')}</div>
          ${keyField('llm')}
          ${input('baseUrl', 'API 地址', 'url', '请输入服务商的 API 地址')}
          <div data-x3-custom hidden>${input('customName', '模型展示名称（选填）', 'text', '例如：我的模型服务')}</div>
          ${save}
        </form>
      </dialog>
    </div>
    <div data-x3-view="voice" role="tabpanel" aria-label="语音模型" hidden>
      <form class="x3-card" data-x3-model="voice">
        <h3>配置语音模型</h3>
        ${select('mode', '通话方式', [['local', '混合模式'], ['cloud', '云端模式']])}
        <div class="x3-fields x3-local-fields" data-x3-local>
          ${singleSelect('recognition', '语音识别', defaults.recognition)}
          ${singleSelect('dialogue', '对话模型', defaults.dialogue)}
          ${singleSelect('synthesis', '语音合成', defaults.synthesis)}
        </div>
        <div class="x3-fields" data-x3-cloud hidden>
          ${dropdown('x3-voice-provider', 'provider', '供应商', voiceProviders.map(([id, label]) => [id, label]))}
          ${keyField('voice')}
          ${dropdown('x3-voice-model', 'model', '语音模型', [])}
          ${singleSelect('voice', '音色', '')}
        </div>
        ${save}
      </form>
      ${list('voice', '已配置语音模型')}
      <div class="x3-card x3-row"><strong>听写快捷键</strong>
        <div class="x3-shortcut-control">
          <button type="button" class="x3-shortcut">点击设置快捷键</button>
          <button type="button" class="x3-shortcut-clear" aria-label="清除听写快捷键" title="清除听写快捷键" hidden>×</button>
        </div>
      </div>
      <div class="x3-card">
        <div class="x3-row"><strong data-x3-wake-label>语音唤醒</strong>${toggle('wake', '语音唤醒')}</div>
        <form class="x3-wake-form" hidden>
          <input name="wakeWord" aria-label="语音唤醒词" minlength="2" maxlength="6" required>
          <button class="x3-save" type="submit">保存</button>
          <small>支持 2–6 个汉字，默认唤醒词为“小瑞”。</small>
        </form>
      </div>
      <div class="x3-card x3-row"><strong>麦克风权限</strong>${toggle('microphone', '麦克风权限')}</div>
    </div>
    ${toast}
    <dialog class="x3-remove-dialog" aria-labelledby="x3-remove-title">
      <form class="x3-card" method="dialog">
        <h3 id="x3-remove-title">删除模型配置？</h3>
        <p data-x3-remove-copy></p>
        <div class="x3-save-row"><button type="submit" class="soft-button" value="cancel" autofocus>取消</button><button type="submit" class="x3-danger" value="confirm">确认</button></div>
      </form>
    </dialog>`;
  const system = document.createElement('div');
  system.className = 'x3-reference';
  system.innerHTML = `
    <div role="tabpanel" aria-label="系统设置">
      <div class="x3-card x3-row"><label for="p2-interface-language"><strong>语言偏好</strong></label><span data-x3-language></span></div>
      <div class="x3-card x3-row"><div><strong>大小屏同步</strong><small>开启后，大屏切换菜单小屏同步切换。</small></div>${toggle('sync', '大小屏同步')}</div>
    </div>`;
  language.querySelector('option[value="zh-CN"]').textContent = '中文';
  system.querySelector('[data-x3-language]').replaceWith(language);
  apiPanel.append(api);
  systemPanel.append(system);

  const llm = api.querySelector('[data-x3-model="llm"]');
  const modelDialog = api.querySelector('.x3-model-dialog');
  const removeDialog = api.querySelector('.x3-remove-dialog');
  const voice = api.querySelector('[data-x3-model="voice"]');
  const wakeForm = api.querySelector('.x3-wake-form');
  const shortcut = api.querySelector('.x3-shortcut');
  const clearShortcut = api.querySelector('.x3-shortcut-clear');
  const shortcutField = () => voice.elements.mode.value === 'cloud' ? 'cloudShortcut' : 'localShortcut';
  function renderShortcut() {
    const value = preferences[shortcutField()];
    const recording = Boolean(shortcut.dataset.recording);
    shortcut.textContent = recording ? '请按组合键' : value || '点击设置快捷键';
    shortcut.setAttribute('aria-label', value && !recording ? `修改听写快捷键：${value}` : shortcut.textContent);
    clearShortcut.hidden = recording || !value;
  }
  const feedback = (form, message = '', tone = 'error') => {
    const status = form.querySelector('.x3-feedback');
    status.hidden = !message;
    status.dataset.tone = tone;
    status.textContent = message;
  };
  function updatePreferences(next) {
    try {
      const updated = { ...preferences, ...next };
      phase2Storage.setItem(key, JSON.stringify(updated));
      preferences = updated;
      return true;
    } catch { return false; }
  }
  function renderVoice() {
    const cloud = voice.elements.mode.value === 'cloud';
    voice.querySelector('[data-x3-cloud]').hidden = !cloud;
    voice.querySelector('[data-x3-local]').hidden = cloud;
    api.querySelector('[data-x3-wake-label]').textContent = cloud && preferences.wake ? '语音唤醒词设置' : '语音唤醒';
    wakeForm.hidden = !preferences.wake;
    renderShortcut();
  }
  function renderTabs() {
    api.querySelectorAll('[role="tab"]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.x3Tab === modelTab)));
    api.querySelectorAll('[data-x3-view]').forEach(panel => { panel.hidden = panel.dataset.x3View !== modelTab; });
  }
  function setTab(target) {
    modelTab = target;
    if (APP_STATE.configSubpage !== 'api') setConfigSubpage('api');
    switchApiModelTab(target);
    renderTabs();
  }
  let editingLlm = null;
  let editingVoice = null;
  let replacingVoice = false;
  let pendingRemoval = null;
  const listTests = new Set();
  const formTests = new WeakMap();
  const iconButton = (icon, label, action, disabled = false) =>
    `<button type="button" data-x3-action="${action}" title="${label}" aria-label="${label}" ${disabled ? 'disabled' : ''}><img src="${asset(`${icon}.svg`)}" width="18" height="18" alt=""></button>`;

  function showResult(message, tone, dialog = null) {
    const notice = (dialog || api).querySelector(':scope > .x3-toast');
    clearTimeout(notice.hideTimer);
    notice.dataset.tone = tone;
    notice.innerHTML = `<span class="x3-toast-icon" aria-hidden="true">${tone === 'error' ? '!' : '✓'}</span>${escapeHtml(message)}`;
    notice.hidden = false;
    notice.hideTimer = setTimeout(() => { notice.hidden = true; }, 3200);
  }

  function renderConfigs() {
    for (const category of ['llm', 'voice']) {
      const container = api.querySelector(`[data-x3-configs="${category}"] [data-x3-config-rows]`);
      const records = apiCategoryConfigs(category);
      const mixed = preferences.mixedConfig;
      const rows = category === 'voice' && mixed ? [{ configId: 'mixed', mixed: true, ...mixed }, ...records] : records;
      container.innerHTML = rows.map(config => {
        const name = config.mixed ? '混合模式' : config.displayName || modelLabel(config.providerId, config.model);
        const detail = config.mixed ? [config.recognition, config.dialogue, config.synthesis].join(' / ')
          : category === 'voice' ? [config.provider, config.values?.voice].filter(Boolean).join(' · ')
          : llmLabels[config.providerId] || config.provider || '';
        const logos = { deepseek: 'deepseek.png', qwen: 'qwen.png', openai: 'openai.png' };
        const logo = category === 'llm' && logos[config.providerId];
        const busy = listTests.has(config.configId);
        return `<div class="x3-config-row" data-x3-record="${escapeHtml(config.configId)}">
          <div class="x3-config-description">${logo ? `<img class="x3-provider-logo" src="${asset(logo)}" width="24" height="24" alt="">` : ''}<strong>${escapeHtml(name)}</strong><span>${escapeHtml(detail)}</span></div>
          <div class="x3-config-actions">${iconButton('edit', '编辑', 'edit')}${busy ? '<span class="x3-icon-loading" role="status" aria-label="测试中"><i class="x3-spinner"></i></span>' : iconButton('test', config.mixed ? '测试配置' : '测试连接', 'test')}${iconButton('delete', '删除', 'delete', busy)}</div>
        </div>`;
      }).join('') || `<p class="x3-config-empty">${category === 'llm' ? '暂无已配置模型' : '暂无已配置语音模型'}</p>`;
    }
  }

  function writeConfigs(category, configs) {
    try { persistUnifiedApiConfigs(category, configs); } catch { return false; }
    if (category === 'llm') {
      APP_STATE.apiConfigs = configs;
      if (configs.some(config => config.saved && config.connectionStatus === 'connected')) apiSyncLegacyDefault();
      else APP_STATE.apiSettings = createApiDraft();
    } else {
      APP_STATE.voiceApiConfigs = configs;
    }
    renderApiSettings();
    renderConfigs();
    return true;
  }

  function testFeedback(form, message = '') {
    const error = form.querySelector('.x3-key-error');
    error.textContent = message;
    error.hidden = !message;
    form.elements.apiKey.setAttribute('aria-invalid', String(Boolean(message)));
  }

  function clearTest(form) {
    clearTimeout(formTests.get(form));
    formTests.delete(form);
    const button = form.querySelector('[data-x3-test-connection]');
    button.disabled = false;
    button.textContent = '测试连接';
    form.querySelector('.x3-save').disabled = false;
    testFeedback(form);
    feedback(form);
    if (form === llm) {
      const notice = modelDialog.querySelector('.x3-toast');
      clearTimeout(notice.hideTimer);
      notice.hidden = true;
    }
  }

  function renderLlmOptions(selected) {
    const custom = llm.elements.provider.value === 'custom';
    llm.querySelectorAll('[data-x3-custom]').forEach(field => { field.hidden = !custom; });
    llm.querySelector('[data-x3-preset-model]').hidden = custom;
    llm.elements.model.disabled = custom;
    if (custom) return;
    const provider = apiProviderById(llm.elements.provider.value, 'llm');
    const models = [...new Set([...(provider?.models || []), ...(selected ? [selected] : [])])];
    llm.elements.model.replaceChildren(new Option('请选择模型', ''), ...models.map(model => new Option(modelLabel(provider.id, model), model)));
    llm.elements.model.value = selected || '';
  }

  function resetKey(form, hasCredential = false) {
    const reveal = form.querySelector('[data-x3-reveal]');
    form.elements.apiKey.value = '';
    form.elements.apiKey.placeholder = hasCredential ? '••••••••••••••••' : '';
    form.elements.apiKey.type = 'password';
    reveal.setAttribute('aria-pressed', 'false');
    reveal.setAttribute('aria-label', '显示 API Key');
  }

  function openModel(config = null) {
    editingLlm = config;
    clearTest(llm);
    llm.reset();
    const providerId = config?.providerId || 'qwen';
    const provider = apiProviderById(providerId, 'llm');
    const custom = provider?.group === 'custom';
    llm.querySelector('#x3-dialog-title').textContent = config ? '编辑模型' : '添加模型';
    llm.elements.provider.value = custom ? 'custom' : provider?.id || 'qwen';
    llm.elements.protocol.value = custom ? providerId : '';
    llm.elements.modelId.value = custom ? config.model : '';
    llm.elements.customName.value = custom && config.displayName !== config.model ? config.displayName : '';
    llm.elements.baseUrl.value = config?.values?.baseUrl || config?.values?.endpoint || provider?.baseUrl || '';
    resetKey(llm, config?.hasCredential || config?.demo);
    renderLlmOptions(custom ? '' : config?.model);
    syncPicker(llm.elements.provider);
    modelDialog.showModal();
  }

  function fillVoiceOptions(config = null) {
    const id = voice.elements.provider.value;
    const provider = voiceProvider(id);
    const savedModel = config?.values?.voiceModel || config?.model;
    const model = id === 'qwen-realtime' && savedModel === legacyQwen ? provider[2][0][0] : savedModel;
    const savedVoice = config?.values?.voice;
    const models = new Map(provider?.[2] || []);
    if (model && !models.has(model)) models.set(model, model);
    const voices = [...new Set([...(provider?.[3] || []), ...(savedVoice ? [savedVoice] : [])])];
    voice.elements.model.replaceChildren(...Array.from(models, ([id, label]) => new Option(label, id)));
    voice.elements.voice.replaceChildren(...voices.map(label => new Option(label, label)));
    if (model) voice.elements.model.value = model;
    if (savedVoice) voice.elements.voice.value = savedVoice;
    syncPicker(voice.elements.model);
  }

  function editVoice(config, focus = true) {
    editingVoice = config;
    replacingVoice = Boolean(config && focus);
    clearTest(voice);
    const field = voice.elements.provider;
    const id = config?.providerId || 'qwen-realtime';
    if (![...field.options].some(item => item.value === id)) field.add(new Option(config.provider, id));
    field.value = id;
    syncPicker(field);
    resetKey(voice, config?.hasCredential);
    fillVoiceOptions(config);
    if (config && focus) {
      voice.elements.mode.value = 'cloud';
      renderVoice();
      voice.querySelector('#x3-voice-provider-label + button').focus();
    }
  }

  function cloudDraft(category, form, prior) {
    const fields = new FormData(form);
    const custom = category === 'llm' && fields.get('provider') === 'custom';
    const providerId = custom ? fields.get('protocol') : fields.get('provider');
    if (!providerId) return { error: '请选择 API 协议。' };
    const provider = apiProviderById(providerId, category);
    const model = custom ? fields.get('modelId').trim() : fields.get('model');
    if (!model) return { error: custom ? '请输入模型 ID。' : '请选择模型。' };
    const sameProvider = prior?.providerId === providerId;
    let values;
    if (category === 'llm') {
      const address = fields.get('baseUrl').trim();
      if (!address) return { error: '请输入 API 地址。' };
      try {
        if (!['http:', 'https:'].includes(new URL(address).protocol)) throw new Error();
      } catch { return { error: '请输入有效的 HTTP 或 HTTPS API 地址。' }; }
      const existingValues = sameProvider ? prior.values : {};
      values = custom ? { ...existingValues, baseUrl: address, protocol: provider?.protocol, modelId: model }
        : { ...existingValues, baseUrl: address, model };
      if (providerId === 'azure-openai') Object.assign(values, { endpoint: address, deployment: model });
    } else {
      if (!fields.get('voice')) return { error: '请选择音色。' };
      values = { ...(sameProvider ? prior.values : {}), voiceModel: model, voice: fields.get('voice') };
    }
    const apiKey = fields.get('apiKey').trim();
    if (!apiKey && !(sameProvider && (prior.hasCredential || prior.demo))) return { error: '请输入 API Key。', field: 'key' };
    const providerLabel = category === 'voice' ? form.elements.provider.selectedOptions[0].text
      : llmLabels[providerId] || provider?.label || prior?.provider;
    const displayName = (custom ? fields.get('customName').trim() : '') || modelLabel(providerId, model);
    return { providerId, model, values, apiKey, displayName, providerLabel, region: provider?.region || prior?.marketLabel };
  }

  function saveCloud(category, form, prior) {
    const draft = cloudDraft(category, form, prior);
    if (draft.error) return draft.field === 'key' ? testFeedback(form, draft.error) : feedback(form, draft.error);
    const configId = prior?.configId || `model-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const hasCredential = Boolean(draft.apiKey || prior?.hasCredential);
    const record = {
      configId, category, providerId: draft.providerId, provider: draft.providerLabel, displayName: draft.displayName,
      marketLabel: draft.region, model: draft.model, defaultModelId: draft.model, availableModels: [draft.model], values: draft.values,
      hasCredential, status: '已配置', connectionStatus: hasCredential ? 'connected' : 'unconfigured', saved: hasCredential, lastTest: nowText(), lastValidatedAt: null,
      ...(hasCredential ? { credentialRef: `credential://${configId}` } : { demo: true }),
    };
    const records = apiCategoryConfigs(category);
    const configs = prior ? records.map(item => item.configId === configId ? record : item) : [...records, record];
    if (!writeConfigs(category, configs)) return feedback(form, '保存失败，请重试。');
    if (category === 'llm') modelDialog.close();
    else {
      editingVoice = record;
      replacingVoice = false;
      updatePreferences({ mode: 'cloud', activeVoiceId: configId });
      resetKey(form, hasCredential);
    }
    showResult('已保存模型配置', 'success');
  }

  function testCloud(category, form, prior) {
    clearTest(form);
    const draft = cloudDraft(category, form, prior);
    if (draft.error) return draft.field === 'key' ? testFeedback(form, draft.error) : feedback(form, draft.error);
    const button = form.querySelector('[data-x3-test-connection]');
    const saveButton = form.querySelector('.x3-save');
    button.disabled = true;
    saveButton.disabled = true;
    button.innerHTML = '<i class="x3-spinner" aria-hidden="true"></i>检测中…';
    formTests.set(form, setTimeout(() => {
      clearTest(form);
      const failed = /^(demo-fail|invalid)$/i.test(draft.apiKey);
      if (failed) {
        testFeedback(form, 'API Key 无效或没有权限访问该模型');
        saveButton.disabled = true;
      }
      showResult(failed ? '连接失败' : '连接成功', failed ? 'error' : 'success', category === 'llm' ? modelDialog : null);
    }, 650));
  }

  for (const root of [api, system]) {
    root.addEventListener('click', event => {
      const tab = event.target.closest('[data-x3-tab]');
      if (tab) {
        setTab(tab.dataset.x3Tab);
        api.querySelector('[aria-selected="true"]').focus();
      }
      const reveal = event.target.closest('[data-x3-reveal]');
      if (reveal) {
        const field = reveal.previousElementSibling;
        const show = field.type === 'password';
        field.type = show ? 'text' : 'password';
        reveal.setAttribute('aria-pressed', String(show));
        reveal.setAttribute('aria-label', show ? '隐藏 API Key' : '显示 API Key');
      }
    });
  }
  const pickers = new Map();
  function syncPicker(field) {
    pickers.get(field)?.render();
  }
  for (const picker of api.querySelectorAll('[data-x3-picker]')) {
    const field = picker.querySelector('select');
    const trigger = picker.querySelector('[data-x3-picker-trigger]');
    const menu = picker.querySelector('.x3-picker-menu');
    const list = menu.querySelector('.x3-provider-list');
    const search = menu.querySelector('input');
    const empty = menu.querySelector('.x3-provider-empty');
    const customButton = search && document.createElement('button');
    function selectOption(value) {
      if (field.value !== value) {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
      toggleMenu(false);
      trigger.focus();
    }
    if (customButton) {
      customButton.type = 'button';
      customButton.dataset.x3PickerOption = 'custom';
      customButton.textContent = '＋ 自定义模型';
      customButton.addEventListener('click', () => selectOption('custom'));
      menu.append(customButton);
    }
    function render() {
      trigger.querySelector('[data-x3-picker-value]').textContent = field.selectedOptions[0]?.text || '请选择';
      if (customButton) customButton.setAttribute('aria-pressed', String(field.value === 'custom'));
      const query = search?.value.trim().toLowerCase() || '';
      const visible = [...field.options].filter(item => item.value !== 'custom' &&
        (item.text.toLowerCase().includes(query) || item.value.toLowerCase().includes(query)));
      list.replaceChildren(...visible.map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.x3PickerOption = item.value;
        button.textContent = item.text;
        button.setAttribute('aria-pressed', String(item.selected));
        button.addEventListener('click', () => selectOption(item.value));
        return button;
      }));
      if (empty) empty.hidden = Boolean(visible.length);
      list.scrollTop = 0;
    }
    function toggleMenu(open) {
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (!open) return;
      for (const [otherField, other] of pickers) if (field !== otherField) other.close();
      if (search) search.value = '';
      render();
      (search || list.querySelector('[aria-pressed="true"]') || list.firstElementChild)?.focus({ preventScroll: true });
    }
    pickers.set(field, { render, close: () => toggleMenu(false) });
    search?.addEventListener('input', render);
    trigger.addEventListener('click', () => toggleMenu(menu.hidden));
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      toggleMenu(true);
    });
    picker.addEventListener('keydown', event => {
      if (menu.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu(false);
        trigger.focus();
      } else if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target !== trigger) {
        event.preventDefault();
        const buttons = [...menu.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? buttons.length - 1 : index - 1;
        (buttons[next] || search)?.focus({ preventScroll: true });
      }
    });
    document.addEventListener('click', event => {
      if (!picker.contains(event.target)) toggleMenu(false);
    });
  }

  llm.elements.provider.addEventListener('change', () => {
    const id = llm.elements.provider.value;
    llm.elements.baseUrl.value = apiProviderById(id, 'llm')?.baseUrl || '';
    llm.elements.protocol.value = '';
    llm.elements.modelId.value = '';
    llm.elements.customName.value = '';
    resetKey(llm, editingLlm?.providerId === id && (editingLlm.hasCredential || editingLlm.demo));
    syncPicker(llm.elements.provider);
    renderLlmOptions();
  });
  llm.addEventListener('input', () => clearTest(llm));
  llm.addEventListener('change', () => clearTest(llm));
  llm.querySelector('[data-x3-test-connection]').addEventListener('click', () => testCloud('llm', llm, editingLlm));
  llm.addEventListener('submit', event => {
    event.preventDefault();
    if (!llm.querySelector('.x3-save').disabled) saveCloud('llm', llm, editingLlm);
  });
  modelDialog.querySelector('.x3-close-dialog').addEventListener('click', () => modelDialog.close());
  modelDialog.addEventListener('click', event => { if (event.target === modelDialog) modelDialog.close(); });
  modelDialog.addEventListener('close', () => {
    clearTest(llm);
    pickers.get(llm.elements.provider).close();
    resetKey(llm);
  });
  api.querySelector('[data-x3-add]').addEventListener('click', () => openModel());
  voice.elements.provider.addEventListener('change', () => {
    const sameProvider = editingVoice?.providerId === voice.elements.provider.value;
    if (!sameProvider && !replacingVoice) editingVoice = null;
    resetKey(voice, sameProvider && editingVoice.hasCredential);
    syncPicker(voice.elements.provider);
    fillVoiceOptions(sameProvider ? editingVoice : null);
  });
  voice.elements.model.addEventListener('change', () => syncPicker(voice.elements.model));
  voice.addEventListener('input', () => clearTest(voice));
  voice.addEventListener('change', () => clearTest(voice));
  voice.elements.mode.addEventListener('change', () => {
    delete shortcut.dataset.recording;
    renderVoice();
  });
  voice.querySelector('[data-x3-test-connection]').addEventListener('click', () => testCloud('voice', voice, editingVoice));
  voice.addEventListener('submit', event => {
    event.preventDefault();
    if (voice.querySelector('.x3-save').disabled) return;
    if (voice.elements.mode.value === 'cloud') return saveCloud('voice', voice, editingVoice);
    const { recognition, dialogue, synthesis } = voice.elements;
    const mixedConfig = { recognition: recognition.value, dialogue: dialogue.value, synthesis: synthesis.value };
    if (!updatePreferences({ mode: 'local', ...mixedConfig, mixedConfig })) return feedback(voice, '保存失败，请重试。');
    renderConfigs();
    showResult('已保存语音模型配置', 'success');
  });

  api.addEventListener('click', event => {
    const action = event.target.closest('[data-x3-action]');
    if (!action) return;
    const id = action.closest('[data-x3-record]').dataset.x3Record;
    const category = action.closest('[data-x3-configs]').dataset.x3Configs;
    const mixed = category === 'voice' && id === 'mixed';
    const config = mixed ? preferences.mixedConfig : apiCategoryConfigs(category).find(item => item.configId === id);
    if (!config) return;
    if (action.dataset.x3Action === 'edit') {
      if (mixed) {
        voice.elements.mode.value = 'local';
        for (const name of ['recognition', 'dialogue', 'synthesis']) voice.elements[name].value = config[name];
        renderVoice();
        voice.elements.recognition.focus();
      } else if (category === 'voice') editVoice(config);
      else openModel(config);
    } else if (action.dataset.x3Action === 'test') {
      if (listTests.has(id)) return;
      listTests.add(id);
      renderConfigs();
      setTimeout(() => {
        listTests.delete(id);
        renderConfigs();
        showResult(mixed ? '模拟配置测试通过' : '连接成功', 'success');
        const row = [...api.querySelectorAll('[data-x3-record]')].find(item => item.dataset.x3Record === id);
        if (document.activeElement === document.body) row?.querySelector('[data-x3-action="test"]')?.focus();
      }, 650);
    } else {
      pendingRemoval = { id, category, mixed };
      removeDialog.querySelector('[data-x3-remove-copy]').textContent = `删除「${mixed ? '混合模式' : config.displayName || config.model}」的配置？`;
      removeDialog.returnValue = '';
      removeDialog.showModal();
    }
  });
  removeDialog.addEventListener('close', () => {
    const target = pendingRemoval;
    pendingRemoval = null;
    if (removeDialog.returnValue !== 'confirm' || !target) return;
    const ok = target.mixed ? updatePreferences({ mixedConfig: null })
      : writeConfigs(target.category, apiCategoryConfigs(target.category).filter(item => item.configId !== target.id));
    if (!ok) return showResult('删除失败，请重试', 'error');
    if (target.category === 'voice' && editingVoice?.configId === target.id) {
      updatePreferences({ activeVoiceId: null });
      editVoice();
    }
    renderConfigs();
    showResult('已删除模型配置', 'success');
  });
  wakeForm.addEventListener('submit', event => {
    event.preventDefault();
    const word = wakeForm.elements.wakeWord.value.trim();
    if (updatePreferences({ wakeWord: word })) wakeForm.elements.wakeWord.value = word;
  });
  for (const box of [api, system].flatMap(root => [...root.querySelectorAll('.x3-switch')])) {
    box.checked = Boolean(preferences[box.name]);
    box.addEventListener('change', () => {
      if (!updatePreferences({ [box.name]: box.checked })) box.checked = Boolean(preferences[box.name]);
      renderVoice();
    });
  }
  shortcut.addEventListener('click', () => {
    shortcut.dataset.recording = 'true';
    renderShortcut();
  });
  shortcut.addEventListener('blur', () => {
    delete shortcut.dataset.recording;
    renderShortcut();
  });
  clearShortcut.addEventListener('click', () => {
    updatePreferences({ [shortcutField()]: '' });
    renderShortcut();
    shortcut.focus();
  });
  shortcut.addEventListener('keydown', event => {
    if (!shortcut.dataset.recording || event.key === 'Tab') return;
    event.preventDefault();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
    if (event.key !== 'Escape') {
      const letter = /^Key[A-Z]$/.test(event.code) ? event.code.slice(3) : event.key.toUpperCase();
      const combo = [event.ctrlKey && '⌃', event.altKey && '⌥', event.shiftKey && '⇧', event.metaKey && '⌘', letter].filter(Boolean).join('');
      updatePreferences({ [shortcutField()]: combo });
    }
    delete shortcut.dataset.recording;
    renderShortcut();
  });

  if (apiCategoryConfigs('llm').length === 0 && phase2Storage.getItem(apiStorageKey('llm')) === null) {
    APP_STATE.apiConfigs = previewModels;
  }
  if (!Object.hasOwn(preferences, 'mixedConfig')) {
    const { recognition, dialogue, synthesis } = preferences;
    preferences.mixedConfig = { recognition, dialogue, synthesis };
  }
  const savedVoice = apiCategoryConfigs('voice').find(item => item.configId === preferences.activeVoiceId)
    || apiCategoryConfigs('voice')[0];
  editVoice(savedVoice, false);
  voice.elements.mode.value = preferences.mode;
  for (const name of ['recognition', 'dialogue', 'synthesis']) voice.elements[name].value = preferences[name];
  wakeForm.elements.wakeWord.value = preferences.wakeWord;
  renderConfigs();
  renderVoice();
  if (new URLSearchParams(location.search).get('settingsTab') === 'api') {
    window.addEventListener('load', () => setConfigSubpage('api'), { once: true });
  }
})();
