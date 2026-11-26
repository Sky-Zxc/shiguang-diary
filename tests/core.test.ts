import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { addPage, applyStyle, createDiary, duplicatePage, localDate, photoKeys, removePage } from '../src/model';
import { ConflictError, deleteDiary, getImage, listDiaries, saveDiary } from '../src/db';

afterEach(async()=>{for(const diary of await listDiaries())await deleteDiary(diary.id);});
describe('页面边界和独立性',()=>{
  it('添加与复制均受三页限制，删除至少保留一页',()=>{
    let diary=createDiary();expect(()=>removePage(diary,diary.pages[0].id)).toThrow('至少保留');
    diary=addPage(addPage(diary));expect(diary.pages).toHaveLength(3);
    expect(()=>addPage(diary)).toThrow('最多支持');expect(()=>addPage(diary,diary.pages[0].id)).toThrow('最多支持');
  });
  it('复制保留内容和图片引用，但实例和样式独立',()=>{
    const page=createDiary().pages[0];page.text.title='最初';page.photos=[{id:'photo-1',blobKey:'shared',name:'lake.jpg',frame:'white',rotation:-2}];page.stickers=[{id:'sticker-1',type:'star',position:0,rotation:6}];
    const copy=duplicatePage(page);expect(copy.id).not.toBe(page.id);expect(copy.photos[0].id).not.toBe(page.photos[0].id);expect(copy.stickers[0].id).not.toBe(page.stickers[0].id);expect(copy.photos[0].blobKey).toBe('shared');
    copy.text.title='副本';copy.template.paper='kraft';copy.stickers[0].position=4;expect(page.text.title).toBe('最初');expect(page.template.paper).toBe('cream');expect(page.stickers[0].position).toBe(0);
  });
  it('删除当前页后选中前一页，删除首面后选中新首面',()=>{
    const original=addPage(addPage(createDiary()));const second=original.pages[1].id;
    expect(removePage(original,original.pages[2].id).lastActivePageId).toBe(second);
    original.lastActivePageId=original.pages[0].id;expect(removePage(original,original.pages[0].id).lastActivePageId).toBe(second);
  });
  it('批量应用样式不会覆盖内容、贴纸或拼贴布局',()=>{
    const diary=addPage(createDiary());diary.pages[0].template.paper='kraft';diary.pages[1].text.title='保留';diary.pages[1].layout='tape';diary.pages[1].stickers=[{id:'1',type:'heart',position:4,rotation:3}];
    const result=applyStyle(diary,diary.pages[0].id);expect(result.pages[1].template.paper).toBe('kraft');expect(result.pages[1].text.title).toBe('保留');expect(result.pages[1].layout).toBe('tape');expect(result.pages[1].stickers).toEqual(diary.pages[1].stickers);expect(diary.pages[1].template.paper).toBe('cream');
  });
  it('日期使用传入时间的本地日期',()=>{expect(localDate(new Date(2026,0,2,0,5))).toBe('2026-01-02');});
});
describe('持久化一致性和图片回收',()=>{
  it('图片二进制持久化后保持内容与 MIME 类型',async()=>{
    const diary=createDiary();diary.pages[0].photos=[{id:'p',blobKey:'binary-image',name:'a.png',frame:'white',rotation:0}];
    const bytes=new Uint8Array([137,80,78,71,0,255,1]);
    await saveDiary(diary,new Map([['binary-image',new Blob([bytes],{type:'image/png'})]]),0);
    const restored=await getImage('binary-image');expect(restored?.type).toBe('image/png');expect(new Uint8Array(await restored!.arrayBuffer())).toEqual(bytes);
  });
  it('原页被删除时副本仍能读取共享图片，最后引用删除后回收',async()=>{
    let diary=createDiary();diary.pages[0].photos=[{id:'p',blobKey:'img-shared',name:'a.png',frame:'white',rotation:0}];
    diary=addPage(diary,diary.pages[0].id);let revision=await saveDiary(diary,new Map([['img-shared',new Blob(['pixels'])]]),0);
    diary=removePage(diary,diary.pages[0].id);revision=await saveDiary(diary,new Map(),revision);expect(await getImage('img-shared')).toBeDefined();expect(photoKeys(diary)).toEqual(['img-shared']);
    diary.pages[0].photos=[];await saveDiary(diary,new Map(),revision);expect(await getImage('img-shared')).toBeUndefined();
  });
  it('失败的照片写入不会覆盖旧草稿或留下部分图片',async()=>{
    const diary=createDiary();const revision=await saveDiary(diary,new Map(),0);diary.title='不应写入';
    diary.pages[0].photos=[{id:'a',blobKey:'temporary',name:'a',frame:'white',rotation:0},{id:'b',blobKey:'missing',name:'b',frame:'white',rotation:0}];
    await expect(saveDiary(diary,new Map([['temporary',new Blob(['x'])]]),revision)).rejects.toThrow('照片文件缺失');
    expect((await listDiaries())[0].title).toBe('我的日记本');expect(await getImage('temporary')).toBeUndefined();
  });
  it('旧版本无法覆盖另一个标签页已保存的版本',async()=>{
    const diary=createDiary();const revision=await saveDiary(diary,new Map(),0);diary.title='较新版本';await saveDiary(diary,new Map(),revision);
    diary.title='旧版本';await expect(saveDiary(diary,new Map(),revision)).rejects.toBeInstanceOf(ConflictError);expect((await listDiaries())[0].title).toBe('较新版本');
  });
  it('删除日记本只清理无人引用的图片',async()=>{
    const a=createDiary(),b=createDiary();a.pages[0].photos=[{id:'a',blobKey:'common',name:'x',frame:'white',rotation:0}];b.pages[0].photos=[{...a.pages[0].photos[0],id:'b'}];
    await saveDiary(a,new Map([['common',new Blob(['shared'])]]),0);await saveDiary(b,new Map(),0);await deleteDiary(a.id);expect(await getImage('common')).toBeDefined();await deleteDiary(b.id);expect(await getImage('common')).toBeUndefined();
  });
});
