import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, CheckCheck, Copy, Download, FileDown, ImagePlus, Leaf, LoaderCircle, MapPin, Palette, Plus, RefreshCw, Save, ShieldCheck, Shuffle, Trash2, Upload, X } from 'lucide-react';
import type { Diary, DiaryPage, Layout, Photo, SaveStatus, StickerType, Template } from './types';
import { addPage, applyStyle, MAX_PHOTOS, MAX_STICKERS, removePage, uid } from './model';
import { photoUrl, preparePhoto } from './resources';
import { CanvasPreview } from './CanvasPreview';
import { cuteStickerUrl, STICKER_CATALOG } from './cuteArt';
import { PAPER_COLORS, THEMES, themeArtUrl, themeStyle } from './themes';
import { resetPhotoBounds } from './photoGeometry';
import { Brand, SectionTitle } from './ui';

type Ask = (title:string,description:string,danger?:boolean)=>Promise<boolean>;
interface Props {
  diary:Diary;status:SaveStatus;saveError:string;locked:boolean;
  commit:(update:(diary:Diary)=>Diary|void,touch?:boolean)=>void;
  onHome:()=>void;onSave:()=>Promise<boolean>;onExport:(format:'png'|'pdf')=>void;
  onCover:(id:string,url:string)=>void;ask:Ask;notify:(message:string)=>void;
}
const layouts:{id:Layout;label:string;cells:number}[]=[{id:'polaroid',label:'拍立得',cells:1},{id:'duo',label:'双图并排',cells:2},{id:'scattered',label:'错落拼贴',cells:3},{id:'grid',label:'四宫格',cells:4},{id:'tape',label:'胶带贴图',cells:2}];
const paperOptions:{id:Template['paper'];label:string}[]=[{id:'cream',label:'米白'},{id:'kraft',label:'牛皮纸'},{id:'yellow',label:'淡黄'},{id:'grid',label:'格纹'},{id:'lined',label:'横线'},{id:'blush',label:'樱粉'},{id:'mint',label:'薄荷'},{id:'sky',label:'晴蓝'},{id:'lavender',label:'香芋'}];
const borderOptions:{id:Template['border'];label:string}[]=[{id:'wavy',label:'手绘波浪'},{id:'tape',label:'胶带边框'},{id:'torn',label:'自然撕纸'}];
const colors=[{value:'#514b3c',name:'暖墨棕'},{value:'#6b7857',name:'橄榄绿'},{value:'#a26154',name:'砖红'},{value:'#546e84',name:'雾蓝'},{value:'#755b7d',name:'烟紫'},{value:'#9a742c',name:'赭黄'}];
function StickerArt({type}:{type:StickerType}){
  const url=cuteStickerUrl(type);
  if(url)return <img className="sticker-art" src={url} alt="" aria-hidden="true"/>;
  return <svg className="sticker-art" viewBox="0 0 70 64" aria-hidden="true">
    {type==='tape'&&<><path d="m8 21 53-5-2 7 4 5-2 6 3 6-53 5 1-7-4-5 3-5Z" fill="#a5af8c"/><path d="m19 21 3 19m9-20 3 19m9-20 3 19" stroke="#798561" strokeWidth="1" opacity=".5"/></>}
    {type==='stamp'&&<><path d="M17 7h36v49H17z" fill="#ecddc3" stroke="#9c7763" strokeWidth="2" strokeDasharray="3 3"/><path d="M22 12h26v32H22z" fill="none" stroke="#9c7763"/><circle cx="35" cy="28" r="9" fill="#85916d"/><path d="m28 50 15-1" stroke="#9c7763"/></>}
    {type==='arrow'&&<path d="M9 45c31 14 12-45 49-23M46 10l14 13-18 4" stroke="#6e7c59" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
    {type==='star'&&<><path d="m36 10 6 15 16 1-12 11 4 16-14-8-14 8 3-16-12-11 17-1Z" fill="#d7a46c" stroke="#8c634d" strokeWidth="1.5"/><path d="m10 10 4 5m45 30 6 1" stroke="#8c634d" strokeWidth="2" strokeLinecap="round"/></>}
    {type==='heart'&&<path d="M35 53C-12 27 18 1 35 21 52 0 83 28 35 53Z" fill="#dcada0" stroke="#ae6f65" strokeWidth="2"/>}
  </svg>;
}
function PhotoThumb({photo,selected,onSelect,onReplace,onDelete,onMove,onDrag,onDrop,index,total}:{photo:Photo;selected:boolean;onSelect:()=>void;onReplace:()=>void;onDelete:()=>void;onMove:(delta:number)=>void;onDrag:()=>void;onDrop:()=>void;index:number;total:number}){
  const [url,setUrl]=useState(''),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;setFailed(false);void photoUrl(photo.blobKey).then(value=>{if(active)setUrl(value);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[photo.blobKey]);
  return <div className={`photo-thumb ${selected?'selected':''}`} draggable onDragStart={event=>{event.dataTransfer.setData('text/plain',photo.id);event.dataTransfer.effectAllowed='move';onDrag();}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();onDrop();}}>
    <button className="photo-select" onClick={onSelect} aria-label={`选中照片 ${index+1}`} title={photo.name}>{url?<img src={url} alt={photo.name}/>:<span>{failed?'照片失效':'加载中'}</span>}<b>{index+1}</b></button>
    <div className="photo-tools"><button onClick={onReplace} aria-label={`替换照片 ${index+1}`} title="替换"><RefreshCw size={12}/></button><button onClick={onDelete} aria-label={`删除照片 ${index+1}`} title="删除"><X size={13}/></button><button onClick={()=>onMove(-1)} disabled={index===0} aria-label={`前移照片 ${index+1}`} title="前移"><ArrowUp size={12}/></button><button onClick={()=>onMove(1)} disabled={index===total-1} aria-label={`后移照片 ${index+1}`} title="后移"><ArrowDown size={12}/></button></div>
  </div>;
}

export function Editor({diary,status,saveError,locked,commit,onHome,onSave,onExport,onCover,ask,notify}:Props){
  const page=diary.pages.find(p=>p.id===diary.lastActivePageId)??diary.pages[0];
  const pageIndex=diary.pages.findIndex(p=>p.id===page.id);
  const [selected,setSelected]=useState('');
  const [drawer,setDrawer]=useState(false);
  const [stickerGroup,setStickerGroup]=useState('all');
  const [mobilePanel,setMobilePanel]=useState<'content'|'preview'|'style'>(()=>page.photos.length||page.text.title||page.text.body?'preview':'content');
  const [narrow,setNarrow]=useState(()=>window.matchMedia('(max-width: 767px)').matches);
  useEffect(()=>{const media=window.matchMedia('(max-width: 767px)');const update=()=>setNarrow(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const mobileTabs=useRef<HTMLElement>(null);
  const switchMobilePanel=(panel:'content'|'preview'|'style')=>{setMobilePanel(panel);if(narrow)requestAnimationFrame(()=>mobileTabs.current?.scrollIntoView({block:'start',behavior:'instant'}));};
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState('');
  const [dropActive,setDropActive]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const replaceTarget=useRef<{pageId:string;photoId:string}|null>(null);
  const dragId=useRef('');
  const diaryRef=useRef(diary);diaryRef.current=diary;
  const uploadLock=useRef(false);
  useEffect(()=>{setSelected('');setUploadError('');},[page.id]);
  const updatePage=(update:(page:DiaryPage)=>void,id=page.id)=>commit(d=>{const target=d.pages.find(p=>p.id===id);if(target)update(target);});
  const updateText=(key:keyof DiaryPage['text'],value:string)=>updatePage(p=>{p.text[key]=value;});
  const updateTemplate=(update:Partial<Template>)=>updatePage(p=>{p.template={...p.template,...update};});
  const pickFiles=(replaceId?:string)=>{replaceTarget.current=replaceId?{pageId:page.id,photoId:replaceId}:null;if(fileInput.current){fileInput.current.multiple=!replaceId;fileInput.current.click();}};
  const importFiles=async(files:FileList|File[])=>{
    if(uploadLock.current||locked)return;
    const target=replaceTarget.current;replaceTarget.current=null;
    const targetId=target?.pageId??page.id;
    const original=diaryRef.current.pages.find(p=>p.id===targetId);
    if(!original)return;
    const limit=target?1:MAX_PHOTOS-original.photos.length;
    const chosen=Array.from(files);
    if(!chosen.length)return;
    const errors:string[]=[];
    if(chosen.length>limit)errors.push(`最多再添加 ${Math.max(0,limit)} 张照片，超出部分未添加。`);
    uploadLock.current=true;setUploading(true);setUploadError('');
    const prepared:Photo[]=[];
    try{
      for(const file of chosen.slice(0,limit)){
        try{prepared.push(await preparePhoto(file));}catch(error){errors.push(error instanceof Error?error.message:'照片处理失败，请重试。');}
      }
      if(prepared.length)commit(d=>{
        const targetPage=d.pages.find(p=>p.id===targetId);if(!targetPage)return;
        if(target){const index=targetPage.photos.findIndex(p=>p.id===target.photoId);if(index>=0)targetPage.photos[index]={...prepared[0],id:target.photoId,frame:targetPage.photos[index].frame,rotation:targetPage.photos[index].rotation,bounds:targetPage.photos[index].bounds};}
        else {resetPhotoBounds(targetPage);targetPage.photos.push(...prepared.slice(0,MAX_PHOTOS-targetPage.photos.length));}
      });
      if(prepared.length)notify(`已${target?'替换':'添加'} ${prepared.length} 张照片`);
    }finally{setUploading(false);uploadLock.current=false;setUploadError(errors.join('\n'));if(fileInput.current)fileInput.current.value='';}
  };
  const reorder=(id:string,targetIndex:number)=>updatePage(p=>{const index=p.photos.findIndex(photo=>photo.id===id);if(index<0||index===targetIndex||targetIndex<0||targetIndex>=p.photos.length)return;const [photo]=p.photos.splice(index,1);p.photos.splice(targetIndex,0,photo);resetPhotoBounds(p);});
  const newPage=(copy=false)=>{if(diary.pages.length>=3)return;commit(d=>addPage(d,copy?page.id:undefined));};
  const deleteCurrent=async()=>{if(diary.pages.length<=1)return;if(await ask('删除这一页？',`第 ${pageIndex+1} 页的照片、文字和装饰会被移除，此操作无法撤销。`,true))commit(d=>removePage(d,page.id));};
  const applyToOthers=async()=>{if(await ask('让其他页也用这个风格？','将覆盖其他页的主题模板、纸张、边框、字体、文字颜色和字号。照片、文字、贴纸及拼贴布局保持原样。')){commit(d=>applyStyle(d,page.id));notify('已将当前页样式应用到其他页');}};
  const addSticker=(type:StickerType)=>{if(page.stickers.length>=MAX_STICKERS){notify('每页最多添加 8 个贴纸');return;}const id=uid();updatePage(p=>{const used=new Set(p.stickers.map(s=>s.position));const position=Array.from({length:8},(_,i)=>i).find(i=>!used.has(i))??0;p.stickers.push({id,type,position,rotation:Math.random()*20-10});});setSelected(id);};
  const selectedSticker=page.stickers.find(s=>s.id===selected);
  const selectedPhoto=page.photos.find(p=>p.id===selected);
  const changePage=(id:string)=>{commit(d=>{d.lastActivePageId=id;},false);void onSave();};
  const stylesPanel=<>
    <div className="panel-title"><Palette size={17}/><h2>让这一页，更像你</h2><button className="icon-button drawer-close" aria-label="关闭样式面板" onClick={()=>setDrawer(false)}><X size={19}/></button></div>
    <section className="control-section theme-section"><SectionTitle number="01" title="挑一个手绘模板"><span className="count-label">6 款新风格</span></SectionTitle><div className="theme-options">{THEMES.map(theme=><button key={theme.id} className={`theme-option ${(page.template.theme??'classic')===theme.id?'active':''}`} aria-label={`使用${theme.label}模板`} aria-pressed={(page.template.theme??'classic')===theme.id} onClick={()=>updateTemplate(themeStyle(theme.id))}><span className="theme-preview" style={{backgroundColor:PAPER_COLORS[theme.style.paper??'cream'],backgroundImage:themeArtUrl(theme.id)?`url("${themeArtUrl(theme.id)}")`:undefined}}>{theme.mascot?<StickerArt type={theme.mascot}/>:<Leaf size={28}/>}<i/><i/></span><span className="theme-name">{theme.label}{(page.template.theme??'classic')===theme.id&&<Check size={12}/>}</span><small>{theme.caption}</small></button>)}</div><p className="field-hint">模板搭配纸张、边框和字色，照片、文字与自由贴纸会保留。</p></section>
    <section className="control-section"><SectionTitle number="02" title="纸张风格"/><div className="paper-options">{paperOptions.map(paper=><button key={paper.id} className={`paper-option ${paper.id} ${page.template.paper===paper.id?'active':''}`} aria-pressed={page.template.paper===paper.id} onClick={()=>updateTemplate({paper:paper.id})}><span>{page.template.paper===paper.id&&<Check size={16}/>}</span><small>{paper.label}</small></button>)}</div></section>
    <section className="control-section"><SectionTitle number="03" title="手绘边框"/><div className="border-options">{borderOptions.map(border=><button key={border.id} className={`border-option ${border.id} ${page.template.border===border.id?'active':''}`} aria-pressed={page.template.border===border.id} onClick={()=>updateTemplate({border:border.id})}><span/><small>{border.label}</small></button>)}</div></section>
    <section className="control-section"><SectionTitle number="04" title="字里行间"/><label className="field-label" htmlFor="font-choice">手写字体</label><div className="font-options" id="font-choice"><button className={page.template.font==='mashan'?'active':''} style={{fontFamily:'MaShan'}} onClick={()=>updateTemplate({font:'mashan'})} aria-pressed={page.template.font==='mashan'}>山野手记<small>自然 · 随性</small></button><button className={page.template.font==='zhimang'?'active':''} style={{fontFamily:'ZhiMang'}} onClick={()=>updateTemplate({font:'zhimang'})} aria-pressed={page.template.font==='zhimang'}>风的来信<small>轻盈 · 洒脱</small></button></div><div className="field-label">文字颜色</div><div className="color-options">{colors.map(color=><button key={color.value} style={{background:color.value}} className={page.template.textColor===color.value?'active':''} aria-pressed={page.template.textColor===color.value} aria-label={color.name} title={color.name} onClick={()=>updateTemplate({textColor:color.value})}>{page.template.textColor===color.value&&<Check size={14}/>}</button>)}</div><div className="size-row"><span className="field-label">正文字号</span><div className="segmented">{[14,16,18].map(size=><button key={size} className={page.template.fontSize===size?'active':''} aria-pressed={page.template.fontSize===size} onClick={()=>updateTemplate({fontSize:size})}>{size}</button>)}</div></div></section>
    <section className="control-section"><SectionTitle number="05" title="贴一点小心情"><span className="count-label">{page.stickers.length}/8</span></SectionTitle><div className="sticker-filters" aria-label="贴纸分类">{[{id:'all',label:'全部'},{id:'faces',label:'小表情'},{id:'decor',label:'小装饰'},{id:'classic',label:'手绘基础'}].map(group=><button key={group.id} aria-pressed={stickerGroup===group.id} onClick={()=>setStickerGroup(group.id)}>{group.label}</button>)}</div><div className="sticker-options cute-sticker-options">{STICKER_CATALOG.filter(sticker=>stickerGroup==='all'||sticker.group===stickerGroup).map(sticker=><button key={sticker.type} onClick={()=>addSticker(sticker.type)} disabled={page.stickers.length>=8} aria-label={`添加${sticker.label}`}><StickerArt type={sticker.type}/><small>{sticker.label}</small></button>)}</div>{page.stickers.length>0&&<div className="added-stickers">{page.stickers.map((sticker,i)=><button key={sticker.id} onClick={()=>setSelected(sticker.id)} className={selected===sticker.id?'active':''} aria-label={`选中贴纸 ${i+1}`}><StickerArt type={sticker.type}/></button>)}</div>}{selectedSticker&&<div className="sticker-controls"><label>贴纸位置<select aria-label="贴纸位置" value={selectedSticker.center?'custom':selectedSticker.position} onChange={event=>updatePage(p=>{const item=p.stickers.find(s=>s.id===selected);if(item){item.position=Number(event.target.value);delete item.center;}})}>{selectedSticker.center&&<option value="custom" disabled>自由位置（拖动调整）</option>}{['右上角','左上角','右侧中部','左侧中部','右下角','左下角','顶部中间','底部中间'].map((label,i)=><option value={i} key={label}>{label}</option>)}</select></label><button className="icon-button danger" aria-label="删除选中贴纸" onClick={()=>{updatePage(p=>{p.stickers=p.stickers.filter(s=>s.id!==selected);});setSelected('');}}><Trash2 size={16}/></button><button className="text-button sticker-preview-button" onClick={()=>{setDrawer(false);if(narrow)switchMobilePanel('preview');}}>在预览中拖动</button></div>}<button className="btn dashed full small" disabled={!page.stickers.length} onClick={()=>updatePage(p=>{const slots=Array.from({length:8},(_,i)=>i);for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}p.stickers.forEach((sticker,i)=>{sticker.position=slots[i];delete sticker.center;sticker.rotation=Math.random()*20-10;});})}><Shuffle size={14}/>随机装饰这一页</button><p className="field-hint">选中预览中的贴纸即可自由拖动，也可选择预设位置。</p></section>
    <div className="apply-style"><button className="text-button" disabled={diary.pages.length===1} onClick={()=>void applyToOthers()}><Copy size={14}/>将当前页样式应用到其他页</button><p>每页风格独立，喜欢什么就选什么。</p></div>
  </>;
  return <div className={`editor-page ${locked?'is-locked':''}`} data-mobile-panel={mobilePanel}>
    <header className="editor-header"><button className="editor-back icon-button" onClick={onHome} disabled={uploading||locked} aria-label="返回首页"><ArrowLeft size={20}/></button><Brand compact/><span className="header-divider"/><input className="diary-title-input" aria-label="日记本标题" value={diary.title} maxLength={30} disabled={locked} onChange={e=>commit(d=>{d.title=e.target.value;})}/><div className={`save-status ${status}`} role="status">{status==='saved'?<CheckCheck size={15}/>:status==='error'?<RefreshCw size={14}/>:<LoaderCircle className={status==='saving'?'spin':''} size={14}/>}<span>{{saved:'已保存至本地',pending:'有更改待保存',saving:'保存中…',error:'保存失败'}[status]}</span>{status==='error'&&<button onClick={()=>void onSave()}>重试</button>}</div><span className="private-label"><ShieldCheck size={15}/>私密记录</span></header>
    <div className="editor-pagebar"><div className="page-tabs" role="tablist" aria-label="日记页面">{diary.pages.map((p,i)=><button key={p.id} role="tab" aria-selected={p.id===page.id} className={p.id===page.id?'active':''} disabled={locked} onClick={()=>changePage(p.id)}><span>{String(i+1).padStart(2,'0')}</span>第 {i+1} 页</button>)}<button className="add-page" disabled={diary.pages.length>=3||locked} title={diary.pages.length>=3?'最多支持 3 页':'添加新的一页'} onClick={()=>newPage()}><Plus size={16}/>添加页 <small>{diary.pages.length}/3</small></button></div><span className="pagebar-note"><Leaf size={14}/>每一页，都是生活的切片</span><button className="btn small style-toggle" onClick={()=>setDrawer(true)}><Palette size={16}/>纸张与装饰</button></div>
    {saveError&&<div className="save-error" role="alert">{saveError}<button onClick={()=>void onSave()}>重试保存</button></div>}
    <nav ref={mobileTabs} className="mobile-editor-tabs" aria-label="编辑工具">{([{id:'content',label:'内容',icon:Upload},{id:'preview',label:'预览',icon:ImagePlus},{id:'style',label:'装饰',icon:Palette}] as const).map(({id,label,icon:Icon})=><button key={id} aria-pressed={mobilePanel===id} aria-controls={`editor-${id}`} disabled={locked} onClick={()=>switchMobilePanel(id)}><Icon size={17}/>{label}</button>)}</nav>
    <fieldset className="editor-body" disabled={locked}>
      <aside className="content-panel" id="editor-content"><div className="panel-title"><FeatherIcon/><h2>今天，想记录什么？</h2></div><div className="panel-scroll">
        <section className="control-section"><SectionTitle number="01" title="留下光影"><span className="count-label">{page.photos.length}/6 张</span></SectionTitle><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple={!replaceTarget.current} className="visually-hidden" aria-label="上传照片" onChange={e=>{if(e.target.files)void importFiles(e.target.files);}}/><button className={`upload-zone ${dropActive?'drag-active':''}`} disabled={uploading||page.photos.length>=6} onClick={()=>pickFiles()} onDragOver={e=>{e.preventDefault();setDropActive(true);}} onDragLeave={()=>setDropActive(false)} onDrop={e=>{e.preventDefault();setDropActive(false);replaceTarget.current=null;if(e.dataTransfer.files.length)void importFiles(e.dataTransfer.files);}}>{uploading?<LoaderCircle size={25} className="spin"/>:<ImagePlus size={27} strokeWidth={1.4}/>}<b>{uploading?'正在整理照片…':page.photos.length>=6?'这一页的照片已满':narrow?'点击添加照片':'点击或拖入照片'}</b><small>JPG / PNG / WebP · 每张不超过 10MB</small></button>{uploadError&&<p className="field-error" role="alert">{uploadError}<button className="text-button" onClick={()=>pickFiles()}>重新选择照片</button></p>}
          {page.photos.length>0&&<div className="photo-list">{page.photos.map((photo,index)=><PhotoThumb photo={photo} key={photo.id} selected={photo.id===selected} index={index} total={page.photos.length} onSelect={()=>setSelected(photo.id)} onReplace={()=>pickFiles(photo.id)} onDelete={()=>{updatePage(p=>{p.photos=p.photos.filter(item=>item.id!==photo.id);resetPhotoBounds(p);});if(selected===photo.id)setSelected('');}} onMove={delta=>reorder(photo.id,index+delta)} onDrag={()=>{dragId.current=photo.id;}} onDrop={()=>reorder(dragId.current,index)}/>)}</div>}
          {selectedPhoto&&<div className="photo-frame"><label className="field-label" htmlFor="photo-frame">照片相框</label><select id="photo-frame" value={selectedPhoto.frame} onChange={event=>updatePage(p=>{const item=p.photos.find(photo=>photo.id===selected);if(item)item.frame=event.target.value as Photo['frame'];})}><option value="white">白边拍立得</option><option value="rounded">温柔圆角</option><option value="shadow">立体阴影</option></select><button className="text-button reset-photo-size" disabled={!selectedPhoto.bounds} onClick={()=>updatePage(p=>{const photo=p.photos.find(item=>item.id===selected);if(photo)delete photo.bounds;})}><RefreshCw size={12}/>恢复自动背景大小</button><p className="field-hint">自动相框贴合照片比例；也可拖动预览外框调整背景宽高。</p></div>}
          <label className="field-label">照片排版</label><div className="layout-options">{layouts.map(layout=><button key={layout.id} className={page.layout===layout.id?'active':''} aria-pressed={page.layout===layout.id} title={layout.label} onClick={()=>updatePage(p=>{if(p.layout!==layout.id){p.layout=layout.id;resetPhotoBounds(p);}})}><span className={`layout-icon layout-${layout.id}`}>{Array.from({length:layout.cells},(_,i)=><i key={i}/>)}</span><small>{layout.label}</small></button>)}</div><p className="field-hint">照片按数量自动适配；更换排版、增删或排序照片会重置手动大小。</p>
        </section>
        <section className="control-section text-inputs"><SectionTitle number="02" title="写下小事"/><label htmlFor="page-title">给今天起个名字 <small>{Array.from(page.text.title).length}/30</small></label><input id="page-title" placeholder="例如：把周末交给山野" maxLength={30} value={page.text.title} onChange={e=>updateText('title',e.target.value)}/><label htmlFor="page-body">日记正文 <small className={Array.from(page.text.body).length>500?'over-limit':''}>{Array.from(page.text.body).length}/500</small></label><textarea id="page-body" placeholder="今天发生了什么？哪怕只是喝到了一杯好喝的咖啡，也值得被记住。" maxLength={5000} value={page.text.body} onChange={e=>updateText('body',e.target.value)} rows={6}/>{Array.from(page.text.body).length>500&&<p className="field-error">内容较多，建议精简或调整字号。最多输入 5000 字。</p>}<div className="metadata-row"><label htmlFor="page-date"><CalendarDays size={13}/>日期<input id="page-date" type="date" value={page.text.date} onChange={e=>updateText('date',e.target.value)}/></label></div><div className="metadata-row"><label htmlFor="page-mood">今天的心情<select id="page-mood" value={page.text.mood} onChange={e=>updateText('mood',e.target.value)}>{['开心','平静','期待','治愈','疲惫','有点难过',''].map(mood=><option key={mood} value={mood}>{mood||'不显示'}</option>)}</select></label><label htmlFor="page-weather">天气<select id="page-weather" value={page.text.weather} onChange={e=>updateText('weather',e.target.value)}>{['晴天','多云','小雨','下雪',''].map(weather=><option key={weather} value={weather}>{weather||'不显示'}</option>)}</select></label></div><label htmlFor="page-location"><MapPin size={13}/>在哪里 <small>可选</small></label><input id="page-location" maxLength={40} placeholder="给回忆留一个坐标" value={page.text.location} onChange={e=>updateText('location',e.target.value)}/></section>
        <p className="panel-bottom-note"><ShieldCheck size={13}/>照片在本地处理，不会上传服务器</p>
      </div></aside>
      <main className="canvas-area" id="editor-preview"><div className="canvas-toolbar"><span><span className="live-dot"/>实时预览</span><small>4:5 · 导出 1600 × 2000 px</small></div><div className="canvas-stage"><CanvasPreview key={page.id} page={page} selected={selected} interactive={!locked} onResize={(id,bounds)=>updatePage(p=>{const photo=p.photos.find(item=>item.id===id);if(photo)photo.bounds=bounds;})} onSelect={id=>setSelected(id)} onMoveSticker={(id,center)=>updatePage(p=>{const sticker=p.stickers.find(item=>item.id===id);if(sticker)sticker.center=center;})} onCover={page.id===diary.pages[0].id?url=>onCover(diary.id,url):undefined}/></div><div className="canvas-bottom"><span>第 {pageIndex+1} 页 <i>/</i> 共 {diary.pages.length} 页</span><div><button className="text-button" onClick={()=>newPage(true)} disabled={diary.pages.length>=3} title={diary.pages.length>=3?'最多支持 3 页':'复制当前页'}><Copy size={14}/>复制此页</button><button className="text-button danger" onClick={()=>void deleteCurrent()} disabled={diary.pages.length<=1||uploading} title={diary.pages.length<=1?'至少保留 1 页':'删除当前页'}><Trash2 size={14}/>删除此页</button></div></div><p className="canvas-gentle-note">不必写得很特别，真实就很好。</p></main>
      {drawer&&<button className="drawer-scrim" aria-label="关闭装饰抽屉" onClick={()=>setDrawer(false)}/>}
      <aside className={`style-panel ${drawer?'drawer-open':''}`} id="editor-style"><div className="panel-scroll">{stylesPanel}</div></aside>
    </fieldset>
    <footer className="editor-footer"><span><Leaf size={15}/>把今天，留给以后的自己。</span><div className="footer-actions"><button className="btn save-button" aria-label="保存草稿" onClick={()=>void onSave().then(ok=>{if(ok)notify('草稿已保存至当前浏览器');})} disabled={locked||uploading}><Save size={16}/><span className="desktop-action-label">保存草稿</span><span className="mobile-action-label">保存</span></button><button className="btn outline" aria-label="导出当前页 PNG" onClick={()=>onExport('png')} disabled={locked||uploading}><ImagePlus size={16}/><span className="desktop-action-label">导出当前页 PNG</span><span className="mobile-action-label">导出 PNG</span></button><button className="btn primary" aria-label="导出整本 PDF" onClick={()=>onExport('pdf')} disabled={locked||uploading}><FileDown size={17}/><span className="desktop-action-label">导出整本 PDF</span><span className="mobile-action-label">导出 PDF</span><Download size={15}/></button></div></footer>
  </div>;
}
function FeatherIcon(){return <Upload size={17}/>;}
