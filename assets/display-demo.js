(() => {
  const params = new URLSearchParams(window.location.search);
  const appToolbar = document.querySelector('[data-app-display-toolbar]');
  const displayBridge = window.agentX3Display;
  const feedbacks = [...document.querySelectorAll('[data-display-settings-feedback]')];

  function clearFeedback() {
    feedbacks.forEach((feedback) => {
      feedback.hidden = true;
      feedback.textContent = '';
    });
  }

  function updateAppEntry(externalCount) {
    if (!appToolbar) return;
    appToolbar.hidden = !(externalCount >= 2) || params.get('surface') === 'small-screen';
    clearFeedback();
  }

  // externalDisplays is an explicit HTML preview scenario, never a hardware reading.
  const previewCount = params.get('externalDisplays');
  updateAppEntry(!displayBridge && /^\d+$/.test(previewCount || '') ? Number(previewCount) : 0);

  // Native status supplies the identified built-in display; do not infer it from size.
  function receiveDisplayStatus(status) {
    if (!Array.isArray(status?.displays)) return;
    const builtInId = status.selectedDisplay?.id;
    const hasBuiltIn = builtInId != null && status.displays.some((display) => String(display.id) === String(builtInId));
    updateAppEntry(hasBuiltIn
      ? status.displays.filter((display) => String(display.id) !== String(builtInId)).length
      : 0);
  }
  if (displayBridge) {
    displayBridge.onStatusChanged?.(receiveDisplayStatus);
    const refresh = () => displayBridge.getStatus?.().then(receiveDisplayStatus).catch(() => {});
    refresh();
    window.addEventListener('focus', refresh);
  }

  document.querySelectorAll('[data-display-open-settings]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
      const isWindows = /Windows|Win32|Win64/i.test(platform);
      // On Windows the ms-settings link opens the actual OS window. No App settings page.
      if (isWindows) return;
      event.preventDefault();
      const feedback = link.closest('.app-display-toolbar, .display-screen')?.querySelector('[data-display-settings-feedback]');
      if (!feedback) return;
      feedback.textContent = '请在 Windows 电脑中打开“设置 → 系统 → 屏幕（显示）”，将目标外接显示器设为主显示器。';
      feedback.hidden = false;
    });
  });

  const root = document.querySelector('#display-demo-page');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[data-display-demo-state]')];
  const panels = [...root.querySelectorAll('[data-display-state-panel]')];

  function showState(state) {
    if (!panels.some((panel) => panel.dataset.displayStatePanel === state)) return;
    tabs.forEach((tab) => {
      const selected = tab.dataset.displayDemoState === state;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.displayStatePanel === state;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    clearFeedback();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      showState(tab.dataset.displayDemoState);
    });
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus();
    });
  });

  showState(params.get('displayState') || 'single');
})();
