/* Radio playlist is an append-only sequence of recipe snapshots. No audio
   buffers in history: replay deterministically renders an existing recipe. */
export const PLAY_MODES=["radio","all","single","random"];
export function makeQueue({mode="radio",maxHistory=600}={}){
 // A bounded recent-seed window prevents unbounded growth during an always-on station.
 // New crypto-generated seeds are 128-bit; old recipes remain replayable.
 maxHistory=Math.max(1,Math.min(10000,Math.floor(maxHistory)||600));
 const items=[];let index=-1;const seen=new Set(),recent=[];
 function remember(seed){
  if(seen.has(seed))return;
  seen.add(seed);recent.push(seed);
  if(recent.length>16384)seen.delete(recent.shift());
 }
 function insert(item){
  if(!item||typeof item.seed!=="string")throw TypeError("Missing track recipe");
  const copy={seed:item.seed,lyricsVariant:Number(item.lyricsVariant)||0,
   lyricsText:String(item.lyricsText||""),title:String(item.title||""),
   artist:String(item.artist||""),style:String(item.style||""),
   voiceMix:Number.isFinite(item.voiceMix)?Math.max(0,Math.min(1,item.voiceMix)):.22,
   speaker:Boolean(item.speaker)};
  items.push(copy);index=items.length-1;remember(copy.seed);
  if(items.length>maxHistory){items.shift();index=Math.max(0,index-1);}
  return copy;
 }
 return {
  get items(){return items.map(x=>({...x}));},get index(){return index;},
  get selected(){return items[index]||null;},get mode(){return mode;},
  setMode(next){if(!PLAY_MODES.includes(next))throw RangeError("Unknown queue mode");mode=next;},
  insert,replaceSelected(item){
   if(index<0)return insert(item);
   items[index]={...items[index],...item};remember(items[index].seed);return {...items[index]};
  },select(i){if(!Number.isInteger(i)||i<0||i>=items.length)return null;index=i;return {...items[i]};},
  next({repeat=false,random=Math.random}={}){
   if(repeat)return index>=0?{...items[index]}:null;
   if(mode==="single")return null;
   if(mode==="random"&&items.length>1){let n=Math.floor(random()*(items.length-1));if(n>=index)n++;return this.select(n);}
   if(index+1<items.length)return this.select(index+1);
   return mode==="radio"?undefined:null;
  },
  hasSeed(seed){return seen.has(seed);},
  uniqueSeed(factory){for(let n=0;n<32;n++){const candidate=factory();if(typeof candidate==="string"&&!seen.has(candidate))return candidate;}
   return String(factory())+"-"+items.length.toString(36);
  }
 };
}
