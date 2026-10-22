/* Read-only source browser. It never reads application content or grants access. */
(() => {
  const sourceTabs = {all:'全部',conversation:'Agent 对话',file:'文件',screen:'屏幕',im:'即时通讯',agent:'第三方 Agent'};
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sentence = value => String(value || '').replace(/\s+/g,' ').trim().split(/(?<=[。！？!?])\s*/)[0].slice(0,180);
  const typeAliases = {conversation:'conversation',chat:'conversation',dialogue:'conversation',file:'file',files:'file',document:'file',screen:'screen',im:'im',message:'im',agent:'agent',third_party_agent:'agent'};
  // These labels already identify sample provenance in the existing memory fixture.
  const demoSourceTypes = {
    'Agent PC 二期需求说明（示例）':'file','用户手动保存（示例）':'conversation','已确认交互规则（示例）':'conversation',
    '项目进展模板.md（示例）':'file','产品报价资料（示例）':'file','售后操作手册（示例）':'file',
    '双屏交互说明（示例）':'file','新品介绍项目（示例）':'file'
  };
  function legacyType(memory) {
    if(typeAliases[memory.sourceType])return typeAliases[memory.sourceType];
    const source = String(memory.source || '').trim();
    if(demoSourceTypes[source])return demoSourceTypes[source];
    if(/\.(?:md|txt|pdf|docx?|xlsx?|csv|pptx?)$/i.test(source))return 'file';
    if(/^(?:Agent\s*对话|AI\s*对话|对话|会话)[：:\s·]/i.test(source))return 'conversation';
    if(/^(?:显示器|屏幕|窗口)\s*\d*[：:\s·]/.test(source))return 'screen';
    if(/^(?:飞书|钉钉|企业微信|微信)[：:\s·]/.test(source))return 'im';
    if(/^(?:WorkBuddy|Codex|TRAE(?: IDE)?(?: 国内版)?)[：:\s·]/i.test(source))return 'agent';
    return '';
  }
  function collectSources(memories) {
    const result = new Map();
    function add(raw, memory, fallbackType) {
      if(!raw || typeof raw !== 'object')return;
      const type = typeAliases[raw.type] || fallbackType;
      const title = String(raw.title || raw.name || '').trim();
      if(!Object.hasOwn(sourceTabs,type) || !title)return;
      const identity = String(raw.id || raw.path || title);
      const key = `${type}:${identity}`;
      let entry = result.get(key);
      if(!entry){entry={type,title,summary:sentence(raw.summary),memories:[]};result.set(key,entry);}
      if(memory.title && !entry.memories.includes(memory.title))entry.memories.push(memory.title);
    }
    for(const memory of Array.isArray(memories) ? memories : []){
      if(!memory || typeof memory !== 'object')continue;
      const references = Array.isArray(memory.sourceRefs) ? memory.sourceRefs : Array.isArray(memory.sources) ? memory.sources : [];
      references.forEach(ref=>add(ref,memory));
      const files = Array.isArray(memory.sourceFiles) ? memory.sourceFiles : [];
      files.forEach(file=>add(file,memory,'file'));
      const source = String(memory.source || '').trim();
      // An attached file provides a concrete source; its free-form note is not another file.
      if(!references.length && !files.length && source){
        const type = legacyType(memory);
        if(type)add({type,title:source,summary:memory.sourceSummary},memory);
      }
    }
    return [...result.values()].map(entry=>({type:entry.type,title:entry.title,summary:entry.summary || `关联记忆：${entry.memories.join('、')}。`}));
  }
  function listMarkup(records, type) {
    const rows = type==='all'?records:records.filter(record=>record.type===type);
    if(!rows.length)return `<p class="pms-empty" role="status">${type==='all'?'暂无来源':`暂无${escape(sourceTabs[type])}来源`}</p>`;
    return rows.map(record=>`<article class="pms-row"><h3 title="${escape(record.title)}">${escape(record.title)}</h3><p title="${escape(record.summary)}">${escape(record.summary)}</p></article>`).join('');
  }
  const dialog = document.createElement('dialog');
  dialog.id = 'pms-dialog';dialog.className = 'pms-dialog';
  dialog.setAttribute('aria-labelledby','pms-title');
  dialog.innerHTML = `<header class="pms-header"><h2 id="pms-title" tabindex="-1">记忆来源</h2><button type="button" class="pms-close" aria-label="关闭记忆来源">×</button></header><div class="pms-tabs" role="tablist" aria-label="记忆来源分类">${Object.entries(sourceTabs).map(([id,label])=>`<button type="button" id="pms-tab-${id}" role="tab" aria-selected="false" aria-controls="pms-list" tabindex="-1" data-pms-tab="${id}">${label}</button>`).join('')}</div><div id="pms-list" class="pms-list" role="tabpanel" tabindex="0"></div>`;
  document.body.append(dialog);
  let records = [], selected = 'all', previousFocus = null;
  const tabIds = Object.keys(sourceTabs);
  const list = dialog.querySelector('#pms-list');
  function render() {
    dialog.querySelectorAll('[data-pms-tab]').forEach(button=>{
      const active = button.dataset.pmsTab===selected;
      button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    list.setAttribute('aria-labelledby',`pms-tab-${selected}`);
    list.innerHTML = listMarkup(records,selected);list.scrollTop=0;
  }
  function selectTab(type, focus=false) {
    if(!Object.hasOwn(sourceTabs,type))return;
    selected=type;render();
    if(focus)dialog.querySelector(`[data-pms-tab="${type}"]`).focus();
  }
  window.addEventListener('agentpc:memory-source-list',event=>{
    if(document.querySelector('dialog[open]'))return;
    records = collectSources(event.detail?.items);
    previousFocus = event.detail?.trigger || document.activeElement;
    selected = 'all';
    render();dialog.showModal();dialog.querySelector('.pms-tabs').scrollLeft=0;dialog.querySelector('#pms-title').focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target.closest('.pms-close')){dialog.close();return;}
    const tab=event.target.closest('[data-pms-tab]');if(tab){selectTab(tab.dataset.pmsTab);return;}
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom)dialog.close();
  });
  dialog.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-pms-tab]');if(!tab)return;
    let index=tabIds.indexOf(tab.dataset.pmsTab);
    if(event.key==='ArrowRight')index=(index+1)%tabIds.length;
    else if(event.key==='ArrowLeft')index=(index+tabIds.length-1)%tabIds.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=tabIds.length-1;
    else return;
    event.preventDefault();selectTab(tabIds[index],true);
  });
  dialog.addEventListener('close',()=>{records=[];list.replaceChildren();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;});
})();
