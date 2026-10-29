/* Interactive demo only. No model, real screen collection, or real knowledge index. */
(() => {
  const root = document.querySelector('#memory');
  if (!root) return;
  const $m = (selector) => root.querySelector('.pm-preview[data-subscreen-preview="memory"]')?.querySelector(selector) || root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = {project:'项目',preference:'偏好',decision:'工作要求',document:'资料'};
  const filterTabs = {all:'全部',project:'项目',work:'工作',tool:'工具'};
  const colors = {project:'#56bbae',preference:'#b396dc',decision:'#cfab76',document:'#6daae0'};
  const initial = [
    {id:'m1',title:'Agent PC 二期项目背景',content:'沿用一期软件框架，整合屏幕理解、本地知识与长期记忆、任务执行。文本、全局语音和屏幕感知共同作为任务入口。',category:'project',core:true,source:'Agent PC 二期需求说明（示例）',related:['Agent PC','微信','飞书','钉钉'],updated:'2026-10-09'},
    {id:'m2',title:'办公回复的表达习惯',content:'先给结论，再补充必要说明。回复简短、具体，重要信息突出展示，避免反复解释已有背景。',category:'preference',core:true,source:'用户手动保存（示例）',related:['用户偏好','微信'],updated:'2026-10-09'},
    {id:'m3',title:'聊天回复的采纳规则',content:'建议回复在当前聊天光标旁展示，按 Tab 填入输入框。用户检查、修改后自行发送，系统不自动发送。',category:'decision',core:true,source:'已确认交互规则（示例）',related:['Agent PC','微信','飞书'],updated:'2026-10-08'},
    {id:'m4',title:'项目进展汇报模板',content:'进度汇报按“已完成、进行中、待处理”整理。保留已经确认的事项，并在引用历史决定时展示资料来源。',category:'document',core:false,source:'项目进展模板.md（示例）',related:['项目管理','飞书'],updated:'2026-10-08'},
    {id:'m5',title:'报价资料与文件位置',content:'准备报价时，参考产品资料、价格表与报价模板。价格和数量需核对；生成文件后先预览再使用。',category:'document',core:false,source:'产品报价资料（示例）',related:['产品资料','微信'],updated:'2026-10-07'},
    {id:'m6',title:'售后问题处理经验',content:'相似问题优先查询操作手册与历史处理记录。没有匹配依据时说明缺少资料，避免编造处理方案。',category:'document',core:false,source:'售后操作手册（示例）',related:['操作手册','钉钉'],updated:'2026-10-07'},
    {id:'m7',title:'主屏与小屏的交互约定',content:'双屏连接时，全局语音交互显示在自带小屏，不打断主屏工作。完整资料、图谱和内容编辑在主屏管理。',category:'decision',core:false,source:'双屏交互说明（示例）',related:['Agent PC','用户偏好'],updated:'2026-10-06'},
    {id:'m8',title:'新品介绍整理项目',content:'根据客户关注点整理产品介绍，沿用本地产品资料和历史表达要求，减少反复交代背景。',category:'project',core:false,source:'新品介绍项目（示例）',related:['产品资料','项目管理'],updated:'2026-10-06'}
  ];
  const state = {items:initial,selected:'m1',category:'all',search:'',detailOpen:false,zoom:1,preview:true,libraryCollapsed:false};
  let storageWarning = false;
  try {
    const saved = JSON.parse(phase2Storage.getItem('memory-demo-v1') || 'null');
    if (saved && Array.isArray(saved.items) && saved.items.every(m => typeof m.id==='string' && typeof m.title==='string' && typeof m.content==='string' && categories[m.category] && Array.isArray(m.related))) {
      state.items=saved.items;state.selected=saved.selected;state.preview=saved.preview!==false;
    }
  } catch (_) { storageWarning=true; }
  const memoryChanged = () => window.dispatchEvent(new CustomEvent('agentpc:memory-changed'));
  const persist = () => {
    try {phase2Storage.setItem('memory-demo-v1',JSON.stringify({items:state.items,selected:state.selected,preview:state.preview}));memoryChanged();}
    catch (_) {notice('本地存储不可用，本次修改仅在当前页面保留。');}
  };
  // Keep list topics separate from the existing graph/editor categories.
  // Only unchanged demo records receive the demo topic mapping; saved user content is not rewritten.
  const demoFilterTags = {m3:['work','tool'],m7:['work','tool']};
  const filterTagsFor = m => {
    const explicit = Array.isArray(m.filterTags) ? m.filterTags.filter(tag=>tag!=='all'&&Object.hasOwn(filterTabs,tag)) : [];
    if(explicit.length)return explicit;
    const sample = initial.find(item=>item.id===m.id&&item.title===m.title&&item.content===m.content&&item.category===m.category);
    if(sample&&demoFilterTags[sample.id])return demoFilterTags[sample.id];
    return m.category==='project'?['project']:['work'];
  };
  const matches = () => state.items.filter(m => (state.category==='all'||filterTagsFor(m).includes(state.category)) && [m.title,m.content,m.source,...m.related].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const current = () => state.items.find(m => m.id===state.selected);
  let noticeTimer;
  function notice(message) { const n=$m('#pm-feedback');n.textContent=message;n.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{n.hidden=true;},3500); }
  function reconcile() {
    const list=matches();
    if(!list.some(m=>m.id===state.selected)){
      state.selected=list[0]?.id||null;
    }
  }
  function choose(id, open=false) {
    if(!matches().some(m=>m.id===id))return;
    state.selected=id;state.detailOpen=open;
    persist();render();
  }
  const icons={edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4-1 12-12a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></svg>',delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',import:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'};
  const row = (m) => `<div class="pm-memory-row ${state.selected===m.id?'active':''}"><div class="pm-row-heading"><button type="button" class="pm-row-title" data-pm-select="${esc(m.id)}" aria-label="选择记忆：${esc(m.title)}" aria-pressed="${state.selected===m.id}" title="${esc(m.title)}"><strong>${esc(m.title)}</strong></button><div class="pm-row-actions">${[['edit','修改'],['delete','删除']].map(([action,label])=>`<button type="button" class="pm-row-icon ${action==='delete'?'pm-row-delete':''}" data-pm-action="${action}" data-memory-id="${esc(m.id)}" aria-label="${label}：${esc(m.title)}" title="${label}">${icons[action]}</button>`).join('')}</div></div><p>${esc(m.content)}</p><small>${esc(categories[m.category])} · ${esc(m.updated)}</small></div>`;
  function renderPreview() {
    const preview=$m('.pm-preview[data-subscreen-preview="memory"]');
    // Phase 2 keeps the content visible without a small-screen preview switch.
    state.preview=true;
    APP_STATE.previewEnabled.memory=state.preview;
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
    let edges=list.map(m=>line(center,positions.get(m.id),m.id===state.selected)).join('');
    list.forEach(m=>m.related.forEach(e=>{edges+=line(positions.get(m.id),entPositions.get(e),m.id===state.selected);}));
    const shortTitles={m1:'二期项目背景',m2:'表达习惯',m3:'聊天回复规则',m4:'汇报模板',m5:'报价资料',m6:'售后经验',m7:'双屏约定',m8:'新品介绍'};
    const label=m=>initial.find(x=>x.id===m.id)?.title===m.title?shortTitles[m.id]:(m.title.length>7?m.title.slice(0,6)+'…':m.title);
    const hit='<rect x="-28" y="-28" width="56" height="56" fill="transparent"/>';
    const nodes=list.map(m=>{const p=positions.get(m.id),color=colors[m.category];return `<g class="pm-graph-node ${m.id===state.selected?'selected':''}" transform="translate(${p.x} ${p.y})" data-pm-select="${esc(m.id)}" role="button" tabindex="0" aria-label="图谱记忆：${esc(m.title)}">${hit}<circle class="pm-node-ring" r="16" fill="${color}19" stroke="${color}" stroke-opacity=".7"/><circle r="7" fill="${color}"/><text y="31" text-anchor="middle">${esc(label(m))}</text></g>`;}).join('');
    const entNodes=entities.map(name=>{const p=entPositions.get(name),selected=chosen?.related.includes(name);return `<g class="pm-graph-node ${selected?'selected':''}" transform="translate(${p.x} ${p.y})" data-pm-entity="${esc(name)}" role="button" tabindex="0" aria-label="关联对象：${esc(name)}">${hit}<circle class="pm-node-ring" r="10" fill="#5d7d9430" stroke="#7397af"/><circle r="4" fill="#86a8bc"/><text y="23" text-anchor="middle">${esc(name)}</text></g>`;}).join('');
    svg.innerHTML=`<g transform="translate(${center.x} ${center.y}) scale(${state.zoom}) translate(${-center.x} ${-center.y})">${edges}${entNodes}${nodes}<g class="pm-user-node" transform="translate(${center.x} ${center.y})"><circle r="23" fill="#b08c4130" stroke="#c4a471"/><circle r="11" fill="#c4a471"/><text y="40" text-anchor="middle">用户</text></g></g>`;
    $m('[data-pm-action="zoom-in"]').disabled=state.zoom>=1.6;
    $m('[data-pm-action="zoom-out"]').disabled=state.zoom<=.7;
  }
  function renderDetail() {
    const host=$m('#pm-detail');if(host){host.hidden=true;host.innerHTML='';}
  }
  function render() {
    reconcile();const list=matches();
    $m('.pm-workspace').classList.toggle('pm-library-collapsed',state.libraryCollapsed);
    $m('#pm-core-list').innerHTML=list.filter(m=>m.core).map(row).join('')||'<div class="pm-empty">暂无核心记忆</div>';
    $m('#pm-memory-list').innerHTML=list.filter(m=>!m.core).map(row).join('')||'<div class="pm-empty">暂无其他记忆</div>';
    $m('#pm-category-tabs').innerHTML=Object.entries(filterTabs).map(([id,label])=>`<button type="button" data-pm-category="${id}" class="${id===state.category?'active':''}" aria-pressed="${id===state.category}">${label}</button>`).join('');
    $m('[data-pm-action="clear-search"]').hidden=!state.search;
    renderGraph();renderDetail();renderPreview();
  }
  const dialog=$m('#pm-dialog');
  let draft=null,sourceScope=false,dialogEpoch=0;
  function showDialog(html) {dialogEpoch++;$m('#pm-dialog-content').innerHTML=html;dialog.showModal();}
  function closeDialog() {if(draft?.saving)return;draft=null;dialog.close();}
  function editor(isNew) {
    const m=isNew?{title:'',content:'',source:'',category:'project',core:false}:current();if(!m)return;
    draft={mode:'edit',id:isNew?null:m.id,attachments:(m.sourceFiles||[]).map(file=>({...file})),pending:[],statuses:[],busy:false,saving:false};
    showDialog(`<h3 id="pm-dialog-title">${isNew?'新建记忆':'修改记忆'}</h3><form id="pm-form" data-edit-id="${isNew?'':esc(m.id)}"><label class="pm-field">名称<input name="title" aria-label="记忆名称" required maxlength="80" value="${esc(m.title)}" placeholder="输入记忆名称"></label><label class="pm-field">分类<select name="category" aria-label="记忆分类">${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${id===m.category?'selected':''}>${label}</option>`).join('')}</select></label><label class="pm-field">文字内容<textarea name="content" aria-label="记忆内容" required placeholder="直接输入文字，或导入资料后检查、修改提取内容">${esc(m.content)}</textarea></label><div class="pm-editor-import"><div class="pm-editor-import-head"><strong>关联资料</strong><button type="button" class="pm-button" data-pm-action="import-in-editor">导入资料</button></div><div class="pm-editor-drop" data-pm-editor-drop hidden><button type="button" class="pm-button pm-primary" data-pm-action="choose-memory-files">选择文件</button><span>或拖入文件 · MD、TXT、文字版 PDF、DOCX、XLSX、CSV</span><input type="file" data-pm-file-input accept=".md,.txt,.pdf,.docx,.xlsx,.csv" multiple hidden></div><div data-pm-attachments></div><div data-pm-import-status role="status"></div></div><label class="pm-field">来源说明（选填）<input name="source" aria-label="记忆来源" maxlength="150" value="${esc(m.source)}" placeholder="可补充手动记录的来源"></label>${!isNew?`<details class="pm-editor-source-details"><summary>查看来源</summary><p>${esc(m.source||'手动添加')}</p>${(m.sourceFiles||[]).map(file=>`<div class="pm-editor-source-file"><button type="button" class="pm-button" data-pm-action="preview-editor-file" data-file-id="${esc(file.id)}">${esc(file.name)}</button><pre class="pm-source-content" hidden></pre></div>`).join('')}</details>`:''}<label class="pm-check"><input type="checkbox" name="core" ${m.core?'checked':''}>设为核心记忆</label><p id="pm-form-error" role="alert" hidden></p><div class="pm-dialog-actions"><button type="button" class="pm-button" data-pm-action="close-dialog">取消</button><button type="submit" class="pm-button pm-primary" data-pm-save>保存</button></div></form>`);
    renderAttachments();
  }
  function importDialog() {
    const m=current();if(!m)return;
    draft={mode:'import',id:m.id,attachments:(m.sourceFiles||[]).map(file=>({...file})),pending:[],statuses:[],busy:false,saving:false};
    showDialog(`<h3 id="pm-dialog-title">导入资料</h3><p class="pi-import-description">导入本地工作文件，保留原文件副本并提取文字；不会自动转成长期记忆。</p><form class="pm-import-form" id="pm-form" data-edit-id="${esc(m.id)}"><input type="hidden" name="title" value="${esc(m.title)}"><input type="hidden" name="category" value="${esc(m.category)}"><input type="hidden" name="source" value="${esc(m.source)}">${m.core?'<input type="hidden" name="core" value="on">':''}<div class="pi-dropzone" data-pm-editor-drop><span aria-hidden="true">＋</span><strong>拖入文件，或选择文件</strong><span>MD · TXT · PDF · DOCX · XLSX · CSV</span><button type="button" class="pm-button pm-primary" data-pm-action="choose-memory-files">选择文件</button><input type="file" data-pm-file-input accept=".md,.txt,.pdf,.docx,.xlsx,.csv" multiple hidden></div><p class="pi-import-hint">PDF 仅支持有文字层的文件；暂不支持扫描件、图片和音视频。</p><div data-pm-attachments></div><div data-pm-import-status role="status"></div><label class="pm-field" data-pm-import-preview hidden>导入内容预览<textarea name="content" aria-label="导入内容预览" required placeholder="选择文件后显示提取内容"></textarea></label><p id="pm-form-error" role="alert" hidden></p><p class="pi-storage-hint">资料保存在本浏览器，尚未写入系统设置中的存储目录或 AI 知识索引。</p><div class="pm-dialog-actions"><button type="button" class="pm-button" data-pm-action="close-dialog">取消</button><button type="submit" class="pm-button pm-primary" data-pm-save>导入</button></div></form>`);
    renderAttachments();
  }
  function renderAttachments() {
    if(!draft||!dialog.open)return;
    $m('[data-pm-attachments]').innerHTML=(draft.mode==='import'?draft.pending:draft.attachments).map(file=>`<div class="pm-editor-file"><div><strong>${esc(file.name)}</strong><small>${esc(file.ext.toUpperCase())} · ${phase2MemoryFiles.size(file.size)} · ${draft.pending.some(record=>record.id===file.id)?'待保存':'已关联'}</small></div><button type="button" class="pm-detail-close" data-pm-action="remove-memory-file" data-file-id="${esc(file.id)}" aria-label="移除来源：${esc(file.name)}" ${draft.busy||draft.saving?'disabled':''}>×</button></div>`).join('')||(draft.mode==='import'?'':'<div class="pm-editor-no-file">可直接填写文字，也可导入资料。</div>');
    $m('[data-pm-import-status]').innerHTML=draft.statuses.map(status=>`<div class="pm-editor-status ${status.failed?'error':''}">${esc(status.name)}：${esc(status.message)}</div>`).join('');
    const save=$m('[data-pm-save]');save.disabled=draft.busy||draft.saving||(draft.mode==='import'&&!draft.pending.length);save.textContent=draft.saving?'正在保存…':(draft.mode==='import'?'导入':'保存');
    const preview=$m('[data-pm-import-preview]');if(preview)preview.hidden=!draft.pending.length;
    const importButton=$m('[data-pm-action="import-in-editor"]');if(importButton)importButton.disabled=draft.busy||draft.saving;
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
  function sources(one=false) {
    draft=null;sourceScope=one;
    const list=one&&current()?[current()]:state.items;
    const grouped=[...new Set(list.map(m=>m.source||'手动添加'))];
    const files=[...new Map(list.flatMap(m=>(m.sourceFiles||[]).map(file=>[file.id,file]))).values()];
    showDialog(`<h3 id="pm-dialog-title">${one?'记忆来源':'来源列表'}</h3>${grouped.map(source=>`<div class="pm-source-row"><strong>${esc(source)}</strong><span>关联记忆：${esc(list.filter(m=>(m.source||'手动添加')===source).map(m=>m.title).join('、'))}</span></div>`).join('')||'<p>暂无来源</p>'}${files.map(file=>`<div class="pm-source-row pm-file-source"><div><strong>${esc(file.name)}</strong><span>关联记忆：${esc(list.filter(m=>m.sourceFiles?.some(record=>record.id===file.id)).map(m=>m.title).join('、'))}</span></div><button type="button" class="pm-button" data-pm-action="view-memory-file" data-file-id="${esc(file.id)}">查看资料内容</button></div>`).join('')}<div class="pm-dialog-actions"><button class="pm-button" type="button" data-pm-action="close-dialog">关闭</button></div>`);
  }
  async function viewSourceFile(id) {
    const title='来源资料';showDialog(`<h3 id="pm-dialog-title">${title}</h3><p>正在读取资料…</p>`);const epoch=dialogEpoch;
    try{
      const file=await phase2MemoryFiles.get(id);if(!file)throw new Error('来源文件不可用；记忆中的文字内容仍保留。');
      if(!dialog.open||epoch!==dialogEpoch)return;
      showDialog(`<h3 id="pm-dialog-title">${esc(file.name)}</h3><p>${esc(file.note)}</p><pre class="pm-source-content">${esc(file.content)}</pre><div class="pm-dialog-actions"><button type="button" class="pm-button" data-pm-action="back-to-sources">返回来源</button><button type="button" class="pm-button" data-pm-action="close-dialog">关闭</button></div>`);
    }catch(error){if(dialog.open&&epoch===dialogEpoch)showDialog(`<h3 id="pm-dialog-title">${title}</h3><p>${esc(error.message)}</p><div class="pm-dialog-actions"><button type="button" class="pm-button" data-pm-action="back-to-sources">返回来源</button><button type="button" class="pm-button" data-pm-action="close-dialog">关闭</button></div>`);}
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
  root.addEventListener('input',e=>{if(!e.target.matches('[data-pm-search]'))return;state.search=e.target.value.trim();$m('#pm-search').value=e.target.value;state.detailOpen=false;render();});
  root.addEventListener('click',e=>{
    const selection=e.target.closest('[data-pm-select]');if(selection){choose(selection.dataset.pmSelect,false);return;}
    const entity=e.target.closest('[data-pm-entity]');if(entity){const m=matches().find(m=>m.related.includes(entity.dataset.pmEntity));if(m)choose(m.id);return;}
    const cat=e.target.closest('[data-pm-category]');if(cat){if(Object.hasOwn(filterTabs,cat.dataset.pmCategory)){state.category=cat.dataset.pmCategory;state.detailOpen=false;render();}return;}
    const button=e.target.closest('[data-pm-action]');if(!button)return;
    if(button.dataset.memoryId)choose(button.dataset.memoryId,false);
    switch(button.dataset.pmAction){
      case 'memory-sources':window.dispatchEvent(new CustomEvent('agentpc:memory-source-list',{detail:{items:state.items,trigger:button}}));break;
      case 'new':editor(true);break;case 'edit':editor(false);break;case 'import':importDialog();break;
      case 'sources':sources();break;case 'source':sources(true);break;
      case 'collapse-library':state.libraryCollapsed=true;render();$m('[data-pm-action="expand-library"]').focus();break;
      case 'expand-library':state.libraryCollapsed=false;render();$m('[data-pm-action="collapse-library"]').focus();break;
      case 'preview-editor-file':previewEditorFile(button);break;
      case 'import-in-editor':$m('[data-pm-editor-drop]').hidden=false;$m('[data-pm-action="choose-memory-files"]').focus();break;
      case 'choose-memory-files':$m('[data-pm-file-input]').click();break;
      case 'remove-memory-file':if(draft&&!draft.busy&&!draft.saving){draft.attachments=draft.attachments.filter(file=>file.id!==button.dataset.fileId);draft.pending=draft.pending.filter(file=>file.id!==button.dataset.fileId);draft.statuses=[{name:'来源已移除',message:'文字内容保留，可自行修改。'}];renderAttachments();}break;
      case 'view-memory-file':viewSourceFile(button.dataset.fileId);break;
      case 'back-to-sources':sources(sourceScope);break;
      case 'close-dialog':closeDialog();break;
      case 'close-detail':state.detailOpen=false;renderDetail();break;
      case 'clear-search':state.search='';$m('#pm-search').value='';render();$m('#pm-search').focus();break;
      case 'toggle-preview':state.preview=!state.preview;persist();renderPreview();break;
      case 'zoom-in':state.zoom=Math.min(1.6,+(state.zoom+.15).toFixed(2));renderGraph();break;
      case 'zoom-out':state.zoom=Math.max(.7,+(state.zoom-.15).toFixed(2));renderGraph();break;
      case 'reset-zoom':state.zoom=1;renderGraph();break;
      case 'delete':{const m=current();if(m)showDialog(`<h3 id="pm-dialog-title">删除记忆</h3><p>${esc(m.title)}</p><div class="pm-dialog-actions"><button class="pm-button" type="button" data-pm-action="close-dialog">取消</button><button class="pm-button pm-primary" type="button" data-pm-action="confirm-delete" data-delete-id="${esc(m.id)}">确认删除</button></div>`);break;}
      case 'confirm-delete':{const items=state.items.filter(m=>m.id!==button.dataset.deleteId);try{phase2Storage.setItem('memory-demo-v1',JSON.stringify({items,selected:null,preview:state.preview}));state.items=items;reconcile();closeDialog();render();memoryChanged();notice('记忆已删除。');}catch(_){notice('删除失败，本地存储不可用。记忆已保留。');}break;}
    }
  });
  root.addEventListener('keydown',e=>{const node=e.target.closest('.pm-graph-node');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  root.addEventListener('change',e=>{if(e.target.matches('[data-pm-file-input]')){const files=[...e.target.files];e.target.value='';importIntoMemory(files);}});
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
    const active=draft;active.saving=true;renderAttachments();
    e.target.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);
    try{
      await phase2MemoryFiles.commit(active.pending);
      const sourceFiles=active.attachments.map(({id,key,name,ext,size,note})=>({id,key,name,ext,size,note}));
      const priorFileNames=(previous?.sourceFiles||[]).map(file=>file.name);
      const related=[...new Set([...(previous?.related||[]).filter(name=>!priorFileNames.includes(name)),...sourceFiles.map(file=>file.name)])];
      const m={reviewStatus:'confirmed',id:previous?.id||'m-'+crypto.randomUUID(),title,content:active.mode==='import'?`${previous.content.trimEnd()}\n\n${content}`:content,category:String(data.get('category')),source:String(data.get('source')).trim()||(sourceFiles.length?'导入资料':'手动添加'),sourceFiles,core:data.get('core')==='on',related,updated:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date())};
      const items=previous?state.items.map(x=>x.id===m.id?m:x):[m,...state.items];
      phase2Storage.setItem('memory-demo-v1',JSON.stringify({items,selected:m.id,preview:state.preview}));
      state.items=items;
    state.search='';$m('#pm-search').value='';state.category='all';state.selected=m.id;state.detailOpen=false;
      active.saving=false;closeDialog();render();memoryChanged();notice(active.mode==='import'?'已补充到当前记忆，原内容保留。':(previous?'记忆已修改。':'记忆已保存。'));
    }catch(error){active.saving=false;e.target.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);renderAttachments();$m('[data-pm-action="close-dialog"]').disabled=false;$m('#pm-form-error').hidden=false;$m('#pm-form-error').textContent=/[\u4e00-\u9fff]/.test(error.message)?error.message:'保存失败，本地存储空间不足或不可用。输入内容已保留。';}
  });
  dialog.addEventListener('cancel',e=>{if(draft?.saving)e.preventDefault();else draft=null;});
  dialog.addEventListener('close',()=>{draft=null;});
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
      if(!object(item)||!nonempty(item.id)||ids.has(item.id)||typeof item.title!=='string'||typeof item.content!=='string'||typeof item.category!=='string'||!Object.hasOwn(categories,item.category)||!Array.isArray(item.related)||!item.related.every(name=>typeof name==='string'))invalid();
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
    return {items:normalized.items,selected:ids.has(normalized.selected)?normalized.selected:(normalized.items[0]?.id||null),preview:true};
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
      if(dialog.open)closeDialog();
      state.items=normalized.items;state.selected=normalized.selected;state.preview=true;
      state.search='';state.category='all';state.detailOpen=false;$m('#pm-search').value='';
      render();memoryChanged();
      return snapshot();
    }
  };
  render();if(storageWarning)notice('原型存储读取失败，当前展示演示数据。');
  new ResizeObserver(()=>{if($m('#pm-graph').clientWidth>0)renderGraph();}).observe($m('#pm-graph'));
  if(new URLSearchParams(location.search).get('page')==='memory')setActiveTab('memory');
})();
