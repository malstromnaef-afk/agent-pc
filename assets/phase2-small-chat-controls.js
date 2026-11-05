/* Small-model prototype: per-session generation and composer drafts.
 * Answers remain local demonstration text; this does not call a model service.
 */
(() => {
  const drafts = new Map();
  const requests = new Map();
  let newDraftId = 'draft-' + crypto.randomUUID();
  let revealLatest = false;
  const key = () => QA_STATE.activeSessionId || newDraftId;
  const originalRender = qaRender;
  const originalComposerRender = qaComposerRender;
  const sendIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>';
  const stopIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  function updateButton() {
    const button = qaRoot()?.querySelector('#voice-send-button');
    if (!button) return;
    const generating = requests.has(key());
    const blocked = !navigator.onLine || !qaModels().length || ['offline','no-model','model-invalid'].includes(QA_STATE.issue);
    const text = qaRoot()?.querySelector('#voice-text-input')?.value || QA_STATE.draft;
    const disabled = !generating && (blocked || (!text.trim() && !qaComposerSelection.files.length));
    button.disabled = disabled;
    button.classList.toggle('is-generating', generating);
    button.setAttribute('aria-label', generating ? '停止生成' : '发送问题');
    button.title = generating ? '停止生成，保留已有回答' : blocked ? '当前暂不可发送' : '发送问题';
    button.innerHTML = generating ? stopIcon : sendIcon;
  }

  function stash() {
    const id = key();
    const value = {
      messages: QA_STATE.messages,
      draft: qaRoot()?.querySelector('#voice-text-input')?.value ?? QA_STATE.draft,
      skill: qaComposerSelection.skill,
      files: [...qaComposerSelection.files],
      phase: QA_STATE.phase,
      model: QA_STATE.selectedModelKey
    };
    drafts.set(id, value);
    const record = QA_STATE.recentSessions.find(s => s.sessionId === id);
    if (record) record.messages = value.messages;
    return value;
  }

  function updateRecord(id, messages) {
    const record = QA_STATE.recentSessions.find(s => s.sessionId === id);
    if (!record) return;
    record.messages = messages;
    const answer = [...messages].reverse().find(m => m.role === 'ai');
    record.preview = answer?.text || '';
    record.time = requests.has(id) ? '生成中…' : '刚刚';
    record.updatedAt = new Date().toISOString();
  }

  function activate(id) {
    const record = QA_STATE.recentSessions.find(s => s.sessionId === id);
    if (!record) return;
    const state = drafts.get(id) || {
      messages: (record.messages || []).map(m => ({...m})),
      draft: '', skill: '', files: [], phase: 'success', model: ''
    };
    drafts.set(id, state);
    QA_STATE.activeSessionId = id;
    QA_STATE.messages = state.messages;
    QA_STATE.draft = state.draft;
    QA_STATE.phase = requests.has(id) ? 'thinking' : state.phase;
    QA_STATE.mode = 'text';
    QA_STATE.speaking = false;
    QA_STATE.selectedModelKey = state.model || QA_STATE.selectedModelKey;
    qaComposerSelection.skill = state.skill;
    qaComposerSelection.files = [...state.files];
    qaComposerClose();
    const input = qaRoot()?.querySelector('#voice-text-input');
    if (input) input.value = state.draft;
    qaRender();
    qaComposerRender();
  }

  qaRender = function () {
    const previousConversation = qaRoot()?.querySelector('#qa-conversation');
    const previousScroll = previousConversation?.scrollTop || 0;
    const nearBottom = !previousConversation || previousConversation.scrollHeight - previousScroll - previousConversation.clientHeight < 32;
    originalRender();
    const input = qaRoot()?.querySelector('#voice-text-input');
    if (input && QA_STATE.mode === 'text' && !QA_STATE.textDictating) {
      input.placeholder = '今天帮你做些什么？';
    }
    const bubbles = qaRoot()?.querySelectorAll('#qa-conversation .qa-message') || [];
    QA_STATE.messages.filter(message => message.role !== 'model-switch').forEach((message, i) => {
      if (message.role === 'ai' && message.modelId && !message.loading && bubbles[i]) {
        const model = document.createElement('div');
        model.className = 'qa-answer-model';
        model.textContent = message.modelId;
        bubbles[i].after(model);
      }
      if (message.status !== 'stopped' || !message.text || message.text === '已停止生成。') return;
      const note = document.createElement('span');
      note.className = 'qa-generation-note';
      note.textContent = '已停止生成';
      bubbles[i]?.append(note);
    });
    const conversation = qaRoot()?.querySelector('#qa-conversation');
    if (conversation) conversation.scrollTop = revealLatest || nearBottom ? conversation.scrollHeight : previousScroll;
    revealLatest = false;
    updateButton();
    // qaRender's original callback runs before the button override; sync the finished UI.
    window.phase2Assistant?.conversationChanged();
    const root = qaRoot();
    if (root) syncPhysicalScreenPreview(root);
  };
  qaComposerRender = function () { originalComposerRender(); updateButton(); };

  qaAnswer = function (text) {
    const selected = qaSelectedModel();
    if (!selected) { QA_STATE.issue = 'no-model'; qaRender(); return; }
    const currentDraft = stash();
    if (!QA_STATE.activeSessionId) {
      const id = 'qa-' + crypto.randomUUID();
      drafts.delete(newDraftId);
      drafts.set(id, currentDraft);
      QA_STATE.activeSessionId = id;
      QA_STATE.recentSessions.unshift({sessionId:id,title:text.slice(0,22),time:'生成中…',messages:QA_STATE.messages,createdAt:new Date().toISOString()});
    }
    const id = key();
    const messages = QA_STATE.messages;
    const stamp = new Date().toISOString();
    const answer = {messageId:'msg-'+crypto.randomUUID(),role:'ai',text:'',createdAt:stamp,status:'thinking',loading:true,providerId:selected.providerId,modelId:selected.model};
    messages.push({messageId:'msg-'+crypto.randomUUID(),role:'user',text,createdAt:stamp,inputType:QA_STATE.mode},answer);
    const fullText = /量子|计算/.test(text)
      ? '量子计算利用量子比特的叠加与纠缠处理信息，适合部分搜索、模拟与优化问题。与传统比特只能取 0 或 1 不同，量子比特能够表示多种状态的叠加。不过，量子计算并不会在所有任务上替代经典计算机，实际效果还取决于算法和硬件条件。'
      : '这是基于当前会话生成的内容问答演示。回答会逐步显示，你可以随时点击输入框右下角的停止按钮，保留已经生成的内容。也可以直接切换到其他会话，当前回答会继续生成并保存在原会话中，返回后可继续查看或追问。';
    const request = {answer,messages,timer:null,offset:0};
    requests.set(id, request);
    currentDraft.messages = messages;
    currentDraft.draft = '';
    currentDraft.skill = '';
    currentDraft.files = [];
    currentDraft.phase = 'thinking';
    QA_STATE.draft = '';
    QA_STATE.phase = 'thinking';
    QA_STATE.modelProvider = selected.provider;
    updateRecord(id, messages);
    revealLatest = true;
    qaRender();
    function tick() {
      if (requests.get(id) !== request) return;
      if (!navigator.onLine) {
        requests.delete(id);
        answer.loading = false;
        answer.status = 'failed';
        if (!answer.text) answer.text = '网络连接中断，请恢复网络后重试。';
        currentDraft.phase = 'failed';
        if (drafts.has(id)) drafts.get(id).phase = 'failed';
        if (key() === id) {QA_STATE.phase='failed';QA_STATE.issue='offline';}
      } else {
        request.offset = Math.min(fullText.length, request.offset + 4);
        answer.text = fullText.slice(0, request.offset);
        if (request.offset === fullText.length) {
          requests.delete(id);
          answer.loading = false;
          answer.status = 'success';
          currentDraft.phase = 'success';
          if (drafts.has(id)) drafts.get(id).phase = 'success';
          if (key() === id) {
            QA_STATE.phase = QA_STATE.mode === 'voice' ? 'speaking' : 'success';
            QA_STATE.speaking = QA_STATE.mode === 'voice';
          }
        } else request.timer = setTimeout(tick, 70);
      }
      updateRecord(id, messages);
      if (key() === id) qaRender();
      else qaRenderDrawer(qaRoot()?.querySelector('#qa-drawer-search')?.value || '');
    }
    request.timer = setTimeout(tick, 180);
  };

  function stop() {
    const id = key(), request = requests.get(id);
    if (!request) return;
    clearTimeout(request.timer);
    requests.delete(id);
    request.answer.loading = false;
    request.answer.status = 'stopped';
    if (!request.answer.text) request.answer.text = '已停止生成。';
    const state = drafts.get(id);
    if (state) state.phase = 'stopped';
    QA_STATE.phase = 'stopped';
    QA_STATE.speaking = false;
    updateRecord(id, request.messages);
    qaRender();
  }

  function changeModel(next) {
    if (!qaModels().includes(next) || next === QA_STATE.selectedModelKey) return;
    const previous = qaSelectedModel();
    QA_STATE.selectedModelKey = next;
    const selected = qaSelectedModel();
    if (!selected) return;
    QA_STATE.modelProvider = selected.provider;
    QA_STATE.issue = '';
    if (previous && QA_STATE.messages.some(message => message.role === 'user')) {
      const from = previous.model === selected.model ? previous.provider + ' · ' + previous.model : previous.model;
      const to = previous.model === selected.model ? selected.provider + ' · ' + selected.model : selected.model;
      QA_STATE.messages.push({
        messageId:'model-change-'+crypto.randomUUID(),role:'model-switch',
        text:`模型已从 ${from} 切换为 ${to}`,
        previousModelId:previous.model,modelId:selected.model,
        createdAt:new Date().toISOString()
      });
    }
    // An in-flight request retains its own captured model and message object.
    const state = drafts.get(key());
    if (state) state.model = next;
    updateRecord(key(), QA_STATE.messages);
    revealLatest = true;
    qaRender();
  }

  qaOpenSession = function (id) {
    if (!QA_STATE.recentSessions.some(s => s.sessionId === id)) return;
    stash();
    QA_STATE.sessionDrawerOpen = true;
    activate(id);
  };
  qaCreateSession = function () {
    stash();
    clearTimeout(qaAutoListenTimer);
    QA_STATE.cancelRecognition = true;
    QA_STATE.callActive = false;
    QA_STATE.speaking = false;
    newDraftId = 'draft-' + crypto.randomUUID();
    QA_STATE.activeSessionId = null;
    QA_STATE.messages = [];
    QA_STATE.draft = '';
    QA_STATE.phase = 'idle';
    QA_STATE.sessionDrawerOpen = false;
    qaComposerSelection.skill = '';
    qaComposerSelection.files = [];
    qaComposerClose();
    const input = qaRoot()?.querySelector('#voice-text-input');
    if (input) input.value = '';
    qaRender();qaComposerRender();
  };
  qaRequestNewSession = function () { qaCreateSession(); };
  document.addEventListener('input', event => {
    if (event.target.id === 'voice-text-input') updateButton();
  });
  window.phase2ChatControls = {stop, changeModel};
  qaRender();
})();
