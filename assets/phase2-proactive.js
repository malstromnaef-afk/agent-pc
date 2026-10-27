/* Figma-matched UI prototype. Records and connector status are design fixtures;
 * this module never reads chats, executes tasks, or synchronizes cookies. */
(() => {
  const APPS = ['微信', '飞书', '钉钉', '企业微信'];
  const MODES = ['小卡片', '输入框预览'];
  const PLACEMENTS = ['跟随窗口', '屏幕右下', '鼠标附近', '右上角'];
  const defaults = {enabled:true, replyEnabled:false, taskEnabled:true, apps:[], aliases:[], mode:'小卡片', placement:'跟随窗口'};
  function clearReplyRecords(rows) {
    return rows.filter(row => !['已搁置', '已完成'].includes(row.status));
  }
  function addAlias(values, input) {
    const value = String(input || '').trim();
    return value && !values.includes(value) ? [...values, value] : [...values];
  }
  function restoreSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    const result = {...defaults, apps:[], aliases:[]};
    for (const key of ['enabled', 'replyEnabled', 'taskEnabled']) {
      if (typeof input[key] === 'boolean') result[key] = input[key];
    }
    result.apps = [...new Set((Array.isArray(input.apps) ? input.apps : []).filter(x => APPS.includes(x)))];
    result.aliases = (Array.isArray(input.aliases) ? input.aliases : []).reduce((all, x) => typeof x === 'string' ? addAlias(all, x) : all, []);
    if (MODES.includes(input.mode)) result.mode = input.mode;
    if (PLACEMENTS.includes(input.placement)) result.placement = input.placement;
    return result;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {clearReplyRecords, addAlias, restoreSettings};
  if (typeof document === 'undefined') return;
  const root = document.getElementById('p2-settings-proactive');
  if (!root) return;
  const key = 'agentpc-proactive-design-settings-v1';
  const storage = typeof phase2Storage !== 'undefined' ? phase2Storage : window.localStorage;
  let state = restoreSettings(null);
  try { state = restoreSettings(JSON.parse(storage.getItem(key) || 'null')); } catch (_) {}
  let view = 'settings';
  let expandedReply = null;
  let expandedTask = null;
  let feedbackTimer;
  const replyFixtures = [
    {id:'reply-a',who:'同事 A',ask:'明天下午开会前，把项目最新进展发给我。',kind:'回话',status:'待处理',time:'2026/10/27 16:20',detail:'回复状态：正在准备…'},
    {id:'reply-b',who:'同事 B',ask:'最新报价什么时候能发我？',kind:'回话',status:'草稿已备好',time:'2026/10/27 16:00',detail:'回复草稿：我正在核对最新报价，整理好后发给你。'},
    {id:'reply-c',who:'同事 C',ask:'方便时帮我整理一版旧项目的进度说明。',kind:'做东西',status:'已搁置',time:'2026/10/26 15:30',detail:'状态：已搁置'},
    {id:'reply-d',who:'同事 D',ask:'请把今天的会议纪要发给我。',kind:'发文件',status:'已完成',time:'2026/10/27 14:20',detail:'状态：已完成'}
  ];
  let replies = [...replyFixtures];
  const tasks = [
    {id:'task-1',text:'整理旅行攻略，生成三天行程',kind:'整理',feedback:'已采纳',confidence:'0.91',time:'2026/10/27 16:10',details:[
      '看到什么：你正在查看几篇旅行攻略。',
      '建议内容：要帮你把这些攻略整理成三天行程吗？',
      '建议原因：把分散的信息整理在一起，方便比较路线和安排时间。',
      '具体执行内容：根据当前攻略整理三天行程，列出景点、交通及时间安排；缺少的信息标注待确认。',
      '触发时机：screen_context · 当时在做：浏览旅行攻略 · 主题：旅行规划'
    ]},
    {id:'task-2',text:'提取项目文档中的关键事项',kind:'提取',feedback:'已忽略',confidence:'0.84',time:'2026/10/27 15:20',details:[
      '看到什么：你正在阅读一份较长的项目文档。',
      '建议内容：要帮你提取文档中的关键事项吗？',
      '建议原因：提取负责人和时间节点，便于后续核对。',
      '具体执行内容：整理文档中的事项、负责人和截止时间。',
      '触发时机：screen_context · 当时在做：阅读项目文档 · 主题：项目文档'
    ]},
    {id:'task-3',text:'汇总今天的会议要点',kind:'总结',feedback:'未反应',confidence:'0.88',time:'2026/10/27 14:30',details:[
      '看到什么：你刚查看了会议记录。',
      '建议内容：要帮你汇总今天的会议要点吗？',
      '建议原因：将讨论结论整理为要点，便于回顾。',
      '具体执行内容：将会议记录整理为要点和待办。',
      '触发时机：screen_context · 当时在做：查看会议记录 · 主题：会议整理'
    ]}
  ];
  const q = s => root.querySelector(s);
  const qa = s => [...root.querySelectorAll(s)];
  const preview = q('#pa-mode-preview');
  const previewImage = q('#pa-mode-preview-image');
  const previewImages = {
    card: {src:'assets/proactive-figma/reply-card-preview.png', width:1112, height:536, displayWidth:560, alt:'回复小卡片效果预览'},
    input: {src:'assets/proactive-figma/reply-input-preview.png', width:1734, height:512, displayWidth:760, alt:'输入框预览效果'},
    follow: {src:'assets/proactive-figma/placement-follow-preview.png', width:988, height:578, displayWidth:720, alt:'跟随窗口位置效果预览'},
    bottom: {src:'assets/proactive-figma/placement-bottom-preview.png', width:992, height:580, displayWidth:720, alt:'屏幕右下位置效果预览'},
    cursor: {src:'assets/proactive-figma/placement-cursor-preview.png', width:990, height:576, displayWidth:720, alt:'鼠标附近位置效果预览'},
    top: {src:'assets/proactive-figma/placement-top-preview.png', width:988, height:584, displayWidth:720, alt:'右上角位置效果预览'}
  };
  let previewTrigger = null;
  let previewCloseTimer;
  function hideModePreview() {
    clearTimeout(previewCloseTimer);
    preview.hidden = true;
    previewTrigger = null;
  }
  function deferHideModePreview() {
    clearTimeout(previewCloseTimer);
    previewCloseTimer = setTimeout(hideModePreview, 120);
  }
  function showModePreview(trigger) {
    if (trigger.hidden || trigger.disabled || view !== 'settings') return;
    clearTimeout(previewCloseTimer);
    const image = previewImages[trigger.dataset.paPreview];
    previewTrigger = trigger;
    if (previewImage.getAttribute('src') !== image.src) previewImage.src = image.src;
    previewImage.width = image.width;
    previewImage.height = image.height;
    previewImage.alt = image.alt;
    preview.style.width = Math.min(image.displayWidth, window.innerWidth - 32) + 'px';
    preview.hidden = false;
    positionModePreview();
  }
  function positionModePreview() {
    if (!previewTrigger || preview.hidden) return;
    const anchor = previewTrigger.getBoundingClientRect();
    const box = preview.getBoundingClientRect();
    const left = Math.max(16, Math.min(anchor.right - box.width, window.innerWidth - box.width - 16));
    let top = anchor.top - box.height - 12;
    if (top < 16) top = anchor.bottom + 12;
    top = Math.max(16, Math.min(top, window.innerHeight - box.height - 16));
    preview.style.left = Math.round(left) + 'px';
    preview.style.top = Math.round(top) + 'px';
  }
  previewImage.addEventListener('load', positionModePreview);
  qa('[data-pa-preview]').forEach(trigger => {
    trigger.addEventListener('pointerenter', () => showModePreview(trigger));
    trigger.addEventListener('pointerleave', deferHideModePreview);
    trigger.addEventListener('focus', () => showModePreview(trigger));
    trigger.addEventListener('blur', deferHideModePreview);
    trigger.addEventListener('click', () => showModePreview(trigger));
  });
  preview.addEventListener('pointerenter', () => clearTimeout(previewCloseTimer));
  preview.addEventListener('pointerleave', deferHideModePreview);
  window.addEventListener('resize', hideModePreview);
  window.addEventListener('scroll', event => {
    if (!preview.contains(event.target)) hideModePreview();
  }, true);
  window.addEventListener('agentpc:settings-subpage', hideModePreview);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && previewTrigger) hideModePreview();
  });
  function feedback(value) {
    const el = q('#pa-feedback');
    el.textContent = value; el.hidden = false;
    clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { el.hidden = true; }, 2500);
  }
  function save(next) {
    const clean = restoreSettings(next);
    try {
      storage.setItem(key, JSON.stringify(clean));
      state = clean;
      renderSettings();
      window.dispatchEvent(new CustomEvent('agentpc:proactive-settings', {detail:{...state, apps:[...state.apps], aliases:[...state.aliases]}}));
      return true;
    } catch (_) {
      renderSettings();
      feedback('无法保存设置，请重试。');
      return false;
    }
  }
  function renderSettings() {
    hideModePreview();
    qa('[data-pa-toggle]').forEach(el => {
      el.setAttribute('aria-checked', String(state[el.dataset.paToggle]));
      el.disabled = el.dataset.paToggle !== 'enabled' && !state.enabled;
    });
    qa('[data-pa-app]').forEach(el => { el.checked = state.apps.includes(el.value); el.disabled = !state.enabled; });
    q('#pa-app-count').textContent = state.apps.length ? `已选 ${state.apps.length} 个` : '未选择应用';
    qa('[data-pa-mode]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.paMode === state.mode)); el.disabled = !state.enabled; });
    qa('[data-pa-mode-option]').forEach(option => {
      const help = option.querySelector('[data-pa-preview]');
      help.hidden = false;
      help.disabled = !state.enabled;
    });
    qa('[data-pa-placement]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.paPlacement === state.placement)); el.disabled = !state.enabled; });
    qa('[data-pa-placement-option]').forEach(option => {
      const help = option.querySelector('[data-pa-preview]');
      help.hidden = false;
      help.disabled = !state.enabled;
    });
    q('#pa-alias-input').disabled = !state.enabled;
    const tags = q('#pa-alias-tags'); tags.replaceChildren(); tags.hidden = !state.aliases.length;
    state.aliases.forEach(alias => {
      const span = document.createElement('span'); span.className = 'pa-alias-tag';
      span.append(document.createTextNode(alias));
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
      remove.dataset.paRemoveAlias = alias; remove.setAttribute('aria-label', `移除昵称 ${alias}`); remove.disabled = !state.enabled;
      span.append(remove); tags.append(span);
    });
  }
  function cell(value, role='cell') {
    const el = document.createElement('div'); el.setAttribute('role', role); el.textContent = value; return el;
  }
  function renderRecords() {
    const isReply = view === 'reply';
    const title = isReply ? '回复建议列表' : '任务建议列表';
    q('#pa-list-title').textContent = title;
    q('#pa-records').setAttribute('aria-label', title);
    q('#pa-records').dataset.prototypeData = 'figma-example';
    q('#pa-clear').hidden = !isReply;
    q('#pa-clear').disabled = !replies.length;
    q('#pa-clear').title = replies.length ? '清理已搁置和已完成的示例事项' : '没有可清理的记录';
    const table = q('#pa-table'); table.replaceChildren(); table.setAttribute('aria-label', title);
    table.title = 'Figma 设计示例数据，未接入真实聊天或任务';
    const grid = isReply ? 'pa-reply-grid' : 'pa-task-grid';
    const head = document.createElement('div'); head.className = 'pa-table-head ' + grid; head.setAttribute('role','row');
    const headings = isReply ? ['对方','事项内容','类型','状态','时间','操作'] : ['建议内容','类型','反馈','把握度','时间','操作'];
    headings.forEach(x => head.append(cell(x, 'columnheader'))); table.append(head);
    const rows = isReply ? replies : tasks;
    rows.forEach(row => {
      const expanded = (isReply ? expandedReply : expandedTask) === row.id;
      const group = document.createElement('div'); group.className = 'pa-data-row'; group.setAttribute('role','rowgroup');
      const line = document.createElement('div'); line.className = 'pa-data-line ' + grid; line.setAttribute('role','row');
      const values = isReply ? [row.who,row.ask,row.kind,row.status,row.time] : [row.text,row.kind,row.feedback,row.confidence,row.time];
      values.forEach((value, index) => {
        const el = cell(value);
        if (index === 4) { const time = document.createElement('time'); time.textContent = value; el.replaceChildren(time); }
        line.append(el);
      });
      const actions = cell(''); const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'pa-row-action'; btn.dataset.paRecord = row.id;
      btn.textContent = expanded ? '收起' : '查看'; btn.setAttribute('aria-expanded', String(expanded)); btn.setAttribute('aria-controls', 'pa-detail-' + row.id);
      actions.append(btn); line.append(actions); group.append(line);
      const detail = document.createElement('div'); detail.className = 'pa-row-details'; detail.id = 'pa-detail-' + row.id; detail.hidden = !expanded;
      const detailText = isReply ? ['消息事项：' + row.ask,row.detail,'使用已准备的回复，请回到对应聊天按 Tab 填入，由你发送。'] : row.details;
      detailText.forEach(value => { const p = document.createElement('p'); p.textContent = value; detail.append(p); });
      group.append(detail); table.append(group);
    });
  }
  function selectView(next, focus=false) {
    if (!['settings','reply','task'].includes(next)) return;
    hideModePreview();
    view = next;
    qa('[data-pa-view]').forEach(el => { const active = el.dataset.paView === view; el.setAttribute('aria-selected', String(active)); el.tabIndex = active ? 0 : -1; });
    q('#pa-settings').hidden = view !== 'settings';
    q('#pa-records').hidden = view === 'settings';
    q('#pa-help').textContent = view === 'settings' ? 'ⓘ 使用帮助' : view === 'reply' ? 'ⓘ 它是怎么工作的？    ' : 'ⓘ 它是怎么工作的';
    if (view !== 'settings') renderRecords();
    if (focus) q(`[data-pa-view="${view}"]`).focus();
  }
  root.addEventListener('click', event => {
    const target = event.target;
    const tab = target.closest('[data-pa-view]'); if (tab) { selectView(tab.dataset.paView); return; }
    const toggle = target.closest('[data-pa-toggle]'); if (toggle && !toggle.disabled) { save({...state,[toggle.dataset.paToggle]:!state[toggle.dataset.paToggle]}); return; }
    const mode = target.closest('[data-pa-mode]'); if (mode && !mode.disabled) { save({...state, mode:mode.dataset.paMode}); return; }
    const placement = target.closest('[data-pa-placement]'); if (placement && !placement.disabled) { save({...state, placement:placement.dataset.paPlacement}); return; }
    const remove = target.closest('[data-pa-remove-alias]'); if (remove && !remove.disabled) { save({...state, aliases:state.aliases.filter(x => x !== remove.dataset.paRemoveAlias)}); q('#pa-alias-input').focus(); return; }
    const record = target.closest('[data-pa-record]'); if (record) {
      const id = record.dataset.paRecord;
      if (view === 'reply') expandedReply = expandedReply === id ? null : id;
      else expandedTask = expandedTask === id ? null : id;
      renderRecords(); q(`[data-pa-record="${id}"]`).focus(); return;
    }
    if (target.closest('#pa-clear')) { replies = clearReplyRecords(replies); expandedReply = null; renderRecords(); return; }
    if (target.closest('#pa-refresh')) { renderRecords(); return; }
    if (target.closest('#pa-help')) { const dialog = q('#pa-help-dialog'); if (!dialog.open) dialog.showModal(); return; }
    if (target.closest('[data-pa-help-close]')) q('#pa-help-dialog').close();
  });
  root.addEventListener('change', event => {
    if (!event.target.matches('[data-pa-app]')) return;
    save({...state, apps:qa('[data-pa-app]').filter(el => el.checked).map(el => el.value)});
  });
  root.addEventListener('keydown', event => {
    if (event.target.id === 'pa-alias-input' && event.key === 'Enter' && !event.isComposing) {
      event.preventDefault(); if (save({...state,aliases:addAlias(state.aliases,event.target.value)})) event.target.value = ''; return;
    }
    const tab = event.target.closest('[data-pa-view]');
    if (tab && ['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) {
      event.preventDefault(); const tabs = ['settings','reply','task'];
      const i = tabs.indexOf(view), index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      selectView(tabs[index], true);
    }
  });
  const browserRefresh = document.getElementById('bc-refresh');
  browserRefresh.addEventListener('click', () => {
    if (browserRefresh.disabled) return;
    browserRefresh.disabled = true; browserRefresh.setAttribute('aria-busy','true');
    setTimeout(() => { browserRefresh.disabled = false; browserRefresh.removeAttribute('aria-busy'); }, 450);
  });
  browserRefresh.title = '原型连接状态，仅刷新界面，不执行 Cookie 同步';
  q('#pa-refresh').title = '刷新当前示例列表，不执行真实任务';
  const configTabs = [...document.querySelectorAll('[data-phase2-setting-tab]')];
  configTabs.forEach(tab => tab.addEventListener('keydown', event => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault(); const i = configTabs.indexOf(tab);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? configTabs.length-1 : (i + (event.key === 'ArrowRight' ? 1 : configTabs.length-1)) % configTabs.length;
    if (typeof setConfigSubpage === 'function') setConfigSubpage(configTabs[index].dataset.phase2SettingTab);
    configTabs[index].focus();
  }));
  renderSettings(); selectView('settings');
  function initialRoute() {
    const params = new URLSearchParams(location.search);
    if (['proactive','browser'].includes(params.get('settingsTab')) && typeof setConfigSubpage === 'function') setConfigSubpage(params.get('settingsTab'));
    if (['settings','reply','task'].includes(params.get('proactiveView'))) selectView(params.get('proactiveView'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialRoute, {once:true});
  else initialRoute();
})();
