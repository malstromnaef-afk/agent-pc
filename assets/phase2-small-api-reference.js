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

  const qwen = '阿里百炼 · Qwen Audio Realtime / qwen-audio-3.1-realtime-plus';
  const tabs = [['llm', '大语言模型'], ['voice', '语音模型']];
  const tabHtml = active => '<div class="x3-tabs" role="tablist" aria-label="设置分类">' +
    tabs.map(([id, label]) => `<button type="button" role="tab" data-x3-tab="${id}" aria-selected="${id === active}">${label}</button>`).join('') + '</div>';
  const select = (name, label, options) => `<label>${label}<select name="${name}">${options.map(
    ([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`
  ).join('')}</select></label>`;
  const singleSelect = (name, label, value) => select(name, label, [[value, value]]);
  const input = (name, label, type = 'text', placeholder = '') =>
    `<label>${label}<input name="${name}" type="${type}" placeholder="${placeholder}"></label>`;
  const keyField = '<label>API Key<span class="x3-key"><input name="apiKey" type="password" autocomplete="new-password"><button type="button" data-x3-reveal aria-label="显示 API Key" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5-10-5-10-5Z"/><circle cx="12" cy="12" r="2.3"/></svg></button></span></label>';
  const save = '<div class="x3-save-row"><button type="submit" class="x3-save">保存</button></div><p class="x3-feedback" role="status" hidden></p>';
  const toggle = (name, label) => `<input class="x3-switch" type="checkbox" role="switch" name="${name}" aria-label="${label}">`;
  const providers = category => API_UNIFIED_PROVIDERS[category].map(p => [p.id, p.label === '通义千问' || p.id === 'qwen-realtime' ? '阿里百炼' : p.label]);
  const api = document.createElement('div');
  api.className = 'x3-reference';
  api.innerHTML = tabHtml('llm') + `
    <div data-x3-view="llm" role="tabpanel" aria-label="大语言模型">
      <form class="x3-card" data-x3-model="llm">
        <h3>配置大语言模型</h3>
        ${select('provider', '配置名称', providers('llm'))}
        ${input('baseUrl', 'API 基础地址', 'url', '请输入服务商的 API 基础地址')}
        ${keyField}
        ${singleSelect('model', '大语言模型', qwen)}
        ${save}
      </form>
    </div>
    <div data-x3-view="voice" role="tabpanel" aria-label="语音模型" hidden>
      <form class="x3-card" data-x3-model="voice">
        <h3>配置语音模型</h3>
        ${select('mode', '通话方式', [['local', '本地模型'], ['cloud', '云端模型']])}
        <div class="x3-fields x3-local-fields" data-x3-local>
          ${singleSelect('recognition', '语音识别', defaults.recognition)}
          ${singleSelect('dialogue', '对话模型', defaults.dialogue)}
          ${singleSelect('synthesis', '语音合成', defaults.synthesis)}
        </div>
        <div class="x3-fields" data-x3-cloud hidden>
          ${input('displayName', '配置名称', 'text', '阿里百炼 · 实时语音')}
          ${keyField}
          ${singleSelect('model', '语音模型', qwen)}
          ${singleSelect('voice', '音色', 'longmiao_v3.1')}
        </div>
        ${save}
      </form>
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
    </div>`;
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
  const feedback = (form, message) => {
    const status = form.querySelector('.x3-feedback');
    status.hidden = false;
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
  function renderLlmOptions(selected) {
    const provider = apiProviderById(llm.elements.provider.value, 'llm');
    const models = provider.id === 'qwen' ? [qwen, ...provider.models] : provider.models || [];
    llm.elements.model.replaceChildren(...(models.length ? models : ['自定义模型']).map(model => new Option(model, model)));
    if (models.includes(selected)) llm.elements.model.value = selected;
  }
  function saveCloud(category, form) {
    const fields = new FormData(form);
    const prior = apiCategoryConfigs(category)[0];
    const sameProvider = prior?.providerId === (category === 'llm' ? fields.get('provider') : 'qwen-realtime');
    const provider = apiProviderById(category === 'llm' ? fields.get('provider') : 'qwen-realtime', category);
    const name = category === 'llm' ? form.elements.provider.selectedOptions[0].text : fields.get('displayName').trim() || '阿里百炼 · 实时语音';
    const endpoint = category === 'llm' ? fields.get('baseUrl').trim() : '';
    const model = fields.get('model');
    if (category === 'llm' && !endpoint) return feedback(form, '请输入 API 基础地址。');
    if (!fields.get('apiKey').trim() && !(sameProvider && prior.hasCredential)) return feedback(form, '请输入 API Key。');
    const configId = sameProvider ? prior.configId : `model-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const values = category === 'llm' ? { baseUrl: endpoint, model } : { voiceModel: model, voice: fields.get('voice') };
    const record = {
      configId, category, providerId: provider.id, provider: provider.label, displayName: name,
      marketLabel: provider.region, model, defaultModelId: model, availableModels: [model], values,
      hasCredential: true, credentialRef: `credential://${configId}`, status: '已配置',
      connectionStatus: 'connected', saved: true, lastTest: nowText(), lastValidatedAt: null,
    };
    const configs = [record, ...apiCategoryConfigs(category).filter(item => item.configId !== configId)];
    try { persistUnifiedApiConfigs(category, configs); } catch { return feedback(form, '保存失败，请重试。'); }
    if (category === 'llm') {
      APP_STATE.apiConfigs = configs;
      apiSyncLegacyDefault();
    } else {
      APP_STATE.voiceApiConfigs = configs;
      updatePreferences({ mode: 'cloud' });
    }
    form.elements.apiKey.value = '';
    form.elements.apiKey.placeholder = '••••••••••••••••';
    renderApiSettings();
    feedback(form, '已保存原型配置。');
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
  llm.elements.provider.addEventListener('change', () => {
    llm.elements.baseUrl.value = apiProviderById(llm.elements.provider.value, 'llm').baseUrl || '';
    llm.elements.apiKey.value = '';
    llm.elements.apiKey.placeholder = '';
    renderLlmOptions();
  });
  llm.addEventListener('submit', event => { event.preventDefault(); saveCloud('llm', llm); });
  voice.elements.mode.addEventListener('change', () => {
    delete shortcut.dataset.recording;
    renderVoice();
  });
  voice.addEventListener('submit', event => {
    event.preventDefault();
    if (voice.elements.mode.value === 'cloud') return saveCloud('voice', voice);
    const { recognition, dialogue, synthesis } = voice.elements;
    feedback(voice, updatePreferences({
      mode: 'local', recognition: recognition.value, dialogue: dialogue.value, synthesis: synthesis.value,
    }) ? '已保存原型配置。' : '保存失败，请重试。');
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

  const llmConfig = apiCategoryConfigs('llm')[0];
  llm.elements.provider.value = apiProviderById(llmConfig?.providerId, 'llm') ? llmConfig.providerId : 'qwen';
  llm.elements.baseUrl.value = llmConfig?.values?.baseUrl || '';
  llm.elements.apiKey.placeholder = llmConfig?.hasCredential ? '••••••••••••••••' : '';
  renderLlmOptions(llmConfig?.model);
  const voiceConfig = apiCategoryConfigs('voice')[0];
  voice.elements.displayName.value = voiceConfig?.displayName || '阿里百炼 · 实时语音';
  voice.elements.apiKey.placeholder = voiceConfig?.hasCredential ? '••••••••••••••••' : '';
  voice.elements.mode.value = preferences.mode;
  for (const name of ['recognition', 'dialogue', 'synthesis']) voice.elements[name].value = preferences[name];
  wakeForm.elements.wakeWord.value = preferences.wakeWord;
  renderVoice();
})();
