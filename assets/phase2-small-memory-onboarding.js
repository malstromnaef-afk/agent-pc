/* Local chat imports are saved to the prototype memory library. CLI sessions are illustrative. */
(() => {
  const root = document.querySelector('#memory');
  if (!root) return;
  const key = 'memory-source-consent-ui-v1';
  const asset = name => `assets/memory-source-figma/${name}`;
  const image = (name, width, height, className = '') => `<img class="${className}" src="${asset(name)}" width="${width}" height="${height}" alt="" aria-hidden="true">`;
  const empty = () => ({authorized:false, conversation:false, files:false,  folder:'',});
  const clone = value => ({...value});
  let saved = empty(), draft = empty(), shownThisVisit = false, busy = false, previousFocus;
  let agentDraft = ['workbuddy','trae'];
  try {
    const value = JSON.parse(phase2Storage.getItem(key) || 'null');
    if (value && typeof value === 'object') {
      const authorized = value.authorized === true;
      saved = {
        authorized,
        conversation:typeof value.conversation === 'boolean' ? value.conversation : authorized,
        files:typeof value.files === 'boolean' ? value.files : authorized,
        folder:typeof value.folder === 'string' ? value.folder : '',
      };
    }
  } catch (_) {}
  const sources = {
    conversation:['Agent对话记忆','记住工作背景与偏好','conversation.svg'],
    files:['文件记忆','从指定资料中形成记忆','folder.svg']
  };
  const apps = [['feishu','飞书','feishu.png'],['dingtalk','钉钉','dingtalk.png'],['wecom','企业微信','wecom.png'],['wechat','个人微信','wechat.png']];
  const agents = [['workbuddy','WorkBuddy','workbuddy.png'],['trae','TRAE IDE 国内版','trae-cn.png'],['codex','Codex','codex.png']];
  function makeDialog(id, titleId, className, html) {
    const dialog = document.createElement('dialog');
    dialog.id = id; dialog.className = `pmo-onboarding ${className}`;
    dialog.setAttribute('aria-labelledby',titleId);
    dialog.innerHTML = html; document.body.append(dialog);
    return dialog;
  }
  const closeButton = label => `<button type="button" class="pmo-close" data-pmo-close aria-label="${label}">${image('close.svg',24,24)}</button>`;
  const main = makeDialog('pmo-onboarding','pmo-title','pmo-main',`<div class="pmo-source-form">${closeButton('关闭开启长期记忆')}
    <header><h2 id="pmo-title" tabindex="-1">开启长期记忆</h2><p>记住工作背景与偏好，减少重复说明。</p></header>
    <div class="pmo-source-list">${Object.entries(sources).map(([id,[title,description,icon]]) => `<section class="pmo-source">
      <div class="pmo-source-main"><span class="pmo-source-icon">${image(icon,36,36)}</span><div class="pmo-source-copy"><strong id="pmo-label-${id}">${title}</strong><p>${description}</p></div>${id === 'files' ? '<button type="button" class="pmo-range-action" id="pmo-folder-choose" hidden>选择文件夹</button>' : ''}<button type="button" class="pmo-switch" role="switch" aria-checked="false" aria-labelledby="pmo-label-${id}" data-pmo-source="${id}">${image('switch-off.svg',58,32,'pmo-switch-off')}<span class="pmo-switch-on" aria-hidden="true"></span></button></div>
      ${id === 'files' ? '<div class="pmo-source-config" data-pmo-config="files" hidden><input type="file" id="pmo-folder-input" webkitdirectory multiple hidden><span class="pmo-folder-name" id="pmo-folder-name"></span></div>' : ''}</section>`).join('')}</div>
    <div class="pmo-external-list">
      <button type="button" class="pmo-external-entry" id="pmo-open-im"><span class="pmo-source-icon">${image('im.svg',36,36)}</span><span class="pmo-source-copy"><strong>即时通讯记忆</strong><span>飞书、钉钉、企业微信</span></span>${image('chevron.svg',20,20,'pmo-entry-arrow')}</button>
      <button type="button" class="pmo-external-entry" id="pmo-open-agents"><span class="pmo-source-icon">${image('agent.svg',36,36)}</span><span class="pmo-source-copy"><strong>第三方 Agent 记忆</strong><span>WorkBuddy、TRAE IDE 国内版、Codex</span></span>${image('chevron.svg',20,20,'pmo-entry-arrow')}</button>
    </div>
    <p class="pmo-onboarding-error" id="pmo-error" role="alert" hidden></p>
    <footer class="pmo-main-footer"><button type="button" class="pmo-submit" id="pmo-submit" disabled>开启所选记忆</button><button type="button" class="pmo-later" id="pmo-later">以后</button></footer></div>`);
  const im = makeDialog('pmo-im','pmo-im-title','pmo-im',`${closeButton('返回记忆来源')}
    <div id="pmo-im-content"></div>`);
  const imContent = im.querySelector('#pmo-im-content');
  let imStep = 'home', imApp, imDraft = '';
  function renderIm(step) {
    imStep = step;
    im.setAttribute('aria-labelledby', 'pmo-im-title');
    const heading = (title, description = '') => `<header><div class="pmo-im-heading">${step === 'home' ? '' : '<button type="button" class="pmo-back" data-pmo-im-home>‹ 返回</button>'}<h2 id="pmo-im-title" tabindex="-1">${title}</h2></div>${description ? `<p>${description}</p>` : ''}</header>`;
    const actions = `<p class="pmo-onboarding-error" id="pmo-im-error" role="alert" hidden></p><div class="pmo-agent-actions"><button type="button" class="pmo-cancel" data-pmo-im-home>取消</button><button type="submit" class="pmo-submit" disabled>确定</button></div>`;
    if (step === 'home') {
      imContent.innerHTML = heading('即时通讯记忆','选择会话或导入聊天内容，整理成可查找的记忆。') + `<div class="pmo-app-list">${apps.map(([id,name,icon]) => `<section class="pmo-app-row"><span class="pmo-app-icon">${image(icon,62,62)}</span><div class="pmo-app-copy"><strong>${name}</strong>${window.phase2SmallMemoryPreview?.hasChat(name) ? '<span>已保存聊天记忆</span>' : id === 'wechat' ? '' : '<span>● 未连接</span>'}</div><button type="button" class="pmo-connect" data-pmo-connect="${id}" aria-label="${name} ${id === 'wechat' ? '导入聊天' : '连接 CLI'}">${id === 'wechat' ? '导入聊天' : '连接 CLI'}</button></section>`).join('')}</div>`;
    } else if (step === 'import') {
      imContent.innerHTML = heading(`导入${imApp[1]}聊天`) + `<form class="pmo-im-form"><label>聊天原文<textarea name="chat" rows="5" placeholder="粘贴聊天原文"></textarea></label><label>上传 TXT / JSON<input type="file" accept=".txt,.json" name="chat-file"></label>${actions}</form>`;
      imContent.querySelector('textarea').value = imDraft;
    } else {
      const isFeishu = imApp[0] === 'feishu';
      const chats = isFeishu ? [['产品研发群','群聊'],['项目交付群','群聊'],['李明','单聊']] : [['产品研发群',''],['项目交付群','']];
      imContent.innerHTML = heading(`选择${imApp[1]}${isFeishu ? '会话' : '群聊'}`,isFeishu ? '选择一项，导入该单聊或群聊的聊天记录。' : '选择一个群聊，导入该群的聊天记录。') + `<form class="pmo-im-form"><input type="search" name="search" aria-label="搜索会话" placeholder="${isFeishu ? '输入联系人或群名' : '输入群名'}"><div class="pmo-im-chats">${chats.map(([name,type]) => `<label><input type="radio" name="chat-group" value="${name}"> ${name}${type ? ` <small>${type}</small>` : ''}</label>`).join('')}</div><div data-pmo-empty role="status" hidden>没有匹配的会话</div><label>历史消息<select name="days"><option value="30">近 30 天</option><option value="7">近 7 天</option><option value="1">近 1 天</option></select></label><button type="button" class="pmo-back" data-pmo-im-import>手动导入</button>${actions}</form>`;
    }
    if (im.open) imContent.querySelector('h2').focus({preventScroll:true});
  }
  const agent = makeDialog('pmo-agents','pmo-agents-title','pmo-agents',`${closeButton('返回记忆来源')}
    <header><h2 id="pmo-agents-title" tabindex="-1">导入第三方 Agent</h2><p>选择应用，授权后自动导入已有记忆。</p></header>
    <div class="pmo-agent-list">${agents.map(([id,name,icon]) => `<label class="pmo-agent-row"><span class="pmo-checkbox"><input type="checkbox" value="${id}" data-pmo-agent aria-label="${name}">${image('check.svg',23,23,'pmo-checkbox-check')}</span><span class="pmo-app-icon">${image(icon,62,62)}</span><span class="pmo-agent-copy"><strong>${name}</strong><span>本地记忆</span></span></label>`).join('')}</div>
    <footer class="pmo-agent-footer"><div class="pmo-import-note">${image('info.svg',23,23)}<span>仅读取所选应用的本地记忆，不修改原文件。</span></div><p class="pmo-onboarding-error" id="pmo-agent-error" role="alert" hidden></p><div class="pmo-agent-actions"><button type="button" class="pmo-cancel" data-pmo-close>取消</button><button type="button" class="pmo-submit" id="pmo-agent-import">授权并导入</button></div></footer>`);
  const dialogs = [main,im,agent];
  const form = main.querySelector('.pmo-source-form');
  const settingsRoot = document.querySelector('#screen-config');
  const settingsPanel = document.querySelector('#p2-settings-memory');
  const inlineHost = document.querySelector('#p2-local-memory-content');
  let context = 'modal';
  const $ = selector => form.querySelector(selector);
  function setError(dialog, id, message = '') {
    const box = (dialog === main ? form : dialog).querySelector(id); box.textContent = message; box.hidden = !message;
  }
  function saveInline() {
    if(context !== 'settings')return true;
    const feedback = document.querySelector('#p2-local-memory-feedback');
    try {
      const next = {...clone(draft),authorized:Object.keys(sources).some(id => draft[id])};
      phase2Storage.setItem(key,JSON.stringify(next));saved = next;
      setError(main,'#pmo-error');
      if(feedback){feedback.hidden = false;feedback.textContent = '已自动保存。';}
      return true;
    }catch(_){
      draft = clone(saved);renderMain();
      if(feedback)feedback.hidden = true;
      setError(main,'#pmo-error','保存失败，本次修改未生效，请重试。');
      return false;
    }
  }
  function renderMain() {
    form.querySelectorAll('[data-pmo-source]').forEach(button => button.setAttribute('aria-checked',String(draft[button.dataset.pmoSource])));
    $('#pmo-title').textContent = context === 'settings' ? '本地记忆' : '开启长期记忆';
    $('.pmo-main-footer').hidden = context === 'settings';
    $('#pmo-folder-choose').hidden = !draft.files;
    $('[data-pmo-config="files"]').hidden = !draft.files || !draft.folder;
    $('#pmo-folder-name').textContent = draft.folder;
    $('#pmo-folder-name').hidden = !draft.folder;
    $('#pmo-submit').disabled = busy || (context !== 'settings' && !saved.authorized && !Object.keys(sources).some(id => draft[id]));
    if(!busy)$('#pmo-submit').textContent = context === 'settings' || saved.authorized ? '保存' : '开启所选记忆';
  }

  function present(dialog) {
    dialogs.forEach(other => { if(other !== dialog && other.open)other.close(); });
    if(!dialog.open)dialog.showModal();
    dialog.querySelector('h2').focus({preventScroll:true});
  }
  function open() {
    if(dialogs.some(dialog => dialog.open) || document.querySelector('dialog[open]'))return;
    context = 'modal';main.append(form);
    previousFocus = document.activeElement; draft = clone(saved);

    renderMain(); setError(main,'#pmo-error'); present(main); shownThisVisit = true;
  }
  function closeAll() {
    if(busy)return;
    dialogs.forEach(dialog => {if(dialog.open)dialog.close();});
    previousFocus?.focus?.({preventScroll:true});
  }
  function back(dialog) {
    if(busy)return;
    dialog.close(); renderMain(); if(context !== 'settings')present(main);
    $(dialog === im ? '#pmo-open-im' : '#pmo-open-agents').focus({preventScroll:true});
  }
  function syncPlacement() {
    const showInline = inlineHost && settingsRoot?.classList.contains('active') && settingsPanel?.classList.contains('active');
    if(showInline && context !== 'settings'){
      if(busy)return;
      dialogs.forEach(dialog=>{if(dialog.open)dialog.close();});
      context = 'settings';previousFocus = null;inlineHost.append(form);draft = clone(saved);

      renderMain();setError(main,'#pmo-error');
      const feedback=document.querySelector('#p2-local-memory-feedback');if(feedback)feedback.hidden=true;
    }else if(!showInline && context === 'settings'){
      if(busy)return;
      closeAll();context = 'modal';main.append(form);draft = clone(saved);renderMain();
    }
  }
  function renderAgents() {
    agent.querySelectorAll('[data-pmo-agent]').forEach(input => {
      input.checked = agentDraft.includes(input.value);
      input.closest('.pmo-agent-row').classList.toggle('is-selected',input.checked);
    });
    agent.querySelector('#pmo-agent-import').disabled = busy || !agentDraft.length;
  }
  root.addEventListener('click',event => {if(event.target.closest('[data-pm-action="memory-source-settings"]'))open();});
  form.addEventListener('click',event => {
    const source = event.target.closest('[data-pmo-source]');
    if(source && !busy){draft[source.dataset.pmoSource] = !draft[source.dataset.pmoSource];renderMain();setError(main,'#pmo-error');saveInline();}
    if(event.target.closest('[data-pmo-close], #pmo-later'))closeAll();
  });
  $('#pmo-open-im').addEventListener('click',() => {renderIm('home');present(im);});
  $('#pmo-open-agents').addEventListener('click',() => {agentDraft = ['workbuddy','trae'];setError(agent,'#pmo-agent-error');renderAgents();present(agent);});
  [im,agent].forEach(dialog => dialog.addEventListener('click',event => {if(event.target.closest('[data-pmo-close]'))back(dialog);}));
  dialogs.forEach(dialog => {
    dialog.addEventListener('cancel',event => {event.preventDefault();if(dialog === main)closeAll();else back(dialog);});
    dialog.addEventListener('click',event => {
      if(event.target !== dialog)return;
      const rect = dialog.getBoundingClientRect();
      if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom){if(dialog === main)closeAll();else back(dialog);}
    });
  });
  $('#pmo-folder-choose').addEventListener('click',() => $('#pmo-folder-input').click());
  $('#pmo-folder-input').addEventListener('change',event => {
    const file = event.target.files[0];if(!file)return;
    draft.folder = (file.webkitRelativePath || file.name).split('/')[0];event.target.value = '';renderMain();setError(main,'#pmo-error');saveInline();
  });
  $('#pmo-submit').addEventListener('click',async () => {
    if(context === 'settings' || busy || (!saved.authorized && !Object.keys(sources).some(id => draft[id])))return;
    busy = true; $('#pmo-submit').textContent = '正在保存…';
    form.querySelectorAll('button,input').forEach(control => control.disabled = true);
    try {
      await Promise.resolve();
      const next = {...clone(draft),authorized:Object.keys(sources).some(id => draft[id])};
      phase2Storage.setItem(key,JSON.stringify(next));saved = next;
      busy = false;if(context !== 'settings')closeAll();
      const box = context === 'settings' ? document.querySelector('#p2-local-memory-feedback') : root.querySelector('.pm-preview[data-subscreen-preview="memory"] #pm-feedback');
      if(box){box.hidden = false;box.textContent = context === 'settings' ? '记忆来源设置已保存。' : '已保存记忆来源设置（原型）；未进行内容采集或记忆提取。';}
    }catch(_){setError(main,'#pmo-error','保存失败，请重试。');}
    finally{busy = false;form.querySelectorAll('button,input').forEach(control => control.disabled = false);renderMain();}
  });
  im.addEventListener('click',event => {
    const button = event.target.closest('[data-pmo-connect]');
    if (button) {
      imApp = apps.find(([id]) => id === button.dataset.pmoConnect);
      imDraft = '';
      renderIm(imApp[0] === 'wechat' ? 'import' : 'select');
    }
    if (event.target.closest('[data-pmo-im-home]')) renderIm('home');
    if (event.target.closest('[data-pmo-im-import]')) renderIm('import');
  });
  function updateImConfirm() {
    const submit = imContent.querySelector('[type="submit"]');
    if (submit) submit.disabled = imStep === 'import' ? !imDraft.trim() : !imContent.querySelector('.pmo-im-chats label:not([hidden]) input:checked');
  }
  im.addEventListener('input', event => {
    if (event.target.name === 'chat') imDraft = event.target.value;
    if (event.target.name === 'search') {
      const query = event.target.value.trim().toLocaleLowerCase();
      const rows = [...imContent.querySelectorAll('.pmo-im-chats label')];
      for (const row of rows) row.hidden = !row.querySelector('input').value.toLocaleLowerCase().includes(query);
      imContent.querySelector('[data-pmo-empty]').hidden = rows.some(row => !row.hidden);
    }
    updateImConfirm();
  });
  im.addEventListener('change', async event => {
    if (event.target.name !== 'chat-file') { updateImConfirm(); return; }
    const file = event.target.files[0];
    if (!file) return;
    const field = imContent.querySelector('textarea');
    try {
      if (!/\.(txt|json)$/i.test(file.name)) throw new Error('请选择 TXT 或 JSON 文件。');
      const text = await file.text();
      if (!field.isConnected) return;
      if (/\.json$/i.test(file.name)) {
        try { JSON.parse(text); } catch (_) { throw new Error('JSON 格式无效，请检查文件。'); }
      }
      if (!text.trim()) throw new Error('文件没有聊天内容。');
      field.value = imDraft = text;
      setError(im,'#pmo-im-error');
    } catch (error) {
      if (field.isConnected) setError(im,'#pmo-im-error',error.message || '无法读取文件。');
    } finally {
      if (field.isConnected) { event.target.value = ''; updateImConfirm(); }
    }
  });
  im.addEventListener('submit', event => {
    event.preventDefault();
    if (imStep === 'select') {
      renderIm('home');
      return;
    }
    if (!imDraft.trim()) return;
    try {
      window.phase2SmallMemoryPreview.importChat(imApp[1],imDraft.trim());
      imDraft = '';
      renderIm('home');
    } catch (_) {
      setError(im,'#pmo-im-error','保存失败，请重试。');
    }
  });
  agent.addEventListener('change',event => {
    if(!event.target.matches('[data-pmo-agent]'))return;
    agentDraft = [...agent.querySelectorAll('[data-pmo-agent]:checked')].map(input => input.value);
    renderAgents();setError(agent,'#pmo-agent-error');
  });
  agent.querySelector('#pmo-agent-import').addEventListener('click',() => {
    if(!agentDraft.length)return;
    setError(agent,'#pmo-agent-error','当前为交互原型，尚未接入本地记忆导入；未读取或导入任何应用数据。');
  });
  function firstEntry() {
    if(!root.classList.contains('active')){shownThisVisit = false;if(context !== 'settings' && dialogs.some(dialog => dialog.open))closeAll();return;}
    if(!shownThisVisit)open();
  }
  new MutationObserver(()=>{syncPlacement();firstEntry();}).observe(root,{attributes:true,attributeFilter:['class']});
  if(settingsRoot)new MutationObserver(syncPlacement).observe(settingsRoot,{attributes:true,attributeFilter:['class']});
  if(settingsPanel)new MutationObserver(syncPlacement).observe(settingsPanel,{attributes:true,attributeFilter:['class']});
  requestAnimationFrame(()=>{syncPlacement();firstEntry();});
})();
