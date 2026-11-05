/* Interactive demo only. No model, real screen collection, or real knowledge index. */
(() => {
  const root = document.querySelector('#memory');
  if (!root) return;
  const $m = (selector) => root.querySelector('.pm-preview[data-subscreen-preview="memory"]')?.querySelector(selector) || root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = {project:'项目',preference:'偏好',decision:'工作要求',document:'资料'};
  const categoryLimit=40;
  const customCategoryPrefix='custom:';
  const cleanCategory=label=>label.trim().replace(/\s+/g,' ');
  const categoryLabel=key=>Object.hasOwn(categories,key)?categories[key]:key.slice(customCategoryPrefix.length);
  const isCategory=key=>{
    if(typeof key!=='string')return false;
    if(!key||Object.hasOwn(categories,key))return true;
    const label=categoryLabel(key);
    return key.startsWith(customCategoryPrefix)&&label.length>0&&label.length<=categoryLimit&&label===cleanCategory(label);
  };
  const colors = {project:'#56bbae',preference:'#b396dc',decision:'#cfab76',document:'#6daae0'};
  const initial = [
    {id:'m1',title:'Agent PC 二期项目背景',content:'沿用小款软件框架，新增图片与附件提问、Skill、工具调用及长期记忆。理解与生成使用已配置的云端模型。',category:'project',source:'Agent PC 二期需求说明（示例）',related:['Agent PC','微信','飞书','钉钉'],updated:'2026-10-09'},
    {id:'m2',title:'办公回复的表达习惯',content:'先给结论，再补充必要说明。回复简短、具体，重要信息突出展示，避免反复解释已有背景。',category:'preference',source:'用户手动保存（示例）',related:['用户偏好','微信'],updated:'2026-10-09'},
    {id:'m3',title:'聊天回复的采纳规则',content:'用户主动交办任务后生成回复草稿，检查、修改后自行使用，系统不自动发送。',category:'decision',source:'已确认交互规则（示例）',related:['Agent PC','微信','飞书'],updated:'2026-10-08'},
    {id:'m4',title:'项目进展汇报模板',content:'进度汇报按“已完成、进行中、待处理”整理。保留已经确认的事项，并在引用历史决定时展示资料来源。',category:'document',source:'项目进展模板.md（示例）',related:['项目管理','飞书'],updated:'2026-10-08'},
    {id:'m5',title:'报价资料与文件位置',content:'准备报价时，参考产品资料、价格表与报价模板。价格和数量需核对；生成文件后先预览再使用。',category:'document',source:'产品报价资料（示例）',related:['产品资料','微信'],updated:'2026-10-07'},
    {id:'m6',title:'售后问题处理经验',content:'相似问题优先查询操作手册与历史处理记录。没有匹配依据时说明缺少资料，避免编造处理方案。',category:'document',source:'售后操作手册（示例）',related:['操作手册','钉钉'],updated:'2026-10-07'},
    {id:'m7',title:'主屏与小屏的交互约定',content:'双屏连接时，全局语音交互显示在自带小屏，不打断主屏工作。完整资料、图谱和内容编辑在主屏管理。',category:'decision',source:'双屏交互说明（示例）',related:['Agent PC','用户偏好'],updated:'2026-10-06'},
    {id:'m8',title:'新品介绍整理项目',content:'根据客户关注点整理产品介绍，沿用本地产品资料和历史表达要求，减少反复交代背景。',category:'project',source:'新品介绍项目（示例）',related:['产品资料','项目管理'],updated:'2026-10-06'}
  ];
  const sampleFiles = {
    m1:{id:'sample-phase2-brief',name:'二期需求说明.md',body:`
      <h2>Agent PC 二期需求说明</h2>
      <p>这是一份示例文档，用于预览记忆关联的原文。</p>
      <h3>项目背景</h3>
      <p>沿用小款软件框架，让用户在日常工作中快速提问、整理资料和查阅历史记忆。</p>
      <h3>本期范围</h3>
      <ul><li>支持图片和附件提问。</li><li>通过 Skill 和工具完成常见工作任务。</li><li>在长期记忆中查看记忆、关系图谱和关联资料。</li></ul>
      <h3>模型配置</h3>
      <p>理解和生成使用已配置的云端模型。</p>`},
    m4:{id:'sample-weekly-report',name:'项目周报.md',body:`
      <h2>项目进展汇报模板</h2>
      <p>这是一份示例文档，用于预览记忆关联的原文。</p>
      <h3>已完成</h3><p>记录本周已交付事项及对应验收结果。</p>
      <h3>进行中</h3><p>列出当前进度、负责人和预计完成时间。</p>
      <h3>待处理</h3><ul><li>标记依赖和需要决策的问题。</li><li>引用历史决定时附上资料来源。</li></ul>`},
    m6:{id:'sample-operation-guide',name:'操作手册.md',body:`
      <h2>售后操作手册</h2>
      <p>这是一份示例文档，对应图谱中的「操作手册」节点。</p>
      <h3>记录问题</h3><p>记录设备型号、软件版本、问题发生时间和复现步骤。</p>
      <h3>查找处理办法</h3><ol><li>按问题现象查询操作手册。</li><li>核对历史处理记录与当前设备和版本是否一致。</li><li>确认适用后再提供操作步骤。</li></ol>
      <h3>反馈处理结果</h3><p>记录执行结果。资料不足时，列出需要用户补充的信息。</p>`}
  };
  const state = {items:initial,selected:'m1',entity:null,search:'',zoom:1,preview:true,libraryCollapsed:false,reader:null};
  const withoutLegacyCore = ({core,...memory}) => memory;
  let storageWarning = false;
  try {
    const saved = JSON.parse(phase2Storage.getItem('memory-demo-v1') || 'null');
    if (saved && Array.isArray(saved.items) && saved.items.every(m => typeof m.id==='string' && typeof m.title==='string' && typeof m.content==='string' && isCategory(m.category) && Array.isArray(m.related))) {
      state.items=saved.items.map(withoutLegacyCore);state.selected=saved.selected;state.preview=saved.preview!==false;
    }
  } catch (_) { storageWarning=true; }
  const openDirectories = new Set([state.items[0]?.category??'']);
  const categoryOptions=()=>[...new Set(state.items.map(item=>item.category).filter(Boolean))];
  const existingCategory=label=>categoryOptions().find(key=>categoryLabel(key).toLowerCase()===label.toLowerCase());
  const uncategorizedLabel='其他';
  const folderPlaceholder='选择文件夹或输入新名称';
  const canManageCategory=key=>key?.startsWith(customCategoryPrefix);
  function categoryFromInput(value) {
    const label=cleanCategory(value);
    if(label===uncategorizedLabel)return '';
    return label?(existingCategory(label)||customCategoryPrefix+label):'';
  }
  for(const item of state.items){
    if(item.id==="m1"&&item.source===initial.find(m=>m.id==="m1").source&&item.content==="沿用一期软件框架，整合屏幕理解、本地知识与长期记忆、任务执行。文本、全局语音和屏幕感知共同作为任务入口。")item.content="沿用小款软件框架，新增图片与附件提问、Skill、工具调用及长期记忆。理解与生成使用已配置的云端模型。";
    if(item.id==="m3"&&item.source===initial.find(m=>m.id==="m3").source&&item.content==="建议回复在当前聊天光标旁展示，按 Tab 填入输入框。用户检查、修改后自行发送，系统不自动发送。")item.content="用户主动交办任务后生成回复草稿，检查、修改后自行使用，系统不自动发送。";
  }
  const memoryChanged = () => window.dispatchEvent(new CustomEvent('agentpc:memory-changed'));
  const persist = () => {
    try {phase2Storage.setItem('memory-demo-v1',JSON.stringify({items:state.items,selected:state.selected,preview:state.preview}));memoryChanged();}
    catch (_) {notice('本地存储不可用，本次修改仅在当前页面保留。');}
  };
  const matches = () => {
    const query=state.search.toLowerCase();
    if(!query)return state.items;
    return state.items.filter(m=>[m.title,m.content,directoryLabel(m.category),m.source,...m.related,...filesFor(m).map(file=>file.name)].join(' ').toLowerCase().includes(query));
  };
  const current = () => state.items.find(m => m.id===state.selected);
  let noticeTimer;
  function notice(message) { const n=$m('#pm-feedback');n.textContent=message;n.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{n.hidden=true;},3500); }
  function reconcile() {
    const list=matches();
    if(!list.some(m=>m.id===state.selected)){
      state.selected=list[0]?.id||null;
    }
  }
  function choose(id) {
    if(!matches().some(m=>m.id===id))return false;
    state.selected=id;
    state.entity=null;
    persist();render();
    return true;
  }
  const isHighlighted = m => state.entity ? m.related.includes(state.entity) : state.selected===m.id;
  const icons={edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4-1 12-12a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></svg>',delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',import:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'};
  function filesFor(memory) {
    if(memory.sourceFiles?.length)return memory.sourceFiles;
    const sample=sampleFiles[memory.id];
    const original=initial.find(item=>item.id===memory.id);
    return sample&&original&&memory.source===original.source?[sample]:[];
  }
  const isReading = (memoryId,fileId) => state.reader?.memoryId===memoryId&&state.reader.fileId===fileId;
  const fileIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6"/></svg>';
  const folderIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const directoryLabel = key => categoryLabel(key)||uncategorizedLabel;
  function directoryFiles(memory) {
    const files=filesFor(memory);
    return files.length?files:[{id:'',name:memory.title}];
  }
  function directoryEntries(memory) {
    const actions=[['edit','修改'],['delete','删除']].map(([action,label])=>
      `<button type="button" class="pm-row-icon ${action==='delete'?'pm-row-delete':''}" data-pm-action="${action}" data-memory-id="${esc(memory.id)}" aria-label="${label}：${esc(memory.title)}" title="${label}记忆">${icons[action]}</button>`).join('');
    return directoryFiles(memory).map((file,index)=>`<div class="pm-directory-entry">
      <button type="button" class="pm-row-file" data-pm-action="read-file" data-reader-memory-id="${esc(memory.id)}" data-file-id="${esc(file.id)}" aria-current="${isReading(memory.id,file.id)}" title="${esc(file.name)}">${fileIcon}<span>${esc(file.name)}</span></button>
      ${index===0?`<div class="pm-row-actions">${actions}</div>`:''}
    </div>`).join('');
  }
  function renderDirectory(list) {
    const groups=new Map();
    for(const memory of list){
      if(!groups.has(memory.category))groups.set(memory.category,[]);
      groups.get(memory.category).push(memory);
    }
    const other=groups.get('')||[];
    groups.delete('');
    if(other.length||!state.search)groups.set('',other);
    $m('#pm-memory-list').innerHTML=[...groups].map(([key,items])=>`<details class="pm-directory" data-pm-directory="${esc(key)}" ${state.search||openDirectories.has(key)?'open':''}>
      <summary class="pm-directory-label" title="${esc(directoryLabel(key))}">${folderIcon}<span>${esc(directoryLabel(key))}</span></summary>
      <div class="pm-directory-files">${items.length?items.map(directoryEntries).join(''):'<div class="pm-empty">暂无记忆</div>'}</div>
    </details>`).join('')||'<div class="pm-empty">暂无匹配记忆</div>';
  }
  function renderPreview() {
    const preview=$m('.pm-preview[data-subscreen-preview="memory"]');
    // Preserve the small-model display preference independently of memory content.
    APP_STATE.previewEnabled.memory=state.preview;
    renderPreviewToggles();
    preview.classList.toggle('pm-display-off',!state.preview);
    preview.querySelector('.pm-preview-off').hidden=state.preview;
    syncPhysicalScreenPreview(preview);
  }
  function renderGraph() {
    const list=matches();const svg=$m('#pm-graph');
    const entities=[...new Set(list.flatMap(m=>m.related))];
    const W=svg.clientWidth||900,H=svg.clientHeight||620;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    if(!list.length){svg.innerHTML=`<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#8e9fa8" font-size="16">暂无匹配关系</text>`;return;}
    const center={x:W/2,y:H*.44};
    const positions = new Map();
    list.forEach((m,i)=>{const a=(i/list.length)*Math.PI*2-Math.PI/2;positions.set(m.id,{x:center.x+Math.cos(a)*W*.27,y:center.y+Math.sin(a)*H*.23});});
    const entPositions=new Map();
    entities.forEach((name,i)=>{const a=(i/entities.length)*Math.PI*2-Math.PI/2+.21;entPositions.set(name,{x:center.x+Math.cos(a)*W*.43,y:center.y+Math.sin(a)*H*.34});});
    const chosen=current();
    const line=(a,b,selected=false)=>`<line class="pm-graph-edge ${selected?'selected':''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    let edges=list.map(m=>line(center,positions.get(m.id),isHighlighted(m))).join('');
    list.forEach(m=>m.related.forEach(e=>{edges+=line(positions.get(m.id),entPositions.get(e),state.entity ? e===state.entity : m.id===state.selected);}));
    const shortTitles={m1:'二期项目背景',m2:'表达习惯',m3:'聊天回复规则',m4:'汇报模板',m5:'报价资料',m6:'售后经验',m7:'双屏约定',m8:'新品介绍'};
    const label=m=>initial.find(x=>x.id===m.id)?.title===m.title?shortTitles[m.id]:(m.title.length>7?m.title.slice(0,6)+'…':m.title);
    const hit='<rect x="-28" y="-28" width="56" height="56" fill="transparent"/>';
    const nodes=list.map(m=>{const p=positions.get(m.id),color=colors[m.category]||'#95a4ad';return `<g class="pm-graph-node ${isHighlighted(m)?'selected':''}" transform="translate(${p.x} ${p.y})" data-pm-select="${esc(m.id)}" role="button" tabindex="0" aria-label="图谱记忆：${esc(m.title)}">${hit}<circle class="pm-node-ring" r="16" fill="${color}19" stroke="${color}" stroke-opacity=".7"/><circle r="7" fill="${color}"/><text y="31" text-anchor="middle">${esc(label(m))}</text></g>`;}).join('');
    const entNodes=entities.map(name=>{const p=entPositions.get(name),selected=state.entity ? name===state.entity : chosen?.related.includes(name);return `<g class="pm-graph-node ${selected?'selected':''}" transform="translate(${p.x} ${p.y})" data-pm-entity="${esc(name)}" role="button" tabindex="0" aria-label="关联对象：${esc(name)}">${hit}<circle class="pm-node-ring" r="10" fill="#5d7d9430" stroke="#7397af"/><circle r="4" fill="#86a8bc"/><text y="23" text-anchor="middle">${esc(name)}</text></g>`;}).join('');
    svg.innerHTML=`<g transform="translate(${center.x} ${center.y}) scale(${state.zoom}) translate(${-center.x} ${-center.y})">${edges}${entNodes}${nodes}<g class="pm-user-node" transform="translate(${center.x} ${center.y})"><circle r="23" fill="#b08c4130" stroke="#c4a471"/><circle r="11" fill="#c4a471"/><text y="40" text-anchor="middle">用户</text></g></g>`;
    $m('[data-pm-action="zoom-in"]').disabled=state.zoom>=1.6;
    $m('[data-pm-action="zoom-out"]').disabled=state.zoom<=.7;
  }
  function render() {
    reconcile();const list=matches();
    if(state.reader&&!list.some(memory=>memory.id===state.reader.memoryId&&directoryFiles(memory).some(file=>file.id===state.reader.fileId)))state.reader=null;
    $m('.pm-workspace').classList.toggle('pm-library-collapsed',state.libraryCollapsed);
    renderDirectory(list);
    $m('[data-pm-action="clear-search"]').hidden=!state.search;
    renderReader();renderGraph();renderPreview();
  }
  const dialog=$m('#pm-dialog');
  const dialogContent=dialog.querySelector('#pm-dialog-content');
  const dialogCloseButton='<button type="button" class="pm-detail-close" data-pm-action="close-dialog" aria-label="关闭">×</button>';
  let draft=null,dialogBack=null,returnFocus=null;
  function showDialog(html, {style='', back=null}={}) {
    dialogBack=back;
    dialog.dataset.pmDialogStyle=style;
    dialogContent.innerHTML=html;
    if(!dialog.open)dialog.showModal();
    const focusTarget=dialogContent.querySelector('[autofocus]') || dialogContent.querySelector('#pm-dialog-title');
    if(focusTarget){
      if(!focusTarget.hasAttribute('tabindex')&&focusTarget.tagName==='H3')focusTarget.tabIndex=-1;
      focusTarget.focus({preventScroll:true});
    }
    const body=dialogContent.querySelector('.pm-memory-dialog-body');
    if(body)body.scrollTop=0;
    dialog.scrollTop=0;
  }
  function closeDialog({goBack=true, restoreFocus=true}={}) {
    if(draft?.saving)return;
    draft=null;
    if(goBack&&dialogBack){dialogBack();return;}
    dialogBack=null;
    dialog.close();
    const target=returnFocus;
    returnFocus=null;
    if(restoreFocus)target?.()?.focus({preventScroll:true});
  }
  function manageCategory(key, action, onClose) {
    if(draft?.saving)return;
    const label=categoryLabel(key);
    const count=state.items.filter(item=>item.category===key).length;
    if(!count)return;
    const renaming=action==='rename';
    const confirmation=document.createElement('dialog');
    confirmation.className='pm-dialog pm-category-confirmation';
    confirmation.setAttribute('aria-labelledby','pm-category-action-title');
    confirmation.setAttribute('aria-describedby','pm-category-action-message');
    confirmation.innerHTML=`
      <h3 id="pm-category-action-title">${renaming?'重命名文件夹':`删除文件夹「${esc(label)}」？`}</h3>
      <p id="pm-category-action-message">${renaming
        ?`此文件夹中的 ${count} 条记忆会同步更新所属文件夹。`
        :`此文件夹中的 ${count} 条记忆将移到「其他」。记忆内容和关联文件会保留。`}</p>
      <form>
        ${renaming?`<label class="pm-field">文件夹名称<input name="categoryName" value="${esc(label)}" maxlength="${categoryLimit}" required autofocus></label>`:''}
        <p class="pm-category-action-error" role="alert" hidden></p>
        <div class="pm-dialog-actions">
          <button type="button" class="pm-button" data-category-cancel ${renaming?'':'autofocus'}>取消</button>
          <button type="submit" class="pm-button ${renaming?'pm-category-confirm-rename':'pm-category-confirm-delete'}">${renaming?'保存名称':'删除文件夹'}</button>
        </div>
      </form>`;
    let updatedCategory;
    confirmation.addEventListener('close',()=>{
      confirmation.remove();
      onClose(updatedCategory);
    },{once:true});
    confirmation.querySelector('[data-category-cancel]').addEventListener('click',()=>confirmation.close());
    const error=confirmation.querySelector('[role="alert"]');
    confirmation.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();
      let next='';
      if(renaming){
        const name=cleanCategory(confirmation.querySelector('input').value);
        const duplicate=existingCategory(name);
        next=customCategoryPrefix+name;
        const alreadyUsed=name===uncategorizedLabel||duplicate&&duplicate!==key;
        if(!isCategory(next)||alreadyUsed){
          error.textContent=alreadyUsed?'文件夹名称已存在。':'请输入有效的文件夹名称。';
          error.hidden=false;
          return;
        }
      }
      if(next===key){confirmation.close();return;}
      const items=state.items.map(item=>item.category===key?{...item,category:next}:item);
      try{
        phase2Storage.setItem('memory-demo-v1',JSON.stringify({items,selected:state.selected,preview:state.preview}));
      }catch(_){
        error.textContent='文件夹修改失败，本地存储不可用。请重试。';
        error.hidden=false;
        return;
      }
      state.items=items;
      if(openDirectories.delete(key))openDirectories.add(next);
      render();memoryChanged();
      updatedCategory=next;
      confirmation.close();
    });
    root.append(confirmation);
    confirmation.showModal();
    if(renaming)confirmation.querySelector('input').select();
  }
  function bindCategoryPicker() {
    const input=dialogContent.querySelector('#pm-category-input');
    const menu=dialogContent.querySelector('#pm-category-options');
    const toggle=dialogContent.querySelector('.pm-category-toggle');
    const actions=dialogContent.querySelector('.pm-category-actions');
    const picker=input.closest('.pm-category-picker');
    let options=[],active=-1,actionIndex=-1;
    function closeActions(){
      actions.hidden=true;
      actionIndex=-1;
    }
    function close(){
      closeActions();
      menu.hidden=true;
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
    }
    function open(query=''){
      closeActions();
      const search=cleanCategory(query);
      const selected=cleanCategory(input.value).toLowerCase();
      options=categoryOptions().map(key=>({key,value:categoryLabel(key)}))
        .filter(option=>option.value.toLowerCase().includes(search.toLowerCase()));
      if(search&&search!==uncategorizedLabel&&!existingCategory(search))options.push({value:search,label:`＋ 新建“${search}”`});
      if(!search)options.unshift({value:'',label:'＋ 新建文件夹',custom:true});
      menu.innerHTML=options.map(({value,label,custom,key},index)=>`
        <div id="pm-category-option-${index}" role="option" data-option="${index}" class="${custom?'pm-category-custom':''}" aria-selected="${!custom&&value.toLowerCase()===selected}" ${canManageCategory(key)?'aria-keyshortcuts="Shift+F10 Delete" aria-description="按 Shift+F10 打开文件夹操作，或按 Delete 删除文件夹"':''}>
          <span>${esc(label||value)}</span>
          ${canManageCategory(key)?'<span class="pm-category-more" data-category-more title="文件夹操作" aria-hidden="true">···</span>':''}
        </div>`).join('');
      active=-1;
      menu.hidden=false;
      menu.scrollTop=0;
      input.setAttribute('aria-expanded','true');
      input.removeAttribute('aria-activedescendant');
    }
    function select(index){
      const {value,custom,key}=options[index];
      input.value=value;
      draft.categoryEdited=true;
      draft.categoryKey=key;
      input.placeholder=custom?'输入新文件夹名称':folderPlaceholder;
      close();
    }
    function showActions(index){
      const option=options[index];
      if(!canManageCategory(option?.key))return;
      actionIndex=index;
      actions.style.top=`${menu.children[index].getBoundingClientRect().bottom-picker.getBoundingClientRect().top}px`;
      actions.setAttribute('aria-label',`“${option.value}”的文件夹操作`);
      actions.hidden=false;
      actions.querySelector('button').focus({preventScroll:true});
    }
    function requestAction(index,action){
      const option=options[index];
      if(!canManageCategory(option?.key))return;
      const selectedKey=draft.categoryEdited
        ?draft.categoryKey??categoryFromInput(input.value)
        :state.items.find(item=>item.id===draft.id)?.category??categoryFromInput(input.value);
      close();
      manageCategory(option.key,action,next=>{
        if(!input.isConnected||!dialog.open)return;
        if(next!==undefined&&selectedKey===option.key){
          input.value=categoryLabel(next);
          input.placeholder=folderPlaceholder;
          draft.categoryKey=next;
        }
        input.focus({preventScroll:true});
        open();
      });
    }
    input.addEventListener('focus',()=>open());
    input.addEventListener('click',()=>{if(menu.hidden)open();});
    input.addEventListener('input',()=>{draft.categoryEdited=true;draft.categoryKey=undefined;open(input.value);});
    picker.addEventListener('focusout',event=>{if(!picker.contains(event.relatedTarget))close();});
    toggle.addEventListener('mousedown',event=>event.preventDefault());
    toggle.addEventListener('click',()=>{
      const wasOpen=!menu.hidden;
      input.focus();
      if(wasOpen)close();else open();
    });
    menu.addEventListener('mousedown',event=>event.preventDefault());
    menu.addEventListener('click',event=>{
      const option=event.target.closest('[data-option]');
      if(!option)return;
      const index=Number(option.dataset.option);
      if(event.target.closest('[data-category-more]'))showActions(index);
      else select(index);
    });
    actions.addEventListener('click',event=>{
      const button=event.target.closest('[data-category-action]');
      if(button)requestAction(actionIndex,button.dataset.categoryAction);
    });
    actions.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        input.focus({preventScroll:true});
      }
    });
    input.addEventListener('keydown',event=>{
      if(event.isComposing||event.keyCode===229||menu.hidden&&event.key==='Escape')return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(menu.hidden)open();
        if(active<0)active=event.key==='ArrowDown'?0:options.length-1;
        else active=(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
        const option=menu.children[active];
        input.setAttribute('aria-activedescendant',option.id);
        option.scrollIntoView({block:'nearest'});
        for(const item of menu.children)item.setAttribute('aria-selected',String(item===option));
      }else if(event.key==='F10'&&event.shiftKey&&!menu.hidden&&canManageCategory(options[active]?.key)){
        event.preventDefault();
        showActions(active);
      }else if(event.key==='Delete'&&!menu.hidden&&canManageCategory(options[active]?.key)){
        event.preventDefault();
        requestAction(active,'delete');
      }else if(event.key==='Enter'&&!menu.hidden){
        event.preventDefault();
        if(active>=0)select(active);else close();
      }else if(event.key==='Escape'){
        event.preventDefault();
        close();
      }
    });
  }
  function editor(isNew, back=null) {
    const m=isNew?{title:'',content:'',category:''}:current();if(!m)return;
    draft={mode:'edit',id:isNew?null:m.id,attachments:(m.sourceFiles||[]).map(file=>({...file})),pending:[],statuses:[],busy:false,saving:false};
    showDialog(`<header class="pm-memory-dialog-header">
      <h3 id="pm-dialog-title">${isNew?'新建记忆':'修改记忆'}</h3>
      ${dialogCloseButton}
    </header>
    <form id="pm-form" data-edit-id="${isNew?'':esc(m.id)}">
      <div class="pm-memory-dialog-body pm-memory-editor-fields">
        <div class="pm-memory-editor-top">
          <label class="pm-field">名称<input name="title" aria-label="记忆名称" autofocus required maxlength="80" value="${esc(m.title)}" placeholder="输入记忆名称"></label>
          <div class="pm-field">
            <label for="pm-category-input">所属文件夹（选填）</label>
            <div class="pm-category-picker">
              <input id="pm-category-input" name="category" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pm-category-options" autocomplete="off" maxlength="${categoryLimit}" value="${esc(categoryLabel(m.category))}" placeholder="${folderPlaceholder}">
              <button type="button" class="pm-category-toggle" tabindex="-1" aria-label="展开或收起文件夹选项">⌄</button>
              <div id="pm-category-options" class="pm-category-options" role="listbox" aria-label="文件夹选项" hidden></div>
              <div class="pm-category-actions" role="group" aria-label="文件夹操作" hidden>
                <button type="button" data-category-action="rename">重命名</button>
                <button type="button" data-category-action="delete">删除文件夹</button>
              </div>
            </div>
          </div>
        </div>
        <label class="pm-field">内容<textarea name="content" aria-label="记忆内容" required placeholder="输入或粘贴记忆内容，支持 Markdown">${esc(m.content)}</textarea></label>
        <div>
          <div class="pm-memory-import-row">
            <button type="button" class="pm-button" data-pm-action="choose-memory-files" aria-describedby="pm-memory-import-hint">导入资料</button>
            <span id="pm-memory-import-hint">仅支持 Markdown（.md）</span>
            <input type="file" data-pm-file-input accept=".md" multiple hidden>
          </div>
          <div data-pm-attachments></div>
          <div data-pm-import-status role="status"></div>
        </div>
        ${!isNew?`<details class="pm-editor-source-details"><summary>查看来源</summary><p>${esc(m.source||'手动添加')}</p>${(m.sourceFiles||[]).map(file=>`<div class="pm-editor-source-file"><button type="button" class="pm-button" data-pm-action="preview-editor-file" data-file-id="${esc(file.id)}">${esc(file.name)}</button><pre class="pm-source-content" hidden></pre></div>`).join('')}</details>`:''}
        <p id="pm-form-error" role="alert" hidden></p>
      </div>
      <div class="pm-dialog-actions pm-memory-dialog-actions">
        <button type="button" class="pm-button" data-pm-action="close-dialog">取消</button>
        <button type="submit" class="pm-button pm-primary" data-pm-save>保存</button>
      </div>
    </form>`,{style:'editor',back});
    bindCategoryPicker();
    renderAttachments();
  }
  function showMemoryDetail() {
    const memory=current();
    if(!memory)return;
    const files=filesFor(memory);
    const sources=files.map(file=>`
      <button type="button" class="pm-memory-detail-source" data-pm-action="detail-source" data-file-id="${esc(file.id)}">
        <span><strong>${esc(file.name)}</strong><small>文件</small></span><span class="pm-memory-detail-link">查看内容 ›</span>
      </button>`).join('');
    showDialog(`<header class="pm-memory-dialog-header">
      <div><div class="pm-memory-detail-label">记忆详情</div><h3 id="pm-dialog-title">${esc(memory.title)}</h3></div>
      ${dialogCloseButton}
    </header>
    <div class="pm-memory-dialog-body pm-memory-detail-body">
      <div class="pm-memory-detail-meta">
        ${memory.updated?`<span>更新于 ${esc(memory.updated)}</span>`:''}
      </div>
      <section><h4>记忆内容</h4><div class="pm-memory-detail-text">${esc(memory.content)}</div></section>
      <details class="pm-memory-detail-info" open>
        <summary>记忆信息</summary>
        <dl><div><dt>名称</dt><dd>${esc(memory.title)}</dd></div>${memory.category?`<div><dt>分类</dt><dd>${esc(categoryLabel(memory.category))}</dd></div>`:''}</dl>
      </details>
      <section><h4>来源资料</h4>${sources||`<div class="pm-memory-detail-source">${esc(memory.source||'手动添加')}</div>`}</section>
      <section>
        <div class="pm-memory-detail-heading"><h4>图谱关联</h4><button type="button" class="pm-memory-detail-link" data-pm-action="locate-memory">在图谱中查看 ↗</button></div>
        <div class="pm-memory-detail-tags">${memory.related.map(name=>`<span>${esc(name)}</span>`).join('')||'<small>暂无关联对象</small>'}</div>
      </section>
    </div>
    <div class="pm-dialog-actions pm-memory-dialog-actions">
      <button type="button" class="pm-button pm-memory-delete" data-pm-action="detail-delete">删除记忆</button>
      <button type="button" class="pm-button" data-pm-action="close-dialog">关闭</button>
      <button type="button" class="pm-button pm-primary" data-pm-action="detail-edit">修改记忆</button>
    </div>`,{style:'detail'});
  }
  function openGraphObject(name) {
    state.entity=name;
    render();
    $m(`#pm-graph [data-pm-entity="${CSS.escape(name)}"]`)?.focus({preventScroll:true});
    const files=new Map(matches().flatMap(memory=>filesFor(memory)
      .filter(file=>file.name===name||file.name.replace(/\.md$/i,'')===name)
      .map(file=>[file.id,{file,memory}])));
    if(files.size===1){
      const {file,memory}=files.values().next().value;
      openFileReader(memory,file.id);
    }
  }
  function importDialog() {
    const m=current();if(!m)return;
    draft={mode:'import',id:m.id,attachments:(m.sourceFiles||[]).map(file=>({...file})),pending:[],statuses:[],busy:false,saving:false};
    showDialog(`<h3 id="pm-dialog-title">导入资料</h3><p class="pi-import-description">导入本地工作文件，保留原文件副本并提取文字；不会自动转成长期记忆。</p><form class="pm-import-form" id="pm-form" data-edit-id="${esc(m.id)}"><input type="hidden" name="title" value="${esc(m.title)}"><input type="hidden" name="category" value="${esc(m.category)}"><input type="hidden" name="source" value="${esc(m.source)}"><div class="pi-dropzone" data-pm-editor-drop><span aria-hidden="true">＋</span><strong>拖入文件，或选择文件</strong><span>MD · TXT · PDF · DOCX · XLSX · CSV</span><button type="button" class="pm-button pm-primary" data-pm-action="choose-memory-files">选择文件</button><input type="file" data-pm-file-input accept=".md,.txt,.pdf,.docx,.xlsx,.csv" multiple hidden></div><p class="pi-import-hint">PDF 仅支持有文字层的文件；暂不支持扫描件、图片和音视频。</p><div data-pm-attachments></div><div data-pm-import-status role="status"></div><label class="pm-field" data-pm-import-preview hidden>导入内容预览<textarea name="content" aria-label="导入内容预览" required placeholder="选择文件后显示提取内容"></textarea></label><p id="pm-form-error" role="alert" hidden></p><p class="pi-storage-hint">资料保存在本浏览器，尚未写入系统设置中的存储目录或 AI 知识索引。</p><div class="pm-dialog-actions"><button type="button" class="pm-button" data-pm-action="close-dialog">取消</button><button type="submit" class="pm-button pm-primary" data-pm-save>导入</button></div></form>`);
    renderAttachments();
  }
  function renderAttachments() {
    if(!draft||!dialog.open)return;
    $m('[data-pm-attachments]').innerHTML=(draft.mode==='import'?draft.pending:draft.attachments).map(file=>`<div class="pm-editor-file"><div><strong>${esc(file.name)}</strong><small>${esc(file.ext.toUpperCase())} · ${phase2MemoryFiles.size(file.size)} · ${draft.pending.some(record=>record.id===file.id)?'待保存':'已关联'}</small></div><button type="button" class="pm-detail-close" data-pm-action="remove-memory-file" data-file-id="${esc(file.id)}" aria-label="移除来源：${esc(file.name)}" ${draft.busy||draft.saving?'disabled':''}>×</button></div>`).join('');
    $m('[data-pm-import-status]').innerHTML=draft.statuses.map(status=>`<div class="pm-editor-status ${status.failed?'error':''}">${esc(status.name)}：${esc(status.message)}</div>`).join('');
    const save=$m('[data-pm-save]');save.disabled=draft.busy||draft.saving||(draft.mode==='import'&&!draft.pending.length);save.textContent=draft.saving?'正在保存…':(draft.mode==='import'?'导入':'保存');
    const preview=$m('[data-pm-import-preview]');if(preview)preview.hidden=!draft.pending.length;
    $m('[data-pm-action="choose-memory-files"]').disabled=draft.busy||draft.saving;
  }
  async function importIntoMemory(files) {
    if(!draft||draft.busy||draft.saving)return;
    const active=draft;active.busy=true;active.statuses=[];renderAttachments();
    for(const file of files){
      if(draft!==active)return;
      const status={name:file.name,message:'正在解析…'};active.statuses.push(status);renderAttachments();
      try{
        if(active.attachments.some(record=>record.key===phase2MemoryFiles.key(file))){status.message='已关联，跳过重复文件。';continue;}
        const record=await phase2MemoryFiles.stage(file);
        if(draft!==active)return;
        active.attachments.push(record);active.pending.push(record);
        const content=$m('#pm-form [name="content"]');
        content.value=`${content.value.trimEnd()}${content.value.trim()?'\n\n':''}【${record.name}】\n${record.content}`;
        const title=$m('#pm-form [name="title"]');
        if(!title.value.trim())title.value=record.name.replace(/\.[^.]+$/,'').slice(0,80);
        status.message='已提取到文字内容，可修改后保存。';
      }catch(error){if(draft!==active)return;status.failed=true;status.message=/[\u4e00-\u9fff]/.test(error.message)?error.message:'解析失败，文件可能损坏或格式不匹配。';}
      finally{if(draft===active)renderAttachments();}
    }
    if(draft!==active)return;active.busy=false;renderAttachments();
  }
  function renderReader() {
    const reader=$m('.pm-file-reader');
    const graph=$m('.pm-graph-view');
    const memory=state.items.find(item=>item.id===state.reader?.memoryId);
    reader.hidden=!memory;
    graph.hidden=Boolean(memory);
    if(memory){
      const file=directoryFiles(memory).find(item=>item.id===state.reader.fileId);
      $m('[data-pm-reader-memory]').textContent=directoryLabel(memory.category);
      $m('[data-pm-reader-filename]').textContent=file.name;
      if(!file.id){
        const content=$m('[data-pm-reader-content]');
        if(content.firstElementChild?.textContent!==memory.title||content.lastElementChild?.textContent!==memory.content){
          const heading=document.createElement('h2');
          const body=document.createElement('pre');
          heading.textContent=memory.title;
          body.textContent=memory.content;
          body.contentEditable='plaintext-only';
          body.setAttribute('role','textbox');
          body.setAttribute('aria-label','编辑记忆正文');
          body.setAttribute('aria-multiline','true');
          body.style.cursor='text';
          body.style.outline='none';
          content.replaceChildren(heading,body);
        }
      }
    }
    $m('.pm-memory-library').querySelectorAll('.pm-row-file').forEach(button=>{
      button.setAttribute('aria-current',String(isReading(button.dataset.readerMemoryId,button.dataset.fileId)));
    });
  }
  async function openFileReader(memory, fileId) {
    const file=memory&&directoryFiles(memory).find(item=>item.id===fileId);
    if(!file)return;
    if(dialog.open)closeDialog({goBack:false,restoreFocus:false});
    const request={memoryId:memory.id,fileId};
    const sampleBody=file===sampleFiles[memory.id]?file.body:'';
    state.reader=request;
    const directory=$m(`[data-pm-directory="${CSS.escape(memory.category)}"]`);
    if(directory)directory.open=true;
    if(!state.search)openDirectories.add(memory.category);
    renderReader();
    $m('.pm-row-file[aria-current="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
    const content=$m('[data-pm-reader-content]');
    if(fileId)content.innerHTML=sampleBody||'<p role="status">正在读取资料…</p>';
    content.scrollTop=0;
    $m('[data-pm-action="close-reader"]').focus({preventScroll:true});
    if(!fileId||sampleBody)return;
    try{
      const source=await phase2MemoryFiles.get(fileId);
      if(!source)throw new Error('来源文件不可用，仍可查看记忆正文。');
      if(state.reader!==request)return;
      const text=document.createElement('pre');
      text.textContent=source.content;
      content.replaceChildren(text);
    }catch(error){
      if(state.reader===request)content.innerHTML=`<p role="alert">${esc(error.message)}</p>`;
    }
  }
  function closeFileReader(restoreFocus=true) {
    const previous=state.reader;
    if(!previous)return;
    state.reader=null;
    renderReader();
    renderGraph();
    if(restoreFocus){
      const file=$m(`.pm-row-file[data-reader-memory-id="${CSS.escape(previous.memoryId)}"][data-file-id="${CSS.escape(previous.fileId)}"]`);
      const target=file?.getClientRects().length?file:$m('[data-pm-search]');
      target.focus({preventScroll:true});
    }
  }
  async function previewEditorFile(button) {
    const preview=button.nextElementSibling;
    if(!preview.hidden){preview.hidden=true;return;}
    const active=draft;preview.hidden=false;preview.textContent='正在读取资料…';
    try{
      const file=await phase2MemoryFiles.get(button.dataset.fileId);
      if(draft!==active||!preview.isConnected)return;
      preview.textContent=file?.content||'来源文件不可用。';
    }catch(_){if(draft===active&&preview.isConnected)preview.textContent='资料读取失败，请重试。';}
  }
  root.addEventListener('input',e=>{if(!e.target.matches('[data-pm-search]'))return;state.search=e.target.value.trim();$m('#pm-search').value=e.target.value;state.entity=null;render();});
  root.addEventListener('click',e=>{
    const directory=e.target.closest('.pm-directory-label')?.parentElement;
    if(directory){
      e.preventDefault();
      directory.open=!directory.open;
      if(!state.search){
        if(directory.open)openDirectories.add(directory.dataset.pmDirectory);
        else openDirectories.delete(directory.dataset.pmDirectory);
      }
      return;
    }
    const selection=e.target.closest('[data-pm-select]');
    if(selection){
      const id=selection.dataset.pmSelect;
      if(choose(id)){
        const memory=current();
        openFileReader(memory,directoryFiles(memory)[0].id);
      }
      return;
    }
    const entity=e.target.closest('[data-pm-entity]');
    if(entity){openGraphObject(entity.dataset.pmEntity);return;}
    const button=e.target.closest('[data-pm-action]');if(!button)return;
    if(button.dataset.memoryId){
      const {memoryId,pmAction}=button.dataset;
      if(!choose(memoryId))return;
      returnFocus=()=>$m(`[data-pm-action="${CSS.escape(pmAction)}"][data-memory-id="${CSS.escape(memoryId)}"]`);
    }
    switch(button.dataset.pmAction){
      case 'new':returnFocus=()=>button;editor(true);break;
      case 'edit':editor(false);break;
      case 'detail-edit':editor(false,showMemoryDetail);break;
      case 'read-file':openFileReader(state.items.find(memory=>memory.id===button.dataset.readerMemoryId),button.dataset.fileId);break;
      case 'detail-source':openFileReader(current(),button.dataset.fileId);break;
      case 'close-reader':closeFileReader();break;
      case 'locate-memory':{
        const id=current()?.id;
        closeDialog({restoreFocus:false});
        closeFileReader(false);
        const node=id&&$m(`#pm-graph [data-pm-select="${CSS.escape(id)}"]`);
        node?.scrollIntoView({block:'nearest',inline:'nearest'});
        node?.focus({preventScroll:true});
        break;
      }
      case 'import':importDialog();break;
      case 'collapse-library':state.libraryCollapsed=true;render();$m('[data-pm-action="expand-library"]').focus();break;
      case 'expand-library':state.libraryCollapsed=false;render();$m('[data-pm-action="collapse-library"]').focus();break;
      case 'preview-editor-file':previewEditorFile(button);break;
      case 'choose-memory-files':$m('[data-pm-file-input]').click();break;
      case 'remove-memory-file':if(draft&&!draft.busy&&!draft.saving){draft.attachments=draft.attachments.filter(file=>file.id!==button.dataset.fileId);draft.pending=draft.pending.filter(file=>file.id!==button.dataset.fileId);draft.statuses=[{name:'来源已移除',message:'文字内容保留，可自行修改。'}];renderAttachments();}break;
      case 'close-dialog':closeDialog();break;
      case 'clear-search':state.search='';state.entity=null;$m('#pm-search').value='';render();$m('#pm-search').focus();break;
      case 'toggle-preview':state.preview=!state.preview;persist();renderPreview();break;
      case 'zoom-in':state.zoom=Math.min(1.6,+(state.zoom+.15).toFixed(2));renderGraph();break;
      case 'zoom-out':state.zoom=Math.max(.7,+(state.zoom-.15).toFixed(2));renderGraph();break;
      case 'reset-zoom':state.zoom=1;renderGraph();break;
      case 'detail-delete':
      case 'delete':{
        const m=current();
        if(m)showDialog(`<h3 id="pm-dialog-title">删除记忆</h3><p>将删除「${esc(m.title)}」及其图谱关联。</p>${filesFor(m).length?'<p>电脑上的原文件会保留。</p>':''}<div class="pm-dialog-actions"><button class="pm-button" type="button" data-pm-action="close-dialog">取消</button><button class="pm-button pm-primary" type="button" data-pm-action="confirm-delete" data-delete-id="${esc(m.id)}">确认删除</button></div><p id="pm-delete-error" role="alert" hidden></p>`,{back:button.dataset.pmAction==='detail-delete'?showMemoryDetail:null});
        break;
      }
      case 'confirm-delete':{
        const items=state.items.filter(m=>m.id!==button.dataset.deleteId);
        try{
          phase2Storage.setItem('memory-demo-v1',JSON.stringify({items,selected:null,preview:state.preview}));
          state.items=items;
          closeDialog({goBack:false,restoreFocus:false});
          render();
          $m('[data-pm-search]')?.focus({preventScroll:true});
          memoryChanged();notice('记忆已删除。');
        }catch(_){
          const error=$m('#pm-delete-error');
          error.textContent='删除失败，本地存储不可用。记忆已保留。';
          error.hidden=false;
        }
        break;
      }
    }
  });
  root.addEventListener('keydown',e=>{const node=e.target.closest('.pm-graph-node');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  root.addEventListener('change',e=>{
    if(e.target.matches('[data-pm-file-input]')){
      const files=[...e.target.files];e.target.value='';importIntoMemory(files);
    }
  });
  root.addEventListener('dragover',e=>{const drop=e.target.closest('[data-pm-editor-drop]');if(drop){e.preventDefault();drop.classList.add('dragging');}});
  root.addEventListener('dragleave',e=>{const drop=e.target.closest('[data-pm-editor-drop]');if(drop&&!drop.contains(e.relatedTarget))drop.classList.remove('dragging');});
  root.addEventListener('drop',e=>{const drop=e.target.closest('[data-pm-editor-drop]');if(drop){e.preventDefault();drop.classList.remove('dragging');importIntoMemory([...e.dataTransfer.files]);}});
  root.addEventListener('submit',async e=>{
    if(e.target.id!=='pm-form')return;e.preventDefault();
    if(!draft||draft.busy||draft.saving)return;
    const data=new FormData(e.target),title=String(data.get('title')).trim(),content=String(data.get('content')).trim();
    if(!title||!content){$m('#pm-form-error').hidden=false;$m('#pm-form-error').textContent='名称和内容不能为空。';return;}
    const previous=state.items.find(m=>m.id===e.target.dataset.editId);
    if(draft.mode==='import'&&!draft.pending.length)return;
    const category=previous&&!draft.categoryEdited?previous.category:draft.categoryKey??categoryFromInput(String(data.get('category')??''));
    if(!isCategory(category)){
      $m('#pm-form-error').hidden=false;
      $m('#pm-form-error').textContent=`文件夹名称不能超过 ${categoryLimit} 个字符。`;
      return;
    }
    const active=draft;active.saving=true;renderAttachments();
    e.target.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);
    try{
      await phase2MemoryFiles.commit(active.pending);
      const sourceFiles=active.attachments.map(({id,key,name,ext,size,note})=>({id,key,name,ext,size,note}));
      const priorFileNames=(previous?.sourceFiles||[]).map(file=>file.name);
      const related=[...new Set([...(previous?.related||[]).filter(name=>!priorFileNames.includes(name)),...sourceFiles.map(file=>file.name)])];
      const m={reviewStatus:'confirmed',id:previous?.id||'m-'+crypto.randomUUID(),title,content:active.mode==='import'?`${previous.content.trimEnd()}\n\n${content}`:content,category,source:previous?.source||(sourceFiles.length?'导入资料':'手动添加'),sourceFiles,related,updated:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date())};
      const items=previous?state.items.map(x=>x.id===m.id?m:x):[m,...state.items];
      phase2Storage.setItem('memory-demo-v1',JSON.stringify({items,selected:m.id,preview:state.preview}));
      state.items=items;
      state.search='';$m('#pm-search').value='';state.selected=m.id;state.entity=null;
      openDirectories.add(category);
      active.saving=false;render();closeDialog();memoryChanged();notice(active.mode==='import'?'已补充到当前记忆，原内容保留。':(previous?'记忆已修改。':'记忆已保存。'));
    }catch(error){active.saving=false;e.target.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);renderAttachments();$m('[data-pm-action="close-dialog"]').disabled=false;$m('#pm-form-error').hidden=false;$m('#pm-form-error').textContent=/[\u4e00-\u9fff]/.test(error.message)?error.message:'保存失败，本地存储空间不足或不可用。输入内容已保留。';}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();});
  const cloneSnapshot = value => JSON.parse(JSON.stringify(value));
  const snapshot = () => cloneSnapshot({items:state.items,selected:state.selected,preview:true});
  const validateSnapshot = value => {
    const invalid = () => {throw new Error('记忆备份格式无效，请选择有效的原型记忆备份。');};
    const object = item => item && typeof item==='object' && !Array.isArray(item);
    const nonempty = text => typeof text==='string' && text.trim().length>0;
    let normalized;
    try {normalized=cloneSnapshot(value);}catch(_){invalid();}
    if(!object(normalized)||!Array.isArray(normalized.items))invalid();
    const ids=new Set();
    for(const item of normalized.items){
      if(!object(item)||!nonempty(item.id)||ids.has(item.id)||typeof item.title!=='string'||typeof item.content!=='string'||!isCategory(item.category)||!Array.isArray(item.related)||!item.related.every(name=>typeof name==='string'))invalid();
      ids.add(item.id);
      if(item.sourceFiles!==undefined){
        if(!Array.isArray(item.sourceFiles))invalid();
        const fileIds=new Set();
        for(const file of item.sourceFiles){
          if(!object(file)||!nonempty(file.id)||fileIds.has(file.id)||!nonempty(file.key)||!nonempty(file.name)||!['md','txt','pdf','docx','xlsx','csv'].includes(file.ext)||!Number.isSafeInteger(file.size)||file.size<0||(file.note!==undefined&&typeof file.note!=='string'))invalid();
          fileIds.add(file.id);
        }
      }
    }
    return {items:normalized.items.map(withoutLegacyCore),selected:ids.has(normalized.selected)?normalized.selected:(normalized.items[0]?.id||null),preview:true};
  };
  const isBusy = () => Boolean(draft?.busy||draft?.saving);
  window.phase2MemoryBackupSource = {
    snapshot,
    validate:validateSnapshot,
    isBusy,
    restore(value){
      if(isBusy())throw new Error('记忆资料正在处理或保存，请完成后再恢复备份。');
      const normalized=validateSnapshot(value);
      phase2Storage.setItem('memory-demo-v1',JSON.stringify(normalized));
      if(dialog.open)closeDialog({goBack:false});
      state.items=normalized.items;state.selected=normalized.selected;state.preview=true;
      state.search='';state.entity=null;state.reader=null;$m('#pm-search').value='';
      openDirectories.clear();
      openDirectories.add(state.items[0]?.category??'');
      render();memoryChanged();
      return snapshot();
    }
  };
  window.phase2SmallMemoryPreview={set(enabled){state.preview=enabled;persist();renderPreview();}};
  render();if(storageWarning)notice('原型存储读取失败，当前展示演示数据。');
  new ResizeObserver(()=>{if($m('#pm-graph').clientWidth>0)renderGraph();}).observe($m('#pm-graph'));
  if(new URLSearchParams(location.search).get('page')==='memory')setActiveTab('memory');
})();
