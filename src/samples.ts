import { createDiary, uid } from './model';
import { pendingBlobs } from './resources';
import type { Diary } from './types';

export const SAMPLE_INFO = [
  { title:'把周末交给山野',tag:'一场小小的出逃',image:'/images/lake.jpg',paper:'cream',caption:'TRAVEL NOTES',description:'山间的风，替我按下了暂停键。' },
  { title:'日子里的一点甜',tag:'平凡生活也闪光',image:'/images/coffee.jpg',paper:'yellow',caption:'SLOW LIVING',description:'一杯咖啡，一整个慢下来的下午。' },
  { title:'去有树的地方',tag:'收集绿色的心情',image:'/images/forest.jpg',paper:'grid',caption:'INTO THE GREEN',description:'沿着小路走，把烦恼留在身后。' },
] as const;
export async function makeSample(index:number):Promise<Diary>{
  const info=SAMPLE_INFO[index];const diary=createDiary();const page=diary.pages[0];
  diary.title=info.title;page.template.paper=info.paper;
  page.text={...page.text,title:info.title,body:[
    '没有赶路，也没有计划。\n只是坐在湖边，看云慢慢经过山顶。\n原来，什么都不做的日子，也值得好好记住。',
    '阳光刚好落在桌角，咖啡还是喜欢的温度。\n翻了几页书，听完一张唱片。\n把这些微不足道的小幸福，都认真收藏。',
    '今天的目的地，是一片没有名字的森林。\n听树叶沙沙作响，看光从枝叶间洒下来。\n生活偶尔需要的，不过是深呼吸。',
  ][index],location:['山野之间','街角咖啡馆','森林小径'][index]};
  const response=await fetch(info.image);if(!response.ok)throw new Error('示例照片读取失败，请重试。');
  const key=uid();pendingBlobs.set(key,await response.blob());
  page.photos=[{id:uid(),blobKey:key,name:'示例照片.jpg',rotation:-1.6,frame:'white'}];
  page.stickers=[{id:uid(),type:index===1?'heart':'star',position:0,rotation:12},{id:uid(),type:'tape',position:6,rotation:-7}];
  return diary;
}
