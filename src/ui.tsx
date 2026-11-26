import { useEffect, useRef, type ReactNode } from 'react';
import { BookOpen, Leaf, X } from 'lucide-react';
export function Brand({compact=false}:{compact?:boolean}){
  return <span className={`brand ${compact?'compact':''}`}><span className="brand-mark"><BookOpen size={23}/><Leaf className="brand-leaf" size={12}/></span><span>拾光手记{!compact&&<small>LITTLE DAY JOURNAL</small>}</span></span>;
}
export function Modal({children,onClose,label,locked=false,className=''}:{children:ReactNode;onClose:()=>void;label:string;locked?:boolean;className?:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=ref.current;if(node&&!node.open)node.showModal();return()=>{node?.close();};},[]);
  return <dialog className={`modal ${className}`} ref={ref} aria-label={label} onCancel={event=>{event.preventDefault();if(!locked)onClose();}} onClick={event=>{if(event.target===event.currentTarget&&!locked)onClose();}}>
    <div className="modal-inner">{!locked&&<button className="icon-button modal-close" onClick={onClose} aria-label="关闭弹窗"><X size={19}/></button>}{children}</div>
  </dialog>;
}
export function SectionTitle({number,title,children}:{number:string;title:string;children?:ReactNode}){
  return <div className="section-heading"><h3><span>{number}</span>{title}</h3>{children}</div>;
}
