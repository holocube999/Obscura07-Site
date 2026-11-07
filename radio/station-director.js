/* Stateless choices + session-local programme memory.
 * Speaker OFF is an absolute gate: no announcements, news, ads or callers.
 * A station sounds alive because it also knows when to stay silent. */
import {planSpeaker} from "./speaker.js";
const TYPES=["intro","bio","joke","news","advertisement","caller"];
const WEIGHTS={intro:32,bio:26,joke:18,news:12,advertisement:7,caller:5};
function randomSource(seed){
 let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);
 return ()=>{h|=0;h=(h+0x6D2B79F5)|0;let x=Math.imul(h^(h>>>15),1|h);x^=x+Math.imul(x^(x>>>7),61|x);return ((x^(x>>>14))>>>0)/4294967296;};
}
export function createStationDirector({seed="RNR",random}={}){
 const rng=typeof random==="function"?random:randomSource(seed);
 let songsSince=0,seq=0,lastType=null,adGap=99,callGap=99,enabledBefore=false;
 const chooseType=(news)=>{
  const weights=TYPES.map(type=>{
   if(type==="news"&&!news.length)return 0;
   if(type===lastType)return 0;
   if(type==="advertisement"&&adGap<8)return 0;
   if(type==="caller"&&callGap<5)return 0;
   return WEIGHTS[type];
  });
  const total=weights.reduce((a,b)=>a+b,0);let pick=rng()*total;
  for(let i=0;i<TYPES.length;i++){pick-=weights[i];if(pick<0&&weights[i])return TYPES[i];}
  return "intro";
 };
 return {
  get stats(){return {songsSince,seq,lastType,adGap,callGap};},
  reset(){songsSince=0;seq=0;lastType=null;adGap=99;callGap=99;enabledBefore=false;},
  next(previous,next,{enabled=false,language="it",verifiedNews=[]}={}){
   if(!enabled){enabledBefore=false;songsSince=0;return null;}
   if(!enabledBefore){enabledBefore=true;songsSince=0;}
   seq++;songsSince++;adGap++;callGap++;
   // A whole song without talking is more important than a forced jingle.
   if(songsSince<2)return null;
   const probability=Math.min(.56,.14+(songsSince-2)*.085);
   if(songsSince<8&&rng()>=probability)return null;
   const news=Array.isArray(verifiedNews)?verifiedNews.filter(x=>x?.verified===true&&x.source&&x.url):[];
   let type=chooseType(news);
   let cue=planSpeaker(previous,next,{language,seed:seed+"-"+seq+"-"+(next?.seed||""),verifiedNews:news,forcedType:type});
   if(!cue&&type==="news"){type="intro";cue=planSpeaker(previous,next,{language,seed:seed+"-"+seq,verifiedNews:news,forcedType:type});}
   if(!cue)return null;
   songsSince=0;lastType=cue.type;
   if(cue.type==="advertisement")adGap=0;
   if(cue.type==="caller")callGap=0;
   return cue;
  }
 };
}
