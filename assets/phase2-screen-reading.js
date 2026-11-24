/* Visual prototype only: draws inside this webpage, without capturing a screen or reading content. */
(() => {
  const settings=window.phase2Settings;
  if(!settings)return;
  let state=settings.getState(),lastScope='',selection=null,shortcutRecording=false;
  const indicator=document.createElement('div');
  indicator.id='p2-capture-indicator';indicator.className='p2-capture-indicator';
  indicator.hidden=true;indicator.setAttribute('role','group');indicator.setAttribute('aria-label','读屏状态');
  indicator.innerHTML=`
    <span data-reading-status>读屏中</span>
    <button type="button" data-reading-adjust aria-haspopup="dialog" aria-controls="p2-region-picker">
      <svg class="p2-reading-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.5 6V2.5H6m4 0h3.5V6m0 4v3.5H10m-4 0H2.5V10"/>
      </svg>
      调整区域
    </button>`;
  const adjust=indicator.querySelector('[data-reading-adjust]');
  const announcement=document.createElement('span');
  announcement.className='p2-reading-announcement';announcement.setAttribute('role','status');
  const frame=document.createElement('div');frame.className='p2-reading-frame';frame.hidden=true;frame.setAttribute('aria-hidden','true');
  document.body.append(indicator,frame,announcement);
  adjust.addEventListener('click',chooseRegion);
  function scope(current){
    return current.proactiveEnabled?JSON.stringify([current.screenDisplay,current.screenRegion]):'';
  }
  function renderFrame(){
    if(!state.proactiveEnabled||selection){frame.hidden=true;return;}
    const rect=state.screenRegion;
    frame.classList.toggle('is-region',Boolean(rect));
    if(rect){
      frame.style.setProperty('--reading-left',`${rect.x*100}vw`);
      frame.style.setProperty('--reading-top',`${rect.y*100}dvh`);
      frame.style.setProperty('--reading-width',`${rect.width*100}vw`);
      frame.style.setProperty('--reading-height',`${rect.height*100}dvh`);
    }
    frame.hidden=false;
  }
  function render(next){
    const signature=scope(next),changed=signature!==lastScope;
    state=next;lastScope=signature;
    if(selection&&(!state.proactiveEnabled||(changed&&!selection.committing))){finishSelection();return;}
    indicator.hidden=!state.proactiveEnabled||Boolean(selection);
    if(changed){
      announcement.textContent=state.proactiveEnabled
        ?(state.screenRange==='region'?'读屏中，范围为所选区域':'读屏中，范围为整个屏幕')
        :'已停止读屏';
    }
    renderFrame();
  }

  const picker=document.createElement('dialog');picker.className='p2-region-picker';picker.id='p2-region-picker';
  picker.setAttribute('aria-labelledby','p2-region-picker-title');
  picker.innerHTML=`
    <div class="p2-region-guide" id="p2-region-picker-title" role="status"></div>
    <div class="p2-region-draft" hidden aria-hidden="true">
      <div class="p2-region-move" data-region-handle="move"></div>
      <span data-region-handle="nw"></span>
      <span data-region-handle="ne"></span>
      <span data-region-handle="se"></span>
      <span data-region-handle="sw"></span>
    </div>
    <div class="p2-region-actions">
      <div class="p2-region-toolbar">
        <select class="soft-button" data-region-display aria-label="读取显示器">
          <option value="external">外接显示器</option>
          <option value="builtin">自带小屏</option>
        </select>
        <button type="button" class="soft-button" data-region-full>恢复全屏</button>
      </div>
      <div class="p2-region-toolbar">
        <button type="button" class="soft-button" data-region-cancel>取消</button>
        <button type="button" class="primary-button" data-region-confirm>确认</button>
      </div>
    </div>`;
  document.body.append(picker);
  const draftFrame=picker.querySelector('.p2-region-draft'),hint=picker.querySelector('.p2-region-guide');
  const confirm=picker.querySelector('[data-region-confirm]');
  const cancel=picker.querySelector('[data-region-cancel]');
  const displaySelect=picker.querySelector('[data-region-display]');
  const full=picker.querySelector('[data-region-full]');
  const usable=rect=>rect&&rect.width>=24&&rect.height>=24;
  const viewport=()=>({x:0,y:0,width:innerWidth,height:innerHeight});
  function savedRect(display){
    const region=display===state.screenDisplay?state.screenRegion:null;
    return region?{x:region.x*innerWidth,y:region.y*innerHeight,width:region.width*innerWidth,height:region.height*innerHeight}:null;
  }
  function describeDraft(){
    hint.textContent=selection.rect
      ?'拖动选区移动，拖动四角拉伸 · Esc 取消'
      :'拖动四角或重新框选 · Esc 取消';
  }
  function paintDraft(){
    const rect=selection.rect??viewport();
    Object.assign(draftFrame.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
    draftFrame.hidden=false;
    picker.classList.toggle('is-full',!selection.rect);
    confirm.disabled=!usable(rect);
    full.disabled=!selection.rect;
  }
  function focusBack(target){
    if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});
    else if(!indicator.hidden)adjust.focus({preventScroll:true});
  }
  function finishSelection(){
    if(!selection)return;
    const current=selection;selection=null;
    if(picker.open)picker.close();
    draftFrame.hidden=true;render(state);focusBack(current.focus);
  }
  function chooseRegion(){
    if(!state.proactiveEnabled||shortcutRecording||selection||document.querySelector('dialog[open]'))return;
    const focus=document.activeElement;
    window.phase2Assistant?.close();
    const display=state.screenDisplay;
    selection={focus,rect:savedRect(display),display,drag:null,committing:false};
    displaySelect.value=display;
    describeDraft();
    indicator.hidden=true;
    paintDraft();renderFrame();
    picker.showModal();picker.focus({preventScroll:true});
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
    if(!selection||selection.drag||event.button!==0||event.target.closest('.p2-region-toolbar'))return;
    const kind=event.target.closest('[data-region-handle]')?.dataset.regionHandle||'new';
    event.preventDefault();
    selection.drag={start:point(event),rect:selection.rect??viewport(),previous:selection.rect,pointer:event.pointerId,kind};
    picker.setPointerCapture(event.pointerId);
  });
  picker.addEventListener('pointermove',draw);
  picker.addEventListener('pointerup',event=>{
    if(selection?.drag?.pointer!==event.pointerId)return;
    const {previous}=selection.drag;
    draw(event);selection.drag=null;
    if(selection.rect&&!usable(selection.rect)){
      selection.rect=previous;
      hint.textContent='区域太小，请重新拖动框选 · Esc 取消';
    }else describeDraft();
    paintDraft();
  });
  picker.addEventListener('pointercancel',()=>{
    if(!selection?.drag)return;
    selection.rect=selection.drag.previous;selection.drag=null;describeDraft();paintDraft();
  });
  displaySelect.addEventListener('change',()=>{
    selection.display=displaySelect.value;
    selection.rect=savedRect(selection.display);
    describeDraft();paintDraft();
  });
  function saveSelection(rect){
    if(!selection||selection.drag)return;
    const region=rect?{x:rect.x/innerWidth,y:rect.y/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight}:null;
    selection.committing=true;
    const saved=settings.setScreenRange(selection.display,region);
    selection.committing=false;
    if(saved)finishSelection();else hint.textContent='范围未保存，请重试';
  }
  cancel.addEventListener('click',finishSelection);
  full.addEventListener('click',()=>{
    selection.rect=null;
    describeDraft();paintDraft();
  });
  confirm.addEventListener('click',()=>saveSelection(selection?.rect));
  picker.addEventListener('cancel',event=>{event.preventDefault();finishSelection();});
  picker.addEventListener('close',()=>{if(selection&&!picker.open)finishSelection();});
  window.addEventListener('resize',finishSelection);
  document.addEventListener('keydown',event=>{
    if(!state.proactiveEnabled||shortcutRecording||event.defaultPrevented||event.repeat||event.metaKey||document.querySelector('dialog[open]')||event.target.closest?.('.is-recording'))return;
    const character=event.code?.match(/^(?:Key([A-Z])|Digit([0-9]))$/);if(!character)return;
    const shortcut=[event.ctrlKey?'Ctrl':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',character[1]||character[2]].filter(Boolean).join(' + ');
    if(shortcut!==state.captureShortcut)return;
    event.preventDefault();chooseRegion();
  });
  window.addEventListener('agentpc:screen-settings',event=>render(event.detail));
  window.addEventListener('agentpc:shortcut-recording',event=>{shortcutRecording=event.detail?.active===true;});
  render(state);
})();
