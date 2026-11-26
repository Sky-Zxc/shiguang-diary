import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Check, CheckCircle2, FileDown, Leaf, LoaderCircle, RefreshCw } from 'lucide-react';
import { deleteDiary } from './db';
import { createDiary } from './model';
import { clearResourceCache } from './resources';
import { makeSample } from './samples';
import { useDiary } from './useDiary';
import { Home } from './Home';
import { Editor } from './Editor';
import { Modal } from './ui';
import { downloadFile, generateExport, type ExportFile } from './exporter';
import type { Diary } from './types';

interface Confirmation { title:string;description:string;danger:boolean;resolve:(value:boolean)=>void }
interface ExportState { status:'working'|'success'|'error';message:string;file?:ExportFile;url?:string }
export default function App(){
  const session=useDiary();
  const [toast,setToast]=useState('');
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null);
  const [creating,setCreating]=useState(false);
  const [exportState,setExportState]=useState<ExportState|null>(null);
  const exportLock=useRef(false),creationLock=useRef(false);
  const exportRequest=useRef<{diary:Diary;format:'png'|'pdf'}|null>(null);
  const notify=useCallback((message:string)=>setToast(message),[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer);},[toast]);
  const ask=useCallback((title:string,description:string,danger=false)=>new Promise<boolean>(resolve=>{setConfirmation({title,description,danger,resolve});}),[]);
  const answer=(value:boolean)=>{confirmation?.resolve(value);setConfirmation(null);};
  const open=(diary:Diary,isNew=false)=>{
    session.open(diary,isNew);history.pushState(null,'',`#diary/${diary.id}`);window.scrollTo(0,0);
  };
  const newDiary=async(sampleIndex?:number)=>{
    if(creationLock.current)return;
    creationLock.current=true;setCreating(true);
    try{const diary=sampleIndex===undefined?createDiary():await makeSample(sampleIndex);open(diary,true);}
    catch(error){notify(error instanceof Error?error.message:'创建失败，请重试。');}
    finally{setCreating(false);creationLock.current=false;}
  };
  const goHome=async()=>{
    if(exportLock.current)return;
    const saved=await session.saveNow();
    if(!saved&&!await ask('草稿尚未保存，仍然离开？','最近修改尚未写入本地。建议取消后重试保存或先导出文件；继续离开将丢失尚未保存的内容。',true))return;
    session.close();clearResourceCache();history.pushState(null,'',location.pathname);void session.refresh();window.scrollTo(0,0);
  };
  // Keep browser Back/Forward aligned with the same save safeguards as the in-app Back button.
  useEffect(()=>{
    const navigate=async()=>{
      if(!session.diary&&!location.hash.startsWith('#diary/'))return;
      if(exportLock.current){history.pushState(null,'',session.diary?`#diary/${session.diary.id}`:location.pathname);return;}
      const id=location.hash.startsWith('#diary/')?decodeURIComponent(location.hash.slice(7)):'';
      if(id===session.diary?.id)return;
      if(session.diary){
        const saved=await session.saveNow();
        if(!saved&&!await ask('草稿尚未保存，仍然离开？','继续将丢失未保存的修改。建议取消后导出文件或重试保存。',true)){history.pushState(null,'',`#diary/${session.diary.id}`);return;}
      }
      const list=await session.refresh();const next=list.find(d=>d.id===id);
      if(next)session.open(next);else{session.close();clearResourceCache();}
    };
    window.addEventListener('popstate',navigate);return()=>window.removeEventListener('popstate',navigate);
  },[session.diary,session.saveNow,session.refresh,session.open,session.close,ask]);
  const removeDiary=async(diary:Diary)=>{
    if(await ask(`删除「${diary.title||'未命名日记本'}」？`,'此操作会移除此浏览器中的日记本与未被其他页面引用的照片，无法撤销。已下载的文件不受影响。',true)){
      try{await deleteDiary(diary.id);await session.refresh();notify('日记本已删除');}
      catch{notify('删除失败，请检查浏览器存储权限后重试。');}
    }
  };
  const runExport=async(source:Diary,format:'png'|'pdf')=>{
    if(exportLock.current)return;
    exportLock.current=true;exportRequest.current={diary:source,format};
    if(exportState?.url)URL.revokeObjectURL(exportState.url);
    setExportState({status:'working',message:'正在准备照片与手写字体…'});
    try{
      // A failed local save does not prevent rescuing the in-memory diary through export.
      if(session.diary?.id===source.id)await session.saveNow();
      const snapshot=structuredClone(source);
      const file=await generateExport(snapshot,format,snapshot.lastActivePageId,message=>setExportState({status:'working',message}));
      const url=downloadFile(file);
      setExportState({status:'success',message:format==='pdf'?`已生成 ${snapshot.pages.length} 页 PDF`:'当前页高清图片已生成',file,url});
    }catch(error){setExportState({status:'error',message:error instanceof Error?error.message:'导出失败，请重试。'});}
    finally{exportLock.current=false;}
  };
  const closeExport=()=>{if(exportLock.current)return;if(exportState?.url)URL.revokeObjectURL(exportState.url);setExportState(null);};
  return <>
    {session.diary?<Editor diary={session.diary} commit={session.commit} status={session.status} saveError={session.saveError} locked={exportState?.status==='working'} onHome={()=>void goHome()} onSave={session.saveNow} onExport={format=>void runExport(session.diary!,format)} onCover={session.setCover} ask={ask} notify={notify}/>:<Home diaries={session.diaries} loading={session.loading} error={session.loadError} creating={creating} onNew={()=>void newDiary()} onSample={index=>void newDiary(index)} onOpen={diary=>open(diary)} onDelete={diary=>void removeDiary(diary)} onExport={diary=>void runExport(diary,'pdf')} onRetry={()=>void session.refresh()}/>}
    {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="关闭提示">×</button></div>}
    {confirmation&&<Modal label={confirmation.title} onClose={()=>answer(false)}><div className={`modal-symbol ${confirmation.danger?'destructive':''}`}>{confirmation.danger?<AlertTriangle size={25}/>:<Leaf size={26}/>}</div><h2>{confirmation.title}</h2><p>{confirmation.description}</p><div className="modal-actions"><button className="btn outline" onClick={()=>answer(false)} autoFocus>取消</button><button className={`btn ${confirmation.danger?'danger-solid':'primary'}`} onClick={()=>answer(true)}>确认{confirmation.danger?'操作':''}</button></div></Modal>}
    {exportState&&<Modal className="export-modal" label="导出日记本" locked={exportState.status==='working'} onClose={closeExport}><div className={`modal-symbol ${exportState.status==='error'?'destructive':''}`}>{exportState.status==='working'?<LoaderCircle size={29} className="spin"/>:exportState.status==='success'?<CheckCircle2 size={29}/>:<AlertTriangle size={27}/>}</div><span className="eyebrow">KEEP YOUR LITTLE MOMENTS</span><h2>{exportState.status==='working'?'把回忆装进文件':exportState.status==='success'?'喜欢的日子，可以带走了':'这次没能完成导出'}</h2><p role={exportState.status==='error'?'alert':'status'}>{exportState.message}</p>{exportState.status==='working'?<div className="export-progress"><span/></div>:exportState.status==='success'?<><div className="export-file"><FileDown size={23}/><span>{exportState.file?.name}<small>{((exportState.file?.blob.size??0)/1024/1024).toFixed(2)} MB · {exportState.file?.name.endsWith('.png')?'1600 × 2000 px':'4:5 原比例页面'}</small></span></div><p className="field-hint">已发起浏览器下载。如未开始，可再次点击下载。</p><div className="modal-actions"><button className="btn outline" onClick={closeExport}>完成</button><a className="btn primary" href={exportState.url} download={exportState.file?.name}><ArrowDownToLine size={16}/>再次下载</a></div></>:<div className="modal-actions"><button className="btn outline" onClick={closeExport}>返回编辑</button><button className="btn primary" onClick={()=>{const request=exportRequest.current;if(request)void runExport(session.diary?.id===request.diary.id?session.diary:request.diary,request.format);}}><RefreshCw size={16}/>重试导出</button></div>}</Modal>}
  </>;
}
