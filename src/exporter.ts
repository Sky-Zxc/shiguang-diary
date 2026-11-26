import { localDate } from './model';
import { renderPage } from './renderer';
import type { Diary } from './types';
export interface ExportFile { blob: Blob; name: string }
export async function generateExport(diary: Diary, format: 'png'|'pdf', currentId: string, onProgress: (value: string) => void): Promise<ExportFile> {
  const pages=format==='png'?diary.pages.filter(p=>p.id===currentId):diary.pages;
  if(!pages.length)throw new Error('待导出的页面不存在，请重新打开日记本。');
  const canvases: HTMLCanvasElement[]=[];
  for(let i=0;i<pages.length;i++){
    onProgress(`正在生成${format==='pdf'?' PDF':'高清图片'}（${i+1}/${pages.length}）…`);
    await new Promise(resolve=>setTimeout(resolve,30));
    const result=await renderPage(pages[i],{scale:2,strict:true});
    if(result.overflow)throw new Error(`第 ${diary.pages.findIndex(p=>p.id===pages[i].id)+1} 页文字超出版式，请精简内容或调小字号后重试。`);
    canvases.push(result.canvas);
  }
  const prefix=`手绘日记_${localDate()}`;
  if(format==='png'){
    const blob=await new Promise<Blob>((resolve,reject)=>canvases[0].toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 生成失败，请重试。')),'image/png'));
    return {blob,name:`${prefix}_第${diary.pages.findIndex(p=>p.id===currentId)+1}页.png`};
  }
  const {jsPDF}=await import('jspdf');
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[160,200],compress:true});
  canvases.forEach((canvas,i)=>{if(i)pdf.addPage([160,200],'portrait');pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,160,200,undefined,'FAST');});
  return {blob:pdf.output('blob'),name:`${prefix}.pdf`};
}
export function downloadFile(file: ExportFile): string {
  const url=URL.createObjectURL(file.blob);
  const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();
  return url;
}
