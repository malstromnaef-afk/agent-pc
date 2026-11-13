(() => {
  const drawer = document.querySelector('#custom-mcp-drawer');
  const form = drawer.querySelector('form');
  const openButton = document.querySelector('[data-custom-mcp-open]');
  const { config, server, connectionName, address, auth, region } = form.elements;
  const applyButton = drawer.querySelector('[data-mcp-apply]');
  const visibility = drawer.querySelector('[data-mcp-visibility]');
  const feedback = drawer.querySelector('[role="alert"]');
  const hint = drawer.querySelector('[data-mcp-auth-hint]');
  const headers = drawer.querySelector('[data-mcp-headers]');
  const headerList = drawer.querySelector('[data-mcp-header-list]');
  const headerTemplate = drawer.querySelector('#custom-mcp-header-template');
  const addHeader = drawer.querySelector('[data-mcp-add-header]');
  let importedServers = [];

  function addHeaderRow() {
    const row = headerTemplate.content.firstElementChild.cloneNode(true);
    const value = row.querySelector('input[type="password"]');
    const reveal = row.querySelector('[data-header-visibility]');
    reveal.addEventListener('click', () => {
      const visible = value.type === 'password';
      value.type = visible ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(visible));
      reveal.setAttribute('aria-label', visible ? '隐藏请求头值' : '显示请求头值');
    });
    row.querySelector('[data-header-remove]').addEventListener('click', () => {
      row.remove();
      addHeader.focus();
    });
    headerList.append(row);
    return row.querySelector('input');
  }
  addHeader.addEventListener('click', () => addHeaderRow().focus());

  function report(message = '') {
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function syncAuthHint() {
    const browserAuth = auth.value === 'browser';
    hint.hidden = !browserAuth;
    hint.textContent = '支持通过浏览器授权的远程 HTTP MCP 服务。请填写 HTTPS 地址，勿包含密钥或令牌。';
    headers.hidden = browserAuth;
  }

  function importServer(entry) {
    const [name, details] = entry;
    connectionName.value = details.name || name;
    address.value = details.url || details.serverUrl || '';
  }

  openButton.addEventListener('click', () => {
    form.reset();
    report();
    importedServers = [];
    headerList.replaceChildren();
    addHeaderRow();
    server.closest('label').hidden = true;
    applyButton.disabled = true;
    address.type = 'password';
    visibility.setAttribute('aria-pressed', 'false');
    visibility.setAttribute('aria-label', '显示服务地址');
    syncAuthHint();
    drawer.showModal();
  });
  drawer.querySelectorAll('[data-mcp-close]').forEach(button => {
    button.addEventListener('click', () => drawer.close());
  });
  drawer.addEventListener('close', () => {
    form.reset();
    server.replaceChildren();
    headerList.replaceChildren();
    importedServers = [];
  });
  visibility.addEventListener('click', () => {
    const visible = address.type === 'password';
    address.type = visible ? 'text' : 'password';
    visibility.setAttribute('aria-pressed', String(visible));
    visibility.setAttribute('aria-label', visible ? '隐藏服务地址' : '显示服务地址');
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'auth') syncAuthHint();
    if (event.target === server && importedServers[server.value]) importServer(importedServers[server.value]);
  });
  config.addEventListener('input', () => {
    report();
    applyButton.disabled = !config.value.trim();
    server.closest('label').hidden = true;
  });
  applyButton.addEventListener('click', () => {
    report();
    try {
      const data = JSON.parse(config.value);
      const entries = data?.mcpServers ? Object.entries(data.mcpServers) : [[data?.name || '', data]];
      importedServers = entries.filter(([, entry]) => typeof (entry?.url || entry?.serverUrl) === 'string');
      if (!importedServers.length) throw new Error();
      server.replaceChildren(...importedServers.map(([name], index) => new Option(name, index)));
      server.closest('label').hidden = importedServers.length < 2;
      importServer(importedServers[0]);
    } catch {
      report('请输入包含远程服务地址的有效 JSON。');
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    report();
    const name = connectionName.value.trim();
    if (!name) { report('请输入连接名称。'); connectionName.focus(); return; }
    try {
      const url = new URL(address.value.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      report('请输入有效的 HTTPS 服务地址。');
      address.focus();
      return;
    }

    const row = document.createElement('div');
    row.className = 'replica-row replica-app';
    row.dataset.appRegion = region.value;
    row.dataset.appSearch = name.toLowerCase();
    const copy = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = name;
    const status = document.createElement('p');
    status.textContent = '自定义 MCP · 待授权';
    copy.append(title, status);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'replica-remove-connection';
    remove.textContent = '移除连接';
    remove.addEventListener('click', () => confirmConnectionRemoval(name, () => { row.remove(); replicaFilterApps(); openButton.focus(); }));
    row.append(copy, remove);
    document.querySelector('#replica-app-empty').before(row);
    replicaFilterApps();
    drawer.close();
    showLightToast('已添加原型配置，待授权。');
  });
})();
