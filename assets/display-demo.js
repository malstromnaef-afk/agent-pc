(() => {
  const params = new URLSearchParams(window.location.search);
  const hint = document.querySelector('[data-app-display-hint]');
  const displayBridge = window.agentX3Display;

  function updateHint(externalCount) {
    if (hint) hint.hidden = !(externalCount >= 2) || params.get('surface') === 'small-screen';
  }

  // Explicit preview input only; actual hardware status comes from the native bridge.
  const previewCount = params.get('externalDisplays');
  updateHint(!displayBridge && /^\d+$/.test(previewCount || '') ? Number(previewCount) : 0);

  function receiveDisplayStatus(status) {
    if (!Array.isArray(status?.displays)) return;
    const builtInId = status.selectedDisplay?.id;
    const hasBuiltIn = builtInId != null && status.displays.some((display) => String(display.id) === String(builtInId));
    updateHint(hasBuiltIn ? status.displays.filter((display) => String(display.id) !== String(builtInId)).length : 0);
  }
  if (displayBridge) {
    displayBridge.onStatusChanged?.(receiveDisplayStatus);
    const refresh = async () => {
      try { receiveDisplayStatus(await displayBridge.getStatus?.()); } catch (_) { /* Keep the last known display state. */ }
    };
    refresh();
    window.addEventListener('focus', refresh);
  }

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
