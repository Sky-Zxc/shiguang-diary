import { useCallback, useEffect, useRef, useState } from 'react';
import { listDiaries, saveDiary } from './db';
import { pendingBlobs } from './resources';
import { photoKeys } from './model';
import type { Diary, SaveStatus } from './types';

export function useDiary() {
  const [diaries,setDiaries]=useState<Diary[]>([]);
  const [diary,setDiary]=useState<Diary|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [status,setStatus]=useState<SaveStatus>('saved');
  const [saveError,setSaveError]=useState('');
  const current=useRef<Diary|null>(null);
  const version=useRef(0),savedVersion=useRef(0),persistedRevision=useRef(0);
  const queue=useRef<Promise<boolean>>(Promise.resolve(true));
  const covers=useRef(new Map<string,string>());
  const refresh=useCallback(async()=>{
    setLoading(true);setLoadError('');
    try {const values=await listDiaries();setDiaries(values);return values;}
    catch{setLoadError('无法读取本地草稿，请检查浏览器是否允许此网站使用本地存储。');return [];}
    finally{setLoading(false);}
  },[]);
  const open=useCallback((value:Diary,isNew=false)=>{
    current.current=structuredClone(value);setDiary(current.current);
    version.current=isNew?1:0;savedVersion.current=0;persistedRevision.current=value.revision;
    setStatus(isNew?'pending':'saved');setSaveError('');
  },[]);
  useEffect(()=>{void refresh().then(values=>{
    const id=decodeURIComponent(location.hash.replace('#diary/',''));
    const value=values.find(d=>d.id===id);if(value)open(value);
  });},[refresh,open]);
  const commit=useCallback((update:(draft:Diary)=>Diary|void,touch=true)=>{
    if(!current.current)return;
    let next=structuredClone(current.current);
    next=update(next)??next;
    if(touch)next.updatedAt=new Date().toISOString();
    version.current++;current.current=next;setDiary(next);setStatus('pending');
  },[]);
  const saveNow=useCallback(()=>{
    const run=async()=>{
      const snapshot=current.current?structuredClone(current.current):null;
      if(!snapshot||version.current===savedVersion.current)return true;
      const snapshotVersion=version.current;
      if(covers.current.has(snapshot.id))snapshot.cover=covers.current.get(snapshot.id);
      setStatus('saving');
      try {
        const revision=await saveDiary(snapshot,pendingBlobs,persistedRevision.current);
        photoKeys(snapshot).forEach(key=>pendingBlobs.delete(key));
        if(current.current?.id===snapshot.id){
          persistedRevision.current=revision;savedVersion.current=snapshotVersion;
          current.current={...current.current,revision,cover:snapshot.cover};
          setDiary(current.current);setStatus(version.current===snapshotVersion?'saved':'pending');setSaveError('');
        }
        const saved={...snapshot,revision};
        setDiaries(values=>[saved,...values.filter(d=>d.id!==snapshot.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
        return true;
      } catch(error){
        const message=error instanceof DOMException&&error.name==='QuotaExceededError'
          ?'浏览器存储空间不足，草稿保存失败。请先导出当前记录，再清理历史记录后重试。'
          :error instanceof DOMException&&['SecurityError','InvalidStateError'].includes(error.name)
            ?'浏览器阻止了本地保存，请检查此网站的存储权限后重试。'
            :error instanceof Error?error.message:'草稿保存失败，请检查浏览器存储空间后重试。';
        setStatus('error');setSaveError(message);return false;
      }
    };
    queue.current=queue.current.then(run,run);
    return queue.current;
  },[]);
  useEffect(()=>{
    if(!diary||status!=='pending')return;
    const timer=setTimeout(()=>{void saveNow();},900);return()=>clearTimeout(timer);
  },[diary,status,saveNow]);
  useEffect(()=>{
    const before=(event:BeforeUnloadEvent)=>{if(current.current&&version.current!==savedVersion.current){event.preventDefault();event.returnValue='';}};
    const hidden=()=>{if(document.visibilityState==='hidden')void saveNow();};
    window.addEventListener('beforeunload',before);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('visibilitychange',hidden);};
  },[saveNow]);
  const close=useCallback(()=>{current.current=null;setDiary(null);version.current=0;savedVersion.current=0;},[]);
  const setCover=useCallback((id:string,url:string)=>{covers.current.set(id,url);},[]);
  return {diaries,diary,loading,loadError,status,saveError,open,commit,saveNow,close,refresh,setCover};
}
