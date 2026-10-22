/* Visual prototype only: draws inside this webpage, without capturing a screen or reading content. */
(() => {
  const settings=window.phase2Settings;
  if(!settings)return;
  let state=settings.getState(),lastScope='',pulseTimer,selection=null;
  const indicator=document.createElement('button');
  indicator.type='button';indicator.id='p2-capture-indicator';indicator.className='p2-capture-indicator';
  indicator.hidden=true;indicator.setAttribute('aria-haspopup','dialog');indicator.setAttribute('aria-controls','p2-screen-consent');
  indicator.title='查看或修改读取范围（原型演示，未采集屏幕）';
  const frame=document.createElement('div');frame.className='p2-reading-frame';frame.hidden=true;frame.setAttribute('aria-hidden','true');
  document.body.append(indicator,frame);
  indicator.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('agentpc:screen-consent-request')));
  function active(current){return current.screenEnabled&&!current.screenPaused&&(current.screenRange==='region'?Boolean(settings.validRegion(current.screenRegion)):current.displays.length>0);}
  function scope(current){return active(current)?JSON.stringify([current.screenRange,current.displays,current.screenRange==='region'?current.screenRegion:null]):'';}
  function hideFrame(){clearTimeout(pulseTimer);frame.hidden=true;frame.classList.remove('is-display','is-region');}
  function positionRegion(){
    const rect=state.screenRegion;
    if(!rect)return;
    Object.assign(frame.style,{left:`${rect.x*100}vw`,top:`${rect.y*100}dvh`,width:`${rect.width*100}vw`,height:`${rect.height*100}dvh`});
  }
  function showFrame(changed){
    if(!active(state)||selection){hideFrame();return;}
    if(state.screenRange==='region'){
      clearTimeout(pulseTimer);frame.classList.remove('is-display');frame.classList.add('is-region');positionRegion();frame.hidden=false;
    }else if(changed){
      hideFrame();Object.assign(frame.style,{left:'1px',top:'1px',width:'calc(100vw - 2px)',height:'calc(100dvh - 2px)'});
      frame.hidden=false;void frame.offsetWidth;frame.classList.add('is-display');
      pulseTimer=setTimeout(()=>{if(frame.classList.contains('is-display'))frame.hidden=true;},2300);
    }
  }
  function render(next){
    const signature=scope(next),changed=signature!==lastScope;
    state=next;lastScope=signature;
    if(selection&&changed&&!selection.committing)finishSelection(false);
    indicator.hidden=!active(state);
    indicator.textContent=`自动读屏 · ${state.screenRange==='region'?'框选区域':'整个屏幕'}`;
    indicator.setAttribute('aria-label',indicator.textContent+'，点击修改读取范围');
    showFrame(changed);
  }

  const picker=document.createElement('dialog');picker.className='p2-region-picker';picker.id='p2-region-picker';
  picker.setAttribute('aria-labelledby','p2-region-picker-title');
  picker.innerHTML='<div class="p2-region-guide" id="p2-region-picker-title" role="status">拖动框选读取区域 · Esc 取消</div><div class="p2-region-draft" hidden></div>';
  document.body.append(picker);
  const draftFrame=picker.querySelector('.p2-region-draft'),hint=picker.querySelector('.p2-region-guide');
  function resetSelection(){
    if(!selection)return;
    selection.start=null;selection.rect=null;selection.pointer=null;draftFrame.hidden=true;picker.classList.remove('has-region');
    hint.textContent='拖动框选读取区域 · Esc 取消';
  }
  function focusBack(target){
    if(target?.isConnected&&!target.closest('dialog:not([open])'))target.focus({preventScroll:true});
    else if(!indicator.hidden)indicator.focus({preventScroll:true});
  }
  function finishSelection(result){
    if(!selection)return;
    const current=selection;selection=null;
    if(picker.open)picker.close();
    picker.classList.remove('has-region');draftFrame.hidden=true;showFrame(false);focusBack(current.focus);current.resolve(result);
  }
  function chooseRegion(){
    if(selection)return selection.promise;
    if(document.querySelector('dialog[open]'))return Promise.resolve(false);
    let resolve;const promise=new Promise(done=>resolve=done);
    selection={resolve,promise,focus:document.activeElement,start:null,rect:null,pointer:null,committing:false};
    resetSelection();hideFrame();
    try{picker.showModal();picker.focus({preventScroll:true});}
    catch(_){finishSelection(false);}
    return promise;
  }
  function point(event){return {x:Math.max(0,Math.min(innerWidth,event.clientX)),y:Math.max(0,Math.min(innerHeight,event.clientY))};}
  function draw(event){
    if(!selection?.start||selection.pointer!==event.pointerId)return;
    const start=selection.start,end=point(event);
    const rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(start.x-end.x),height:Math.abs(start.y-end.y)};
    selection.rect=rect;
    Object.assign(draftFrame.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
    draftFrame.hidden=false;picker.classList.add('has-region');
    hint.textContent=`${Math.round(rect.width)} × ${Math.round(rect.height)} · Esc 取消`;
  }
  picker.addEventListener('pointerdown',event=>{
    if(!selection||selection.start||event.button!==0)return;
    event.preventDefault();resetSelection();selection.start=point(event);selection.pointer=event.pointerId;picker.setPointerCapture(event.pointerId);
  });
  picker.addEventListener('pointermove',draw);
  picker.addEventListener('pointerup',event=>{
    if(!selection?.start||selection.pointer!==event.pointerId)return;
    draw(event);selection.start=null;selection.pointer=null;
    if(picker.hasPointerCapture(event.pointerId))picker.releasePointerCapture(event.pointerId);
    const rect=selection.rect,valid=rect&&rect.width>=24&&rect.height>=24;
    if(!valid){hint.textContent='区域太小，请重新拖动框选 · Esc 取消';return;}
    selection.committing=true;
    const saved=settings.authorizeRegion({x:rect.x/innerWidth,y:rect.y/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight});
    selection.committing=false;
    if(saved)finishSelection(true);else hint.textContent='范围未保存，请重新拖动框选 · Esc 取消';
  });
  picker.addEventListener('pointercancel',()=>resetSelection());
  picker.addEventListener('cancel',event=>{event.preventDefault();finishSelection(false);});
  picker.addEventListener('close',()=>{if(selection&&!picker.open)finishSelection(false);});
  window.addEventListener('resize',()=>{if(selection)resetSelection();else if(state.screenRange==='region'&&active(state))positionRegion();});
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.repeat||event.metaKey||!state.screenEnabled||state.screenRange!=='region'||event.target.closest?.('.is-recording'))return;
    const character=event.code?.match(/^(?:Key([A-Z])|Digit([0-9]))$/);if(!character)return;
    const shortcut=[event.ctrlKey?'Ctrl':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',character[1]||character[2]].filter(Boolean).join(' + ');
    if(shortcut!==state.captureShortcut||document.querySelector('dialog[open]'))return;
    event.preventDefault();chooseRegion();
  });
  window.addEventListener('agentpc:screen-settings',event=>render(event.detail));
  window.addEventListener('agentpc:screen-region-request',()=>chooseRegion());
  window.phase2ScreenReading={chooseRegion,flashDisplay:()=>{if(active(state)&&state.screenRange==='display')showFrame(true);}};
  render(state);
})();
