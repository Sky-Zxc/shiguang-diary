import type { Paper, Template, Theme } from './types';
import { cuteMarkup, svgUrl, type CuteStickerType } from './cuteArt';

export const PAPER_COLORS: Record<Paper,string> = {
  cream:'#f9f4e6',kraft:'#d9bc93',yellow:'#fff0c8',grid:'#f8f6eb',lined:'#f6f3e9',
  blush:'#fff1f1',mint:'#eef6e9',sky:'#eff7fc',lavender:'#f5effb',
};
interface ThemeOption { id: Theme; label: string; caption: string; mascot?: CuteStickerType; accent: string; style: Partial<Template> }
export const THEMES: ThemeOption[] = [
  {id:'classic',label:'经典手记',caption:'米白 · 朴素',accent:'#9aab83',style:{paper:'cream',border:'wavy',font:'mashan',textColor:'#514b3c'}},
  {id:'strawberry',label:'草莓奶油',caption:'粉粉的甜日子',mascot:'strawberry',accent:'#d992a1',style:{paper:'blush',border:'wavy',font:'mashan',textColor:'#83515c'}},
  {id:'bunny',label:'兔兔花园',caption:'把温柔种下来',mascot:'bunny',accent:'#9aae86',style:{paper:'mint',border:'wavy',font:'mashan',textColor:'#53664c'}},
  {id:'bear',label:'蜂蜜小熊',caption:'暖乎乎的小幸福',mascot:'bear',accent:'#c3a076',style:{paper:'yellow',border:'tape',font:'mashan',textColor:'#795a3e'}},
  {id:'sky',label:'晴空云朵',caption:'今天也轻飘飘',mascot:'cloud',accent:'#8cb2ce',style:{paper:'sky',border:'wavy',font:'zhimang',textColor:'#4d6b86'}},
  {id:'candy',label:'星星糖果',caption:'收集闪闪的心情',mascot:'rainbow',accent:'#b19ac8',style:{paper:'lavender',border:'wavy',font:'mashan',textColor:'#725982'}},
  {id:'kitty',label:'蜜桃猫咪',caption:'和猫猫一起发呆',mascot:'cat',accent:'#cf9e8d',style:{paper:'blush',border:'torn',font:'zhimang',textColor:'#876253'}},
];
export function themeStyle(id: Theme): Partial<Template> {
  return {...THEMES.find(theme=>theme.id===id)!.style,theme:id};
}
const cache = new Map<string,string>();
export function themeArtUrl(id?: Theme) {
  if (!id || id==='classic') return undefined;
  if (cache.has(id)) return cache.get(id)!;
  const theme=THEMES.find(theme=>theme.id===id);if(!theme?.mascot)return undefined;
  const accent=theme.accent;
  const motif=(type:CuteStickerType,x:number,y:number,scale:number,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${cuteMarkup(type)}</g>`;
  const secondary: Record<Exclude<Theme,'classic'>,CuteStickerType> = {strawberry:'cherry',bunny:'flower',bear:'flower',sky:'rainbow',candy:'bow',kitty:'bow'};
  let art=`<defs><pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.2" fill="${accent}" opacity=".22"/></pattern></defs><rect width="800" height="1000" fill="url(#dots)"/>`;
  if(id==='strawberry'||id==='candy')art+=`<path d="M24 42H776M24 958H776" stroke="${accent}" stroke-width="12" stroke-dasharray="4 10" opacity=".16"/>`;
  art+=motif(theme.mascot,44,125,.42,-12)+motif(theme.mascot,756,918,.42,12);
  for(const [i,y] of [275,465,655,845].entries()) {
    art+=motif(i%2?theme.mascot:secondary[id],45,y,.28,i%2?-12:12);
    art+=motif(i%2?secondary[id]:theme.mascot,755,y+18,.28,i%2?12:-12);
  }
  for(const x of [210,400,590])art+=motif(secondary[id],x,38,.23,x===400?0:12);
  const url=svgUrl(art,'0 0 800 1000');cache.set(id,url);return url;
}
