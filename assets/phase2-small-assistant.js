/* Prototype interactions. Voice recognition requires a host service; no screen capture is loaded. */
(() => {
  let voiceOpen=false, previousFocus=null, previousMode='text', renderPending=false;

  function activePreview(){return document.querySelector('.view.active [data-subscreen-preview]');}
  function removeVoiceLayers(){
    document.querySelectorAll('[data-p2-global-voice]').forEach(node=>node.remove());
    document.querySelectorAll('[data-p2-voice-inert]').forEach(node=>{node.inert=false;node.removeAttribute('data-p2-voice-inert');});
    document.querySelector('#p2-voice-fallback')?.remove();
  }
  // Copy the rendered original component, including its original controls and dialogs.
  // All actions below are forwarded to the existing QA handlers; no second voice state machine.
  function voiceMarkup(){
    const source=qaRoot();if(!source)return '';
    const clone=source.cloneNode(true);
    clone.querySelectorAll('[data-p2-global-voice]').forEach(node=>node.remove());
    clone.removeAttribute('data-subscreen-preview');clone.removeAttribute('data-subscreen-title');
    clone.classList.add('p2-original-voice');
    clone.querySelectorAll('.voice-dialog-mode-switch').forEach(node=>node.remove());
    clone.querySelectorAll('[inert],[data-p2-voice-inert]').forEach(node=>{node.removeAttribute('inert');node.removeAttribute('data-p2-voice-inert');});
    clone.querySelectorAll('[id]').forEach(node=>{
      if(node.matches('button,input,select,textarea'))node.dataset.p2QaControl=node.id;
      node.removeAttribute('id');
    });
    clone.querySelectorAll('[for],[aria-controls],[aria-labelledby],[aria-describedby]').forEach(node=>{
      ['for','aria-controls','aria-labelledby','aria-describedby'].forEach(attr=>node.removeAttribute(attr));
    });
    return clone.outerHTML;
  }
  function renderVoice(){
    if(!voiceOpen)return;
    let preview=activePreview();
    if(!preview){
      let fallback=document.querySelector('#p2-voice-fallback');
      if(!fallback){fallback=document.createElement('section');fallback.id='p2-voice-fallback';fallback.className='panel';fallback.innerHTML='<strong>自带小屏</strong><div class="p2-fallback-screen"></div>';document.querySelector('.view.active')?.prepend(fallback);}
      preview=fallback.querySelector('.p2-fallback-screen');
    }else document.querySelector('#p2-voice-fallback')?.remove();
    document.querySelectorAll('[data-subscreen-preview]').forEach(other=>{
      if(other===preview)return;
      other.querySelector('[data-p2-global-voice]')?.remove();
      other.querySelectorAll('[data-p2-voice-inert]').forEach(node=>{node.inert=false;node.removeAttribute('data-p2-voice-inert');});
    });
    let layer=preview.querySelector(':scope > [data-p2-global-voice]');
    if(!layer){layer=document.createElement('section');layer.className='p2-global-voice';layer.setAttribute('data-p2-global-voice','');layer.setAttribute('role','region');layer.setAttribute('aria-label','全局语音界面');preview.append(layer);}
    const markup=voiceMarkup()+'<button type="button" class="p2-voice-close" data-p2-voice-action="close" aria-label="关闭语音界面" title="关闭语音界面">×</button>';
    if(layer.innerHTML!==markup)layer.innerHTML=markup;
    [...preview.children].filter(node=>node!==layer).forEach(node=>{node.inert=true;node.setAttribute('data-p2-voice-inert','');});
    if(preview.dataset.subscreenPreview)syncPhysicalScreenPreview(preview);
  }
  function wake(){
    if(document.querySelector('dialog[open]')||qaRoot()?.querySelector('.qa-modal-layer.open'))return;
    if(!voiceOpen){previousFocus=document.activeElement;previousMode=QA_STATE.mode;}
    voiceOpen=true;QA_STATE.mode='voice';
    qaRender();
    // The original orb handler handles permission, listening, processing and interruption.
    qaRoot()?.querySelector('#voice-dialogue-orb-button')?.click();
    renderVoice();
  }
  function close(endCall=true){
    if(!voiceOpen)return;
    if(endCall)qaRoot()?.querySelector('#qa-end-voice')?.click();
    voiceOpen=false;
    qaRoot()?.querySelector(':scope > #qa-modal-layer')?.classList.remove('open');
    QA_STATE.pendingVoiceStart=false;
    QA_STATE.mode=previousMode==='voice'?'text':previousMode;
    removeVoiceLayers();qaRender();
    const preview=activePreview();if(preview)syncPhysicalScreenPreview(preview);
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function receiveTranscript(value){
    if(!voiceOpen||QA_STATE.permission!=='authorized'||QA_STATE.micMuted||QA_STATE.phase==='thinking')return;
    clearTimeout(qaAutoListenTimer);QA_STATE.cancelRecognition=true;
    const text=String(value||'').trim();
    if(!text){QA_STATE.phase='failed';QA_STATE.issue='recognition-failed';qaRender();return;}
    QA_STATE.issue='';qaSubmit(text);
  }
  function conversationChanged(){if(voiceOpen)renderVoice();}

  document.addEventListener('click',event=>{
    const mirror=event.target.closest('.physical-screen-mirror-source');
    const control=event.target.closest('[data-p2-qa-control]');
    if(control&&control.tagName==='BUTTON'&&(mirror||control.closest('[data-p2-global-voice]'))){
      event.preventDefault();event.stopImmediatePropagation();
      qaRoot()?.querySelector('#'+control.dataset.p2QaControl)?.click();
      if(control.dataset.p2QaControl==='qa-end-voice')close(false);
      if(control.dataset.p2QaControl==='qa-session-search-toggle')requestAnimationFrame(()=>document.querySelector('.physical-screen-mirror-source [data-p2-qa-control="qa-drawer-search"]:not([hidden])')?.focus({preventScroll:true}));
      return;
    }
    const modal=event.target.closest('[data-qa-modal-cancel], [data-qa-modal-confirm]');
    if(modal&&(mirror||modal.closest('[data-p2-global-voice]'))){event.preventDefault();event.stopImmediatePropagation();qaRoot()?.querySelector(':scope > #qa-modal-layer '+(modal.hasAttribute('data-qa-modal-cancel')?'[data-qa-modal-cancel]':'[data-qa-modal-confirm]'))?.click();return;}
    if(event.target.closest('[data-p2-voice-action="close"]')){event.preventDefault();event.stopImmediatePropagation();close();return;}
    const demo=event.target.closest('[data-p2-assistant-demo]');
    if(demo){if(demo.dataset.p2AssistantDemo==='wake')wake();else if(demo.dataset.p2AssistantDemo==='transcript')receiveTranscript('请解释一下量子计算的基本原理');return;}

  },true);
  document.addEventListener('input',event=>{
    if(event.target.dataset.p2QaControl!=='qa-drawer-search')return;
    const source=qaRoot()?.querySelector('#qa-drawer-search');if(source){source.value=event.target.value;qaRenderDrawer(source.value);}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&voiceOpen){event.preventDefault();close();}if(event.key==='F8'&&!document.querySelector('dialog[open]')){event.preventDefault();wake();}});
  window.addEventListener('agentpc:voice-wake',wake);
  window.addEventListener('agentpc:voice-transcript',event=>receiveTranscript(event.detail?.text));
  window.phase2Assistant={wake,close,receiveTranscript,conversationChanged};
  document.addEventListener('change',event=>{
    const id=event.target.dataset.p2QaControl;if(!id||!event.target.closest('[data-p2-global-voice]'))return;
    const original=qaRoot()?.querySelector('#'+id);if(!original)return;
    original.value=event.target.value;original.dispatchEvent(new Event('change',{bubbles:true}));
  },true);
  new MutationObserver(records=>{
    if(voiceOpen&&records.some(record=>record.target.id==='qa-modal-layer'||record.target.closest?.('#qa-modal-layer')))renderVoice();
  }).observe(qaRoot(),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{
    if(!voiceOpen||renderPending)return;renderPending=true;
    queueMicrotask(()=>{renderPending=false;renderVoice();});
  }).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class']});
  QA_STATE.mode='text';qaRender();
  if(!new URLSearchParams(location.search).has('page'))setActiveTab('voice');
})();
