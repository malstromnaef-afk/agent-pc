/* Exports the current prototype memory and its imported source files. */
(() => {
  const card=document.querySelector('#p2-memory-storage');
  const button=document.querySelector('#p2-memory-export-button');
  if(!card||!button)return;
  const q=selector=>document.querySelector(selector);
  const feedback=q('#p2-memory-export-feedback');
  const errorBox=q('#p2-memory-export-error');
  const maxFileBytes=64*1024*1024;
  let state='idle';

  function setState(next,message='',error=''){
    state=next;
    const active=state==='exporting';
    card.dataset.exportState=state;card.setAttribute('aria-busy',String(active));
    button.disabled=active;
    button.textContent=active?'导出中…':'导出';
    feedback.textContent=message;feedback.hidden=!message;
    errorBox.textContent=error;errorBox.hidden=!error;
  }
  function source(){
    const memory=window.phase2MemoryBackupSource;
    if(!memory)throw new Error('记忆模块未就绪，请刷新页面后重试。');
    if(memory.isBusy())throw new Error('记忆资料正在处理或保存，请完成后再导出。');
    return memory;
  }
  function filename(date){
    const pad=value=>String(value).padStart(2,'0');
    return `记忆备份_${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.tar.gz`;
  }
  function failed(error){
    const message=/[\u4e00-\u9fff]/.test(error?.message||'')?error.message:'导出失败，文件未完成保存，请重试。';
    setState('error','',message);
    button.focus();
  }
  async function compressArchive(content){
    if(typeof CompressionStream!=='function')throw new Error('当前浏览器不支持 .tar.gz 导出，请使用新版浏览器。');
    const encoder=new TextEncoder(),data=encoder.encode(content),header=new Uint8Array(512);
    const put=(offset,length,value)=>header.set(encoder.encode(value).subarray(0,length),offset);
    const octal=(value,length)=>value.toString(8).padStart(length-1,'0')+'\0';
    put(0,100,'memory-backup.json');
    put(100,8,octal(0o644,8));put(108,8,octal(0,8));put(116,8,octal(0,8));
    put(124,12,octal(data.length,12));put(136,12,octal(Math.floor(Date.now()/1000),12));
    put(148,8,'        ');put(156,1,'0');put(257,6,'ustar\0');put(263,2,'00');
    const checksum=header.reduce((sum,value)=>sum+value,0);
    put(148,8,checksum.toString(8).padStart(6,'0')+'\0 ');
    const archive=new Blob([header,data,new Uint8Array((512-data.length%512)%512),new Uint8Array(1024)]);
    const compressed=await new Response(archive.stream().pipeThrough(new CompressionStream('gzip'))).blob();
    return new Blob([compressed],{type:'application/gzip'});
  }
  function toBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
      reader.onerror=reader.onabort=()=>reject(new Error('关联资料读取失败，未生成完整导出文件，请重试。'));
      reader.readAsDataURL(blob);
    });
  }
  async function createExport(){
    const memory=source();
    const snapshot=memory.validate(memory.snapshot());
    const references=snapshot.items.flatMap(item=>item.sourceFiles||[]);
    const records=new Map(),files=[];
    for(const reference of references){
      let record=records.get(reference.id);
      if(!record){
        if(!window.phase2MemoryFiles)throw new Error('关联资料模块未就绪，请刷新页面后重试。');
        record=await window.phase2MemoryFiles.get(reference.id);
        if(!record||!(record.blob instanceof Blob))throw new Error('关联资料缺失，无法完整导出，请检查记忆来源后重试。');
        records.set(reference.id,record);
      }
      if(record.id!==reference.id||record.key!==reference.key||record.name!==reference.name||record.ext!==reference.ext||record.size!==reference.size||record.blob.size!==record.size||typeof record.content!=='string'||(reference.note!==undefined&&record.note!==reference.note))throw new Error('关联资料与记忆记录不一致，无法完整导出，请检查后重试。');
    }
    for(const record of records.values()){
      const {blob,...metadata}=record;
      files.push({...metadata,mime:blob.type,lastModified:blob.lastModified||0,dataBase64:await toBase64(blob)});
    }
    if(!crypto.subtle)throw new Error('当前环境无法生成导出文件，请使用支持的浏览器打开页面。');
    const payload={format:'agent-pc-memory-backup',version:1,createdAt:new Date().toISOString(),prototype:true,snapshot,files};
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
    const checksum=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const content=JSON.stringify({...payload,checksum},null,2);
    const blob=new Blob([content],{type:'application/json'});
    if(blob.size>maxFileBytes)throw new Error('导出文件超过 64 MB，无法完整导出。');
    return compressArchive(content);
  }
  function requestDownload(blob,name){
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.append(anchor);
    try{anchor.click();}
    catch(error){URL.revokeObjectURL(url);throw error;}
    finally{anchor.remove();}
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  async function startExport(){
    if(state==='exporting')return;
    const suggestedName=filename(new Date());
    setState('exporting');
    try{
      const blob=await createExport();
      requestDownload(blob,suggestedName);
      setState('download-ready','记忆文件已生成，请确认浏览器已保存文件。');button.focus();
    }catch(error){failed(error);}
  }
  button.addEventListener('click',startExport);
  setState('idle');
})();
