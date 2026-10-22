/* Prototype interactions. Wake-word recognition and screen capture require a host service. */
(() => {
  let voiceOpen=false, previousFocus=null, previousMode='text', renderPending=false;
  let screenState=window.phase2Settings.getState();

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

  const consent=document.createElement('dialog');consent.id='p2-screen-consent';consent.className='p2-screen-consent';
  consent.setAttribute('aria-labelledby','p2-screen-consent-title');
  consent.innerHTML=`
    <h3 id="p2-screen-consent-title">自动读屏</h3>
    <p>持续读取所选屏幕或区域的内容。</p>
    <div class="p2-consent-range-group" role="group" aria-label="读取范围">
      <strong class="p2-consent-range-title">读取范围</strong>
      <label class="p2-consent-range"><input type="radio" name="p2-consent-range" value="display" checked><span>整个屏幕</span><small data-p2-consent-limit>最多选择 2 个</small></label>
      <div class="p2-display-options" id="p2-consent-displays" role="group" aria-label="读取显示器">
        <label><input type="checkbox" value="external" data-p2-consent-display>显示器 1 · 外接显示器</label>
        <label><input type="checkbox" value="builtin" data-p2-consent-display>显示器 2 · 自带小屏</label>
      </div>
      <label class="p2-consent-range"><input type="radio" name="p2-consent-range" value="region"><span>框选区域</span></label>
      <div class="p2-consent-shortcut" id="p2-consent-shortcut" hidden><span>快捷键</span><kbd id="p2-consent-shortcut-value">Ctrl + Alt + S</kbd></div>
    </div>
    <p class="p2-consent-error" role="alert" hidden></p>
    <div class="p2-consent-actions"><button type="button" data-p2-consent="later">暂不开启</button><button type="button" class="primary" data-p2-consent="allow" disabled>授权并开启</button></div>`;
  document.body.append(consent);
  function openConsent(event) {
    if(voiceOpen)close();
    if(document.querySelector('dialog[open]'))return;
    const range=['display','region'].includes(event?.detail?.range)?event.detail.range:screenState.screenRange;
    consent.querySelectorAll('[name="p2-consent-range"]').forEach(input=>input.checked=input.value===range);
    consent.querySelectorAll('[data-p2-consent-display]').forEach(input=>input.checked=screenState.displays.includes(input.value));
    consent.querySelector('#p2-consent-shortcut-value').textContent=screenState.captureShortcut;
    updateConsentSelection();
    consent.querySelector('[data-p2-consent="later"]').textContent=screenState.screenEnabled?'关闭读屏':'暂不开启';
    consent.querySelector('[data-p2-consent="allow"]').textContent=screenState.screenEnabled?'保存修改':'授权并开启';
    consent.querySelector('.p2-consent-error').hidden=true;
    consent.showModal();
  }
  function selectedConsentDisplays(){return [...consent.querySelectorAll('[data-p2-consent-display]:checked')].map(input=>input.value);}
  function selectedConsentRange(){return consent.querySelector('[name="p2-consent-range"]:checked')?.value||'display';}
  function updateConsentSelection(){
    const ids=selectedConsentDisplays(),region=selectedConsentRange()==='region';
    consent.querySelector('#p2-consent-displays').hidden=region;
    consent.querySelector('[data-p2-consent-limit]').hidden=region;
    consent.querySelector('#p2-consent-shortcut').hidden=!region;
    consent.querySelectorAll('[data-p2-consent-display]').forEach(input=>input.disabled=region||(!input.checked&&ids.length>=2));
    consent.querySelector('[data-p2-consent="allow"]').disabled=!region&&(ids.length===0||ids.length>2);
    consent.querySelector('.p2-consent-error').hidden=true;
  }
  consent.addEventListener('change',updateConsentSelection);
  consent.addEventListener('click',async event=>{
    const action=event.target.closest('[data-p2-consent]');if(!action)return;
    if(action.disabled)return;
    if(action.dataset.p2Consent==='allow'&&selectedConsentRange()==='region'){
      consent.close();await window.phase2ScreenReading.chooseRegion();return;
    }
    const ok=action.dataset.p2Consent==='later'?window.phase2Settings.deferScreen():window.phase2Settings.authorizeScreen(selectedConsentDisplays());
    if(ok){consent.close();if(action.dataset.p2Consent==='allow')window.phase2ScreenReading.flashDisplay();}
    else{const error=consent.querySelector('.p2-consent-error');error.hidden=false;error.textContent='设置未保存，请重试。';}
  });
  consent.addEventListener('cancel',event=>{event.preventDefault();consent.close();});
  consent.addEventListener('click',event=>{if(event.target!==consent)return;const rect=consent.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)consent.close();});
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
    if(demo){if(demo.dataset.p2AssistantDemo==='wake')wake();else if(demo.dataset.p2AssistantDemo==='transcript')receiveTranscript('请解释一下量子计算的基本原理');else openConsent();return;}

  },true);
  document.addEventListener('input',event=>{
    if(event.target.dataset.p2QaControl!=='qa-drawer-search')return;
    const source=qaRoot()?.querySelector('#qa-drawer-search');if(source){source.value=event.target.value;qaRenderDrawer(source.value);}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&voiceOpen){event.preventDefault();close();}if(event.key==='F8'&&!consent.open){event.preventDefault();wake();}});
  window.addEventListener('agentpc:screen-settings',event=>{screenState=event.detail;});
  window.addEventListener('agentpc:screen-consent-request',openConsent);
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
  // Memory has its own source setup dialog; retain the screen demo on other entries.
  if(APP_STATE.currentPage !== "memory" && APP_STATE.currentPage !== "screen-config") openConsent();
})();
