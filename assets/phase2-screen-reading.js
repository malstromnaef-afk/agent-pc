/* Visual prototype only: draws inside this webpage, without capturing a screen or reading content. */
(() => {
  const settings=window.phase2Settings;
  if(!settings)return;
  let state=settings.getState(),lastScope='',pulseTimer,selection=null,shortcutRecording=false;
  const indicator=document.createElement('div');
  indicator.id='p2-capture-indicator';indicator.className='p2-capture-indicator';
  indicator.hidden=true;indicator.setAttribute('role','group');indicator.setAttribute('aria-label','读屏状态');
  indicator.innerHTML='<button type="button" data-reading-status aria-haspopup="dialog" aria-controls="p2-screen-consent"></button><button type="button" data-reading-adjust>调整区域</button><button type="button" data-reading-stop>停止</button>';
  const status=indicator.querySelector('[data-reading-status]');
  const adjust=indicator.querySelector('[data-reading-adjust]');
  const stop=indicator.querySelector('[data-reading-stop]');
  const announcement=document.createElement('span');
  announcement.className='p2-reading-announcement';announcement.setAttribute('role','status');
  const frame=document.createElement('div');frame.className='p2-reading-frame';frame.hidden=true;frame.setAttribute('aria-hidden','true');
  document.body.append(indicator,frame,announcement);
  status.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('agentpc:screen-consent-request')));
  adjust.addEventListener('click',()=>chooseRegion());
  function stopReading(){
    const restore=indicator.contains(document.activeElement);
    if(settings.setScreenEnabled(false)){
      announcement.textContent='已停止读屏';
      if(restore)document.querySelector('#p2-screen-toggle')?.focus({preventScroll:true});
    }
  }
  stop.addEventListener('click',stopReading);
  function active(current){return current.screenEnabled&&!current.screenPaused&&(current.screenRange==='region'?Boolean(settings.validRegion(current.screenRegion)):current.displays.length>0);}
  function scope(current){return active(current)?JSON.stringify([current.screenRange,current.displays,current.screenRange==='region'?current.screenRegion:null]):'';}
  function hideFrame(){clearTimeout(pulseTimer);frame.hidden=true;frame.classList.remove('is-display','is-region');}
  function positionRegion(){
    const rect=state.screenRegion;
    if(!rect)return;
    Object.assign(frame.style,{left:`${rect.x*100}vw`,top:`${rect.y*100}dvh`,width:`${rect.width*100}vw`,height:`${rect.height*100}dvh`});
  }
  function showFrame(changed){
    if(!active(state)||selection||shortcutRecording){hideFrame();return;}
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
    indicator.hidden=!active(state)||Boolean(selection);
    const screenLabel=state.displays.length===2?'2 个显示器':state.displays.includes('builtin')?'自带小屏':'外接显示器';
    status.textContent=`正在读屏 · ${state.screenRange==='region'?'已选区域':screenLabel}`;
    status.setAttribute('aria-label',status.textContent+'，点击修改读取范围');
    adjust.hidden=state.screenRange!=='region';
    if(changed&&active(state))announcement.textContent=status.textContent;
    showFrame(changed);
  }

  const picker=document.createElement('dialog');picker.className='p2-region-picker';picker.id='p2-region-picker';
  picker.setAttribute('aria-labelledby','p2-region-picker-title');
  picker.innerHTML='<div class="p2-region-guide" id="p2-region-picker-title" role="status"></div><div class="p2-region-draft" hidden><div class="p2-region-move" data-region-handle="move"></div><span data-region-handle="nw"></span><span data-region-handle="ne"></span><span data-region-handle="se"></span><span data-region-handle="sw"></span></div><div class="p2-region-actions"><button type="button" class="soft-button" data-region-cancel>取消</button><button type="button" class="primary-button" data-region-confirm disabled>开始读屏</button></div>';
  document.body.append(picker);
  const draftFrame=picker.querySelector('.p2-region-draft'),hint=picker.querySelector('.p2-region-guide');
  const confirm=picker.querySelector('[data-region-confirm]');
  const cancel=picker.querySelector('[data-region-cancel]');
  const usable=rect=>rect&&rect.width>=24&&rect.height>=24;
  function paintDraft(){
    const rect=selection.rect;
    if(rect)Object.assign(draftFrame.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
    draftFrame.hidden=!rect;
    picker.classList.toggle('has-region',Boolean(rect));
    confirm.disabled=!usable(rect);
  }
  function focusBack(target){
    if(target?.isConnected&&!target.closest('dialog:not([open])'))target.focus({preventScroll:true});
    else if(!indicator.hidden)status.focus({preventScroll:true});
  }
  function finishSelection(result){
    if(!selection)return;
    const current=selection;selection=null;
    if(picker.open)picker.close();
    picker.classList.remove('has-region');draftFrame.hidden=true;render(state);focusBack(current.focus);current.resolve(result);
  }
  function chooseRegion(){
    if(shortcutRecording)return Promise.resolve(false);
    if(selection)return selection.promise;
    if(document.querySelector('dialog[open]'))return Promise.resolve(false);
    let resolve;const promise=new Promise(done=>resolve=done);
    const previous=active(state)&&state.screenRange==='region'?state.screenRegion:null;
    const rect=previous?{x:previous.x*innerWidth,y:previous.y*innerHeight,width:previous.width*innerWidth,height:previous.height*innerHeight}:null;
    selection={resolve,promise,focus:document.activeElement,rect,drag:null,committing:false};
    hint.textContent=previous?'读屏已暂停 · 拖动选区或四角调整 · Esc 取消':'拖动框选读取区域 · Esc 取消';
    confirm.textContent=previous?'应用并继续':'开始读屏';
    indicator.hidden=true;
    paintDraft();hideFrame();
    try{picker.showModal();picker.focus({preventScroll:true});}
    catch(_){finishSelection(false);}
    return promise;
  }
  function clamp(value,min,max){return Math.min(Math.max(value,min),Math.max(min,max));}
  function point(event){return {x:clamp(event.clientX,0,innerWidth),y:clamp(event.clientY,0,innerHeight)};}
  function draw(event){
    const drag=selection?.drag;
    if(!drag||drag.pointer!==event.pointerId)return;
    const end=point(event),start=drag.start,rect=drag.rect;
    const dx=end.x-start.x,dy=end.y-start.y;
    if(drag.kind==='new'){
      if(!dx&&!dy)return;
      selection.rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(dx),height:Math.abs(dy)};
    }else if(drag.kind==='move'){
      selection.rect={...rect,x:clamp(rect.x+dx,0,innerWidth-rect.width),y:clamp(rect.y+dy,0,innerHeight-rect.height)};
    }else{
      const x=drag.kind.endsWith('w')?clamp(rect.x+dx,0,rect.x+rect.width-24):rect.x;
      const y=drag.kind.startsWith('n')?clamp(rect.y+dy,0,rect.y+rect.height-24):rect.y;
      const right=drag.kind.endsWith('e')?clamp(rect.x+rect.width+dx,x+24,innerWidth):rect.x+rect.width;
      const bottom=drag.kind.startsWith('s')?clamp(rect.y+rect.height+dy,y+24,innerHeight):rect.y+rect.height;
      selection.rect={x,y,width:right-x,height:bottom-y};
    }
    paintDraft();
  }
  picker.addEventListener('pointerdown',event=>{
    if(!selection||selection.drag||event.button!==0||event.target.closest('.p2-region-actions'))return;
    const kind=usable(selection.rect)?event.target.closest('[data-region-handle]')?.dataset.regionHandle||'new':'new';
    event.preventDefault();
    selection.drag={start:point(event),rect:selection.rect,pointer:event.pointerId,kind};
    picker.setPointerCapture(event.pointerId);
  });
  picker.addEventListener('pointermove',draw);
  picker.addEventListener('pointerup',event=>{
    if(selection?.drag?.pointer!==event.pointerId)return;
    draw(event);selection.drag=null;
    if(!usable(selection.rect)){selection.rect=null;hint.textContent='区域太小，请重新拖动框选 · Esc 取消';}
    else hint.textContent='拖动选区移动，拖动四角拉伸 · Esc 取消';
    paintDraft();
  });
  picker.addEventListener('pointercancel',()=>{
    if(!selection?.drag)return;
    selection.rect=selection.drag.rect;selection.drag=null;paintDraft();
  });
  cancel.addEventListener('click',()=>finishSelection(false));
  confirm.addEventListener('click',()=>{
    if(!usable(selection?.rect)||selection.drag)return;
    const rect=selection.rect;
    selection.committing=true;
    const saved=settings.authorizeRegion({x:rect.x/innerWidth,y:rect.y/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight});
    selection.committing=false;
    if(saved)finishSelection(true);else hint.textContent='范围未保存，请重试';
  });
  picker.addEventListener('cancel',event=>{event.preventDefault();finishSelection(false);});
  picker.addEventListener('close',()=>{if(selection&&!picker.open)finishSelection(false);});
  window.addEventListener('resize',()=>{if(selection)finishSelection(false);else if(state.screenRange==='region'&&active(state))positionRegion();});
  document.addEventListener('keydown',event=>{
    if(shortcutRecording||event.defaultPrevented||event.repeat||document.querySelector('dialog[open]')||event.target.closest?.('.is-recording'))return;
    if(event.key==='Escape'&&active(state)){event.preventDefault();stopReading();return;}
    if(event.metaKey||(active(state)&&state.screenRange==='display'))return;
    const character=event.code?.match(/^(?:Key([A-Z])|Digit([0-9]))$/);if(!character)return;
    const shortcut=[event.ctrlKey?'Ctrl':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',character[1]||character[2]].filter(Boolean).join(' + ');
    if(shortcut!==state.captureShortcut)return;
    event.preventDefault();chooseRegion();
  });
  window.addEventListener('agentpc:screen-settings',event=>render(event.detail));
  window.addEventListener('agentpc:shortcut-recording',event=>{shortcutRecording=event.detail?.active===true;showFrame(false);});
  window.addEventListener('agentpc:screen-region-request',()=>chooseRegion());
  document.querySelector('#p2-region-start')?.addEventListener('click',()=>{if(state.screenEnabled&&state.screenRange==='region')chooseRegion();});
  window.phase2ScreenReading={chooseRegion,flashDisplay:()=>{if(active(state)&&state.screenRange==='display')showFrame(true);}};
  render(state);
})();
