(() => {
  const root = qaRoot();
  if (!root) return;
  root.classList.add('p2-main-chat');
  root.setAttribute('aria-label', '智能对话工作区');
  root.querySelector('.qa-session-drawer-head strong').textContent = '对话';
  root.querySelector('#qa-drawer-search').hidden = false;
  root.querySelector('#qa-session-search-toggle').hidden = true;
  QA_STATE.sessionDrawerOpen = true;

  const page = document.querySelector('#voice .voice-page');
  const notes = document.createElement('div');
  notes.className = 'p2-chat-dev-state';
  notes.hidden = true;
  notes.style.display = 'none';
  page.querySelectorAll(':scope > .qa-permission-panel, :scope > .qa-office-dialog-demo, :scope > .dev-field-notes').forEach(node => notes.append(node));
  page.append(notes);

  const originalRender = qaRender;
  qaRender = function () {
    originalRender();
    const conversation = root.querySelector('#qa-conversation');
    if (!QA_STATE.messages.length) {
      conversation.innerHTML = '<span class="p2-chat-agent">✧ Agent X3</span><h2>有什么需要我帮你处理？</h2><p>直接提问，或添加资料、图片和选中内容。</p><div class="p2-chat-examples"><button type="button" data-p2-chat-prompt="请总结我提供的资料，提取核心观点。"><strong>总结资料</strong><span>提取核心观点与结论</span></button><button type="button" data-p2-chat-prompt="请整理我提供的会议记录，列出结论和待办事项。"><strong>整理会议要点</strong><span>梳理结论与待办事项</span></button><button type="button" data-p2-chat-prompt="请分析选中内容，并说明需要进一步确认的信息。"><strong>分析选中内容</strong><span>结合内容理解当前问题</span></button></div>';
    }
    const input = root.querySelector('#voice-text-input');
    if (QA_STATE.mode === 'text' && !QA_STATE.textDictating) input.placeholder = '输入问题或交办任务…';
  };

  root.addEventListener('click', event => {
    const example = event.target.closest('[data-p2-chat-prompt]');
    if (example) {
      QA_STATE.draft = example.dataset.p2ChatPrompt;
      root.querySelector('#voice-text-input').value = QA_STATE.draft;
      root.querySelector('#voice-text-input').focus();
    }
    if (event.target.closest('#qa-new-session')) {
      QA_STATE.sessionDrawerOpen = true;
      qaRender();
    }
  });
  const requestedPage = new URLSearchParams(location.search).get('page');
  if (requestedPage === 'voice') setActiveTab('voice');
  qaRender();
})();
