/* Local file import and text preview. This prototype does not create a model/RAG index. */
(() => {
  const root = document.querySelector('#memory');
  if (!root) return;
  const formats = ['md','txt','pdf','docx','xlsx','csv'];
  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const key = file => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
  let db;
  const ready = new Promise((resolve,reject) => {
    const request = indexedDB.open('agentPcX3Phase2MemoryFiles',1);
    request.onupgradeneeded = () => request.result.createObjectStore('files',{keyPath:'id'});
    request.onerror = () => reject(new Error('本地存储不可用，请检查浏览器设置。'));
    request.onblocked = () => reject(new Error('资料库正在被其他页面占用，请关闭其他二期页面后刷新。'));
    request.onsuccess = () => {db=request.result;resolve();};
  });
  async function stored(action, value) {
    await ready;
    return new Promise((resolve,reject) => {
      const tx=db.transaction('files',action==='getAll'?'readonly':'readwrite');
      const store=tx.objectStore('files');
      const request=store[action](...(value===undefined?[]:[value]));
      let result;
      request.onsuccess=()=>{result=request.result;};
      tx.oncomplete=()=>resolve(result);
      tx.onerror=tx.onabort=()=>reject(new Error('保存失败：本地存储空间不足或不可用。'));
    });
  }
  const libraries = new Map();
  function loadScript(name) {
    if (libraries.has(name)) return libraries.get(name);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=`assets/vendor/memory-import/${name}`;
      script.onload=resolve;script.onerror=()=>reject(new Error('解析组件加载失败，请保留 assets 文件夹并重新打开页面。'));
      document.head.append(script);
    }).catch(error=>{libraries.delete(name);throw error;});
    libraries.set(name,promise);return promise;
  }
  async function textFile(file) {
    const buffer=await file.arrayBuffer();
    try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
    catch(_){return new TextDecoder('gb18030').decode(buffer);}
  }
  async function extract(file,ext) {
    if (ext==='md'||ext==='txt') return {text:await textFile(file),note:'提取文字内容，保留标题与段落。'};
    if (ext==='csv'||ext==='xlsx') {
      await loadScript('xlsx.full.min.js');
      const workbook=ext==='csv'?XLSX.read(await textFile(file),{type:'string',raw:true}):XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:false,bookVBA:false});
      return {text:workbook.SheetNames.map(name=>`【${name}】\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name],{FS:'\t',RS:'\n',blankrows:false})}`).join('\n\n'),note:'提取表格内容；不执行宏，不重新计算公式。'};
    }
    if (ext==='docx') {
      await loadScript('mammoth.browser.min.js');
      const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      return {text:result.value,note:'提取正文和表格文字，不保留原文件排版。'};
    }
    await loadScript('pdf.js');await loadScript('pdf.worker.js');
    let pdf,loadingTask;
    try {
      loadingTask=pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),useWorkerFetch:false,isEvalSupported:false});
      pdf=await loadingTask.promise;
      const pages=[];let emptyPages=0;
      for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++) {
        const page=await pdf.getPage(pageNumber),content=await page.getTextContent();
        const text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
        if(text)pages.push(`【第 ${pageNumber} 页】\n${text}`);else emptyPages++;
      }
      if(!pages.length)throw new Error('未找到可提取文字；扫描版 PDF 暂不支持。');
      return {text:pages.join('\n\n'),note:emptyPages?`已提取文字页；${emptyPages} 页没有文字层，未提取。`:'已提取文字层，不保留原文件排版。'};
    } catch(error) {
      if(error.name==='PasswordException')throw new Error('文件已加密，请先解除密码保护再导入。');
      throw error;
    } finally {if(loadingTask)await loadingTask.destroy();}
  }
  // Parse into the editor draft. Files are written only when the memory is saved.
  window.phase2MemoryFiles = {
    formats,
    size,
    async stage(file) {
      const ext=file.name.split('.').pop().toLowerCase();
      if(!formats.includes(ext))throw new Error('暂不支持此格式。请选择 MD、TXT、PDF、DOCX、XLSX 或 CSV。');
      if(!file.size)throw new Error('文件为空。');
      const existing=(await stored('getAll')).find(record=>record.key===key(file));
      if(existing)return existing;
      const result=await extract(file,ext),content=result.text.replace(/\u0000/g,'').trim();
      if(!content)throw new Error('未找到可提取文字，请检查文件内容。');
      return {id:'file-'+crypto.randomUUID(),key:key(file),name:file.name,ext,size:file.size,content,note:result.note,blob:file,importedAt:Date.now()};
    },
    async commit(records) {
      if(!records.length)return;
      await ready;
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');
        for(const record of records)store.put(record);
        tx.oncomplete=resolve;
        tx.onerror=tx.onabort=()=>reject(new Error('资料保存失败：本地存储空间不足或不可用。'));
      });
    },
    get(id) {return stored('get',id);},
    key
  };
  // Capture storage failure without affecting manually created memories.
  ready.catch(()=>{});
})();
