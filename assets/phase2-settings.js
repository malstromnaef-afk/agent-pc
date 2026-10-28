/* UI prototype: preferences only; no global pointer detection, screen capture, directory migration, or executable invocation. */
(() => {
  const root=document.querySelector('#screen-config');
  if(!root)return;
  const key='system-settings-ui-v2';
  const names={wechat:'微信',feishu:'飞书',dingtalk:'钉钉',wecom:'企业微信'};
  const defaultCaptureShortcut='Ctrl + Alt + S';
  const defaultPointerShortcut='Alt + G';
  const shortcutPattern=/^(?:(?:Ctrl(?: \+ Alt)?|Alt)(?: \+ Shift)?) \+ [A-Z0-9]$/;
  const validRegion=region=>region&&['x','y','width','height'].every(field=>Number.isFinite(region[field]))&&region.x>=0&&region.x<1&&region.y>=0&&region.y<1&&region.width>0&&region.height>0&&region.x+region.width<=1.000001&&region.y+region.height<=1.000001?{x:region.x,y:region.y,width:Math.min(region.width,1-region.x),height:Math.min(region.height,1-region.y)}:null;
  let state={interfaceLanguage:'zh-CN',preferBuiltInModel:true,builtInModel:'gemma3:12b',magicPointerEnabled:false,magicPointerShakeEnabled:true,magicPointerSensitivity:50,magicPointerShortcut:defaultPointerShortcut,captureShortcut:defaultCaptureShortcut,screenRange:'display',screenRegion:null,screenEnabled:false,screenPaused:false,displays:[],memoryPath:'%LOCALAPPDATA%\\AgentPC\\本地记忆',cliPaths:{},screenConsent:''};
  try{
    const saved=JSON.parse(phase2Storage.getItem(key)||'null');
    if(saved&&typeof saved==='object'){
      if(saved.interfaceLanguage==='zh-CN')state.interfaceLanguage=saved.interfaceLanguage;
      if(typeof saved.preferBuiltInModel==='boolean')state.preferBuiltInModel=saved.preferBuiltInModel;
      if(saved.builtInModel==='gemma3:12b')state.builtInModel=saved.builtInModel;
      if(saved.screenRange==='region')state.screenRange='region';
      state.screenRegion=validRegion(saved.screenRegion);
      state.magicPointerEnabled=saved.magicPointerEnabled===true;
      if(typeof saved.magicPointerShakeEnabled==='boolean')state.magicPointerShakeEnabled=saved.magicPointerShakeEnabled;
      if(typeof saved.magicPointerShortcut==='string'&&shortcutPattern.test(saved.magicPointerShortcut))state.magicPointerShortcut=saved.magicPointerShortcut;
      if(typeof saved.magicPointerSensitivity==='number'&&Number.isFinite(saved.magicPointerSensitivity))state.magicPointerSensitivity=Math.max(0,Math.min(100,Math.round(saved.magicPointerSensitivity)));
      if(typeof saved.captureShortcut==='string'&&shortcutPattern.test(saved.captureShortcut))state.captureShortcut=saved.captureShortcut;
      state.screenEnabled=saved.screenEnabled===true;
      state.screenPaused=state.screenEnabled&&saved.screenPaused===true;
      state.screenConsent=['granted','deferred'].includes(saved.screenConsent)?saved.screenConsent:'';
      const previous=Array.isArray(saved.displays)?saved.displays:[saved.display];
      state.displays=[...new Set(previous.filter(id=>['external','builtin'].includes(id)))].slice(0,2);
      if(state.screenEnabled&&state.screenRange==='display'&&!state.displays.length){state.screenEnabled=false;state.screenPaused=false;}
      if(!state.screenConsent&&state.screenEnabled&&state.displays.length)state.screenConsent='granted';
      if(typeof saved.memoryPath==='string'&&saved.memoryPath.trim())state.memoryPath=saved.memoryPath;
      for(const app of Object.keys(names))if(typeof saved.cliPaths?.[app]==='string')state.cliPaths[app]=saved.cliPaths[app];
    }
  }catch(_){}
  if(state.memoryPath==='%LOCALAPPDATA%\\AgentPC\\Memory')state.memoryPath='%LOCALAPPDATA%\\AgentPC\\本地记忆';
  const q=selector=>root.querySelector(selector);
  let feedbackTimer,activeCli='',recordingShortcut='';
  function feedback(text){const box=q('#p2-settings-memory')?.classList.contains('active')?q('#p2-local-settings-feedback'):q('#p2-system-feedback');box.textContent=text;box.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>box.hidden=true,2800);}
  function update(next){
    try{phase2Storage.setItem(key,JSON.stringify(next));state=next;render();return true;}
    catch(_){render();feedback('无法记录本次修改，请重试。');return false;}
  }
  function render(){
    q('#p2-interface-language').value=state.interfaceLanguage;
    const pointer=q('#p2-pointer-toggle'),sensitivity=q('#p2-pointer-sensitivity');
    pointer.classList.toggle('off',!state.magicPointerEnabled);pointer.setAttribute('aria-pressed',String(state.magicPointerEnabled));pointer.setAttribute('aria-label',state.magicPointerEnabled?'关闭魔法指针':'开启魔法指针');
    q('#p2-pointer-state').textContent=state.magicPointerEnabled?'开启':'关闭';
    const shake=q('#p2-pointer-shake-toggle');
    shake.classList.toggle('off',!state.magicPointerShakeEnabled);shake.setAttribute('aria-pressed',String(state.magicPointerShakeEnabled));shake.setAttribute('aria-label',state.magicPointerShakeEnabled?'关闭晃动唤起':'开启晃动唤起');shake.disabled=!state.magicPointerEnabled;
    q('#p2-pointer-shake-state').textContent=state.magicPointerShakeEnabled?'开启':'关闭';
    sensitivity.value=state.magicPointerSensitivity;sensitivity.disabled=!state.magicPointerEnabled||!state.magicPointerShakeEnabled;sensitivity.title=!state.magicPointerEnabled?'开启魔法指针后可调整':!state.magicPointerShakeEnabled?'开启晃动唤起后可调整':'调整晃动唤起的灵敏度';sensitivity.style.setProperty('--pointer-progress',state.magicPointerSensitivity+'%');sensitivity.closest('.p2-slider-control').classList.toggle('is-reference',sensitivity.disabled&&state.magicPointerSensitivity===50);
    renderShortcut();
    const toggle=q('#p2-screen-toggle');toggle.classList.toggle('off',!state.screenEnabled);toggle.setAttribute('aria-pressed',String(state.screenEnabled));toggle.setAttribute('aria-label',state.screenEnabled?'关闭自动读屏':'开启自动读屏');
    q('#p2-screen-state').textContent=state.screenEnabled?(state.screenPaused?'已暂停':'开启'):'关闭';
    q('#p2-screen-range-options').hidden=!state.screenEnabled;
    root.querySelectorAll('[name="p2-screen-range"]').forEach(input=>input.checked=input.value===state.screenRange);
    q('#p2-display-select').hidden=state.screenRange!=='display';
    q('#p2-region-shortcut').hidden=state.screenRange!=='region';
    q('#p2-region-usage').hidden=state.screenRange!=='region';
    q('#p2-region-usage').textContent='按快捷键开始框选，点击组合键可修改；Mac 使用 '+state.captureShortcut.replace('Ctrl','Control').replace('Alt','Option')+'。';
    q('#p2-display-select').querySelectorAll('[data-p2-display]').forEach(input=>{input.checked=state.displays.includes(input.value);input.disabled=!state.screenEnabled||state.screenRange!=='display'||(!input.checked&&state.displays.length>=2);});
    q('#p2-memory-path').textContent='本地主机';
    q('#p2-memory-path').title='记忆保存在本地主机';
    const localToggle=q('#p2-local-model-toggle');
    localToggle.classList.toggle('off',!state.preferBuiltInModel);localToggle.setAttribute('aria-pressed',String(state.preferBuiltInModel));localToggle.setAttribute('aria-label',state.preferBuiltInModel?'关闭优先使用内置模型':'开启优先使用内置模型');
    q('#p2-local-model-usage').textContent=state.preferBuiltInModel?'6个功能正在使用':'已关闭优先使用';
    const shakeImage=shake.querySelector('.p2-toggle-on');shakeImage.src=state.magicPointerEnabled?'assets/settings-figma/a3f5c.svg':'assets/settings-figma/f6f62.svg';
    window.dispatchEvent(new CustomEvent('agentpc:screen-settings',{detail:{...state}}));
  }
  function renderShortcut(){
    for(const [kind,field,label,enabled] of [
      ['capture','captureShortcut','框选',state.screenEnabled&&state.screenRange==='region'],
      ['pointer','magicPointerShortcut','魔法指针',state.magicPointerEnabled]
    ]){
      const button=q('#p2-'+kind+'-shortcut'),recording=recordingShortcut===kind;
      button.textContent=recording?'请按组合键':state[field];
      button.classList.toggle('is-recording',recording);
      button.setAttribute('aria-label',recording?'正在设置'+label+'快捷键':'修改'+label+'快捷键，当前为 '+state[field]);
      button.disabled=!enabled;
      q('#p2-'+kind+'-shortcut-help').hidden=!recording;
    }
    const exitShortcut=q('#p2-pointer-exit-shortcut');
    exitShortcut.textContent=state.magicPointerShortcut;
    exitShortcut.setAttribute('aria-label','退出魔法指针快捷键 '+state.magicPointerShortcut);
    window.dispatchEvent(new CustomEvent('agentpc:shortcut-recording',{detail:{active:Boolean(recordingShortcut),kind:recordingShortcut}}));
  }
  function cancelShortcut(){if(recordingShortcut){recordingShortcut='';renderShortcut();}}
  function beginShortcut(kind){recordingShortcut=kind;q('#p2-'+kind+'-shortcut-help').textContent='按 Ctrl／Alt 与字母或数字组合，Esc 取消。';renderShortcut();q('#p2-'+kind+'-shortcut').focus();}
  function clearDialog(dialog){const box=dialog.querySelector('[data-p2-dialog-feedback]');box.hidden=true;box.textContent='';}
  function selectScreenRange(range){
    if(!state.screenEnabled||!['display','region'].includes(range))return;
    cancelShortcut();
    if(range===state.screenRange){render();return;}
    if(range==='region')update({...state,screenRange:'region'});
    else update({...state,screenRange:'display',displays:state.displays.length?[...state.displays]:['external'],screenPaused:false,screenConsent:'granted'});
  }
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-phase2-setting-tab]');if(tab){setConfigSubpage(tab.dataset.phase2SettingTab);return;}
    const rangeChoice=event.target.closest('.p2-range-choice')?.querySelector('[name="p2-screen-range"]');
    if(rangeChoice){selectScreenRange(rangeChoice.value);return;}
    if(event.target.closest('#p2-pointer-toggle')){cancelShortcut();update({...state,magicPointerEnabled:!state.magicPointerEnabled});return;}
    if(event.target.closest('#p2-pointer-shake-toggle')){if(state.magicPointerEnabled)update({...state,magicPointerShakeEnabled:!state.magicPointerShakeEnabled});return;}
    if(event.target.closest('#p2-pointer-shortcut')){beginShortcut('pointer');return;}
    if(event.target.closest('#p2-capture-shortcut')){beginShortcut('capture');return;}
    if(event.target.closest('#p2-screen-toggle')){
      cancelShortcut();
      if(state.screenEnabled)update({...state,screenEnabled:false,screenPaused:false});
      else if(state.screenRange==='region')update({...state,screenEnabled:true,screenPaused:false,screenConsent:'granted'});
      else window.phase2Settings.authorizeScreen(state.displays.length?state.displays:['external']);
      return;
    }
    if(event.target.closest('#p2-local-model-toggle')){update({...state,preferBuiltInModel:!state.preferBuiltInModel});return;}
    if(event.target.closest('#p2-memory-folder')){const dialog=q('#p2-folder-dialog');clearDialog(dialog);q('#p2-folder-input').value=state.memoryPath;dialog.showModal();return;}
    const cli=event.target.closest('[data-p2-cli]');if(cli){activeCli=cli.dataset.p2Cli;const dialog=q('#p2-cli-dialog');clearDialog(dialog);q('#p2-cli-title').textContent=`连接${names[activeCli]} CLI`;q('#p2-cli-path').value=state.cliPaths[activeCli]||'';dialog.showModal();return;}
    const close=event.target.closest('[data-p2-close]');if(close)close.closest('dialog').close();
  });
  for(const kind of ['capture','pointer']){
  q('#p2-'+kind+'-shortcut').addEventListener('keydown',event=>{
    if(recordingShortcut!==kind)return;
    if(event.key==='Tab')return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Escape'){cancelShortcut();return;}
    if(['Control','Alt','Shift','Meta'].includes(event.key)||event.repeat)return;
    const character=event.code.match(/^(?:Key([A-Z])|Digit([0-9]))$/);
    const help=q('#p2-'+kind+'-shortcut-help');
    if(event.metaKey||(!event.ctrlKey&&!event.altKey)||!character){help.textContent='请使用 Ctrl／Alt 与字母或数字组合，Esc 取消。';return;}
    const shortcut=[event.ctrlKey?'Ctrl':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',character[1]||character[2]].filter(Boolean).join(' + ');
    const field=kind==='pointer'?'magicPointerShortcut':'captureShortcut',other=kind==='pointer'?'captureShortcut':'magicPointerShortcut';
    if(shortcut===state[other]){help.textContent=kind==='pointer'?'与框选读屏快捷键重复，请重新设置。':'与魔法指针快捷键重复，请重新设置。';return;}
    recordingShortcut='';update({...state,[field]:shortcut});
  });
  q('#p2-'+kind+'-shortcut').addEventListener('blur',()=>{if(recordingShortcut===kind)cancelShortcut();});
  }
  root.addEventListener('input',event=>{if(event.target.id==='p2-pointer-sensitivity'&&state.magicPointerEnabled&&state.magicPointerShakeEnabled)event.target.style.setProperty('--pointer-progress',event.target.value+'%');});
  root.addEventListener('change',event=>{
    if(event.target.id==='p2-interface-language'){if(event.target.value==='zh-CN')update({...state,interfaceLanguage:event.target.value});return;}
    if(event.target.name==='p2-screen-range'){
      selectScreenRange(event.target.value);
      return;
    }
    if(event.target.id==='p2-pointer-sensitivity'){if(state.magicPointerEnabled&&state.magicPointerShakeEnabled)update({...state,magicPointerSensitivity:Number(event.target.value)});return;}
    if(event.target.matches('[data-p2-display]')){const selected=[...q('#p2-display-select').querySelectorAll('input:checked')].map(input=>input.value);if(selected.length>2){event.target.checked=false;feedback('最多选择 2 个显示器。');return;}if(!selected.length){render();feedback('至少选择 1 个显示器；如需停止，请关闭自动读屏。');return;}update({...state,displays:selected});}
  });
  root.addEventListener('submit',event=>{
    if(event.target.id==='p2-folder-form'){
      event.preventDefault();const path=q('#p2-folder-input').value.trim();const box=q('#p2-folder-dialog [data-p2-dialog-feedback]');
      if(!path){box.textContent='请选择存储文件夹。';box.hidden=false;return;}
      if(update({...state,memoryPath:path})){q('#p2-folder-dialog').close();feedback('记忆存储位置已更新。');}
    }
    if(event.target.id==='p2-cli-form'){
      event.preventDefault();const path=q('#p2-cli-path').value.trim(),box=q('#p2-cli-dialog [data-p2-dialog-feedback]');
      if(!path){box.textContent='请提供对应 CLI 程序路径。';box.hidden=false;return;}
      if(update({...state,cliPaths:{...state.cliPaths,[activeCli]:path}})){box.textContent='CLI 路径已记录。当前尚未接入 CLI 执行服务，未完成连接。';box.hidden=false;}
    }
  });
  window.phase2Settings={
    getState:()=>({...state,displays:[...state.displays],screenRegion:state.screenRegion?{...state.screenRegion}:null}),
    validRegion,
    authorizeScreen:ids=>Array.isArray(ids)&&ids.length>=1&&ids.length<=2&&new Set(ids).size===ids.length&&ids.every(id=>['external','builtin'].includes(id))&&update({...state,displays:[...ids],screenRange:'display',screenEnabled:true,screenPaused:false,screenConsent:'granted'}),
    authorizeRegion:region=>Boolean(validRegion(region))&&update({...state,screenRegion:validRegion(region),screenRange:'region',screenEnabled:true,screenPaused:false,screenConsent:'granted'}),
    deferScreen:()=>update({...state,screenEnabled:false,screenPaused:false,screenConsent:'deferred'}),
    setScreenEnabled:screenEnabled=>typeof screenEnabled==='boolean'&&(!screenEnabled||state.screenRange==='region'||state.displays.length>0)&&update({...state,screenEnabled,screenPaused:false})
  };
  render();
  const params=new URLSearchParams(location.search);
  if(params.get('page')==='screen-config')setConfigSubpage(['api','system','memory'].includes(params.get('tab'))?params.get('tab'):'system');
})();
