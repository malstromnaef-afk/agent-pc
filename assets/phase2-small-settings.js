/* Small-model prototype settings: no pointer, screen collection, proactive tasks or local inference. */
(() => {
  const root=document.querySelector('#screen-config');if(!root)return;
  const key='system-settings-ui-v2';
  const names={wechat:'微信',feishu:'飞书',dingtalk:'钉钉',wecom:'企业微信'};
  const languages=['zh-CN','en','de','it','fr','es','pt','ja'];
  let state={interfaceLanguage:'zh-CN',memoryPath:'%LOCALAPPDATA%\\AgentPC\\本地记忆',cliPaths:{}};
  try{
    const saved=JSON.parse(phase2Storage.getItem(key)||'null');
    if(saved){
      if(languages.includes(saved.interfaceLanguage))state.interfaceLanguage=saved.interfaceLanguage;
      if(typeof saved.memoryPath==='string'&&saved.memoryPath.trim())state.memoryPath=saved.memoryPath;
      for(const app of Object.keys(names))if(typeof saved.cliPaths?.[app]==='string')state.cliPaths[app]=saved.cliPaths[app];
    }
  }catch(_){}
  const q=selector=>root.querySelector(selector);let activeCli='';
  function render(){q('#p2-interface-language').value=state.interfaceLanguage;q('#p2-memory-path').textContent='本地电脑';q('#p2-memory-path').title='记忆保存在本地电脑';root.querySelectorAll('[data-p2-cli-status]').forEach(node=>{node.textContent=state.cliPaths[node.dataset.p2CliStatus]?'未连接 · 路径已记录':'未连接';});}
  function update(next){try{phase2Storage.setItem(key,JSON.stringify(next));state=next;render();return true;}catch(_){render();const box=q('#p2-system-feedback');box.textContent='保存失败，请重试。';box.hidden=false;return false;}}
  function clearDialog(dialog){const box=dialog.querySelector('[data-p2-dialog-feedback]');box.hidden=true;box.textContent='';}
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-phase2-setting-tab]');if(tab){setConfigSubpage(tab.dataset.phase2SettingTab);return;}
    if(event.target.closest('#p2-memory-folder')){const dialog=q('#p2-folder-dialog');clearDialog(dialog);q('#p2-folder-input').value=state.memoryPath;dialog.showModal();return;}
    const cli=event.target.closest('[data-p2-cli]');if(cli){activeCli=cli.dataset.p2Cli;const dialog=q('#p2-cli-dialog');clearDialog(dialog);q('#p2-cli-title').textContent=`连接${names[activeCli]} CLI`;q('#p2-cli-path').value=state.cliPaths[activeCli]||'';dialog.showModal();return;}
    const close=event.target.closest('[data-p2-close]');if(close)close.closest('dialog').close();
  });
  root.addEventListener('change',event=>{if(event.target.id==='p2-interface-language'&&languages.includes(event.target.value))update({...state,interfaceLanguage:event.target.value});});
  root.addEventListener('submit',event=>{
    if(event.target.id==='p2-folder-form'){
      event.preventDefault();const path=q('#p2-folder-input').value.trim(),box=q('#p2-folder-dialog [data-p2-dialog-feedback]');
      if(!path){box.textContent='请选择存储文件夹。';box.hidden=false;return;}
      if(update({...state,memoryPath:path})){q('#p2-folder-dialog').close();const feedback=q('#p2-local-settings-feedback');feedback.textContent='记忆存储位置已更新。';feedback.hidden=false;}
    }
    if(event.target.id==='p2-cli-form'){
      event.preventDefault();const path=q('#p2-cli-path').value.trim(),box=q('#p2-cli-dialog [data-p2-dialog-feedback]');
      if(!path){box.textContent='请提供对应 CLI 程序路径。';box.hidden=false;return;}
      if(update({...state,cliPaths:{...state.cliPaths,[activeCli]:path}})){box.textContent='CLI 路径已记录。当前尚未接入 CLI 执行服务，未完成连接。';box.hidden=false;}
    }
  });
  const tabs=[...root.querySelectorAll('[data-phase2-setting-tab]')];
  tabs.forEach(tab=>tab.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();const i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
    setConfigSubpage(tabs[next].dataset.phase2SettingTab);tabs[next].focus();
  }));
  window.phase2Settings={getState:()=>({...state,cliPaths:{...state.cliPaths}})};
  render();
  const params=new URLSearchParams(location.search),valid=['api','system','memory','apps-skills','computer'];
  const requested=params.get('settingsTab')||params.get('tab');
  if(params.get('page')==='screen-config'||params.has('settingsTab'))setConfigSubpage(valid.includes(requested)?requested:'api');
  else if(APP_STATE.configSubpage==='proactive')APP_STATE.configSubpage='api';
})();
