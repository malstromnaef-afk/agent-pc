(() => {
  const panel = document.querySelector('#replica-skills');
  const picker = panel.querySelector('[data-skills-picker]');
  const search = panel.querySelector('input[type="search"]');
  const list = panel.querySelector('.replica-skill-list');
  const empty = panel.querySelector('.replica-empty');
  const confirmDialog = document.createElement('dialog');
  confirmDialog.className = 'skill-uninstall-dialog';
  confirmDialog.setAttribute('aria-labelledby', 'skill-uninstall-title');
  confirmDialog.setAttribute('aria-describedby', 'skill-uninstall-copy');
  confirmDialog.innerHTML = '<form method="dialog"><h3 id="skill-uninstall-title">确认卸载技能？</h3>' +
    '<p id="skill-uninstall-copy"></p><footer><button class="soft-button" value="cancel" autofocus>取消</button>' +
    '<button class="danger-button" value="uninstall">确定</button></footer></form>';
  document.body.append(confirmDialog);
  let pendingUninstall = null;
  confirmDialog.addEventListener('close', () => {
    if (confirmDialog.returnValue === 'uninstall') pendingUninstall?.();
    pendingUninstall = null;
  });
  const storageKey = 'phase2-small-skills-list-v1';
  const removedDemoPath = 'demo/pdf-cleanup';
  const examples = [
    { path: 'demo/design', name: '前端界面设计', description: '设计网页和应用界面，细化组件布局、视觉样式和交互。' },
    { path: 'demo/review', name: '网页设计检查', description: '检查网页布局、交互和可访问性。' },
    { path: 'demo/find', name: '查找技能', description: '根据任务查找合适的技能。' },
  ];
  let skills = examples;
  let scan = 0;
  let enabledByPath = new Map([['demo/review', false]]);
  try {
    const saved = JSON.parse(phase2Storage.getItem(storageKey) || 'null');
    if (Array.isArray(saved?.skills) && Array.isArray(saved?.enabled)) {
      enabledByPath = new Map(saved.enabled);
      skills = saved.skills.filter(skill => skill.path !== removedDemoPath);
      enabledByPath.delete(removedDemoPath);
      if (skills.length !== saved.skills.length) save();
    }
  } catch {}

  function save() {
    try {
      phase2Storage.setItem(storageKey, JSON.stringify({ skills, enabled: [...enabledByPath] }));
    } catch {
      showLightToast('Skills 列表保存失败。');
    }
  }

  function renderCard(skill) {
    const item = document.createElement('li');
    item.className = 'replica-skill-card';
    item.innerHTML = '<header><h4></h4><button type="button" class="skill-installed">安装</button></header>' +
      '<p class="skill-description"></p>' +
      '<footer><label><input type="checkbox" role="switch"><span></span></label>' +
      '<button type="button" class="replica-remove-connection">卸载</button></footer>';
    item.querySelector('h4').textContent = skill.name;
    const description = item.querySelector('.skill-description');
    description.textContent = skill.description;
    description.hidden = !skill.description;
    const toggle = item.querySelector('input');
    const status = item.querySelector('label span');
    const badge = item.querySelector('.skill-installed');
    const footer = item.querySelector('footer');
    const uninstall = footer.querySelector('button');
    toggle.setAttribute('aria-label', '启用 ' + skill.name);
    toggle.checked = enabledByPath.get(skill.path) ?? true;
    function renderState() {
      const installed = skill.installed !== false;
      item.toggleAttribute('data-skill-disabled', installed && !toggle.checked);
      footer.hidden = !installed;
      badge.hidden = installed;
      status.textContent = toggle.checked ? '已启用' : '已停用';
    }
    renderState();
    toggle.addEventListener('change', () => {
      enabledByPath.set(skill.path, toggle.checked);
      save();
      renderState();
    });
    function setInstalled(installed) {
      skill.installed = installed;
      enabledByPath.delete(skill.path);
      toggle.checked = installed;
      save();
      renderState();
      (installed ? toggle : badge).focus();
    }
    badge.addEventListener('click', () => setInstalled(true));
    uninstall.addEventListener('click', () => {
      confirmDialog.querySelector('#skill-uninstall-copy').textContent = `是否卸载「${skill.name}」？`;
      pendingUninstall = () => setInstalled(false);
      confirmDialog.returnValue = 'cancel';
      confirmDialog.showModal();
    });
    return item;
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const matches = (skills || []).filter(skill => skill.name.toLowerCase().includes(query));
    list.replaceChildren(...matches.map(renderCard));
    list.hidden = matches.length === 0;
    empty.hidden = !list.hidden;
    empty.textContent = skills === null ? '暂无 Skills。打开 Skills 文件夹后即可查看。'
      : skills.length === 0 ? '列表中没有 Skills。'
      : '没有找到匹配的 Skills。';
  }

  function chooseFolder() {
    picker.value = '';
    picker.click();
  }

  async function readSkill(file) {
    const path = file.webkitRelativePath || file.name;
    const fallback = path.split('/').at(-2) || file.name;
    const source = await file.slice(0, 16384).text().catch(() => '');
    const frontMatter = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
    function readField(field) {
      return frontMatter.match(new RegExp('^' + field + ':[ \\t]*([^\\r\\n]*)', 'm'))?.[1]
        .trim().replace(/^(["'])(.*)\1$/, '$2').replace(/^[>|][-+]?$/, '') || '';
    }
    return { path, name: readField('name') || fallback, description: readField('description') };
  }

  panel.querySelector('[data-skills-folder]').addEventListener('click', chooseFolder);
  panel.querySelector('[data-skills-refresh]').addEventListener('click', chooseFolder);
  search.addEventListener('input', render);
  picker.addEventListener('change', async () => {
    const current = ++scan;
    const found = await Promise.all(Array.from(picker.files).filter(file => file.name === 'SKILL.md').map(readSkill));
    if (current !== scan) return;
    const previous = new Map(skills.map(skill => [skill.path, skill]));
    skills = found.map(skill => ({ ...skill, installed: previous.get(skill.path)?.installed ?? true }))
      .sort((a, b) => a.name.localeCompare(b.name));
    save();
    render();
  });
  render();
})();

if (new URLSearchParams(location.search).get('settingsTab') === 'skills') {
  window.addEventListener('load', () => {
    setConfigSubpage('apps-skills');
    document.querySelector('[data-replica-tab="skills"]').click();
  }, { once: true });
}
