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
  const submitButton = form.querySelector('[type="submit"]');
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
    submitButton.textContent = browserAuth ? '添加并授权' : '保存并连接';
  }

  function importServer(entry) {
    const [name, details] = entry;
    connectionName.value = name;
    address.value = details.url;
    auth.value = details.auth;
    headerList.replaceChildren();
    for (const [key, value] of Object.entries(details.headers)) {
      const input = addHeaderRow();
      input.value = key;
      input.closest('.custom-mcp-header-row').querySelector('[type="password"]').value = value;
    }
    syncAuthHint();
  }

  function resetForm() {
    form.reset();
    report();
    importedServers = [];
    server.replaceChildren();
    headerList.replaceChildren();
    server.closest('label').hidden = true;
    applyButton.disabled = !config.value.trim();
    address.type = 'password';
    visibility.setAttribute('aria-pressed', 'false');
    visibility.setAttribute('aria-label', '显示服务地址');
    syncAuthHint();
  }

  openButton.addEventListener('click', () => {
    resetForm();
    addHeaderRow();
    drawer.showModal();
  });
  drawer.querySelectorAll('[data-mcp-close]').forEach(button => {
    button.addEventListener('click', () => drawer.close());
  });
  drawer.addEventListener('close', () => {
    if (!drawer.open) resetForm();
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
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      const singleName = typeof data.name === 'string' ? data.name : connectionName.value;
      const servers = data.mcpServers ?? data.servers ?? { [singleName || 'MCP']: data };
      if (!servers || typeof servers !== 'object' || Array.isArray(servers)) throw new Error();
      const entries = Object.entries(servers);
      if (!entries.length || entries.length > 30) throw new Error();
      importedServers = entries.map(([name, entry]) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error();
        if (entry.command || entry.args || entry.env || ['sse', 'stdio'].includes(entry.type)) throw new Error();
        const url = entry.url || entry.httpUrl || entry.serverUrl;
        const requestHeaders = entry.headers ?? {};
        if (typeof url !== 'string' || typeof requestHeaders !== 'object' || Array.isArray(requestHeaders)) throw new Error();
        if (Object.values(requestHeaders).some(value => typeof value !== 'string')) throw new Error();
        const auth = Object.keys(requestHeaders).length || new URL(url).search ? 'address' : 'browser';
        return [name, { url, headers: requestHeaders, auth }];
      });
      server.replaceChildren(...importedServers.map(([name], index) => new Option(name, index)));
      server.closest('label').hidden = importedServers.length < 2;
      importServer(importedServers[0]);
      config.value = '';
      applyButton.disabled = true;
    } catch {
      importedServers = [];
      server.closest('label').hidden = true;
      report('请输入包含远程服务地址的有效 JSON。');
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    report();
    const name = connectionName.value.trim();
    if (!name) { report('请输入连接名称。'); connectionName.focus(); return; }
    let url;
    try {
      url = new URL(address.value.trim());
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || (auth.value === 'browser' && url.search)) throw new Error();
    } catch {
      report('请输入有效的 HTTPS 服务地址。');
      address.focus();
      return;
    }

    const account = addSavedMcpAccount('custom', 'before', true, feishuSection, {
      name,
      endpoint: url.origin + url.pathname,
      region: region.value,
      auth: auth.value,
      todoistSample: url.href === 'https://todoist.example.com/mcp',
    });
    drawer.close();
    account.start();
  });
})();
