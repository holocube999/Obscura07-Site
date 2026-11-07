/* Fictional offline radio DJ and call-ins. External news optional, never invented as real. */
import {synthesizeWord} from "./articulatory-dsp.js";
import {createVoicePersona} from "./voice-genome.js";
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
function randomFor(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h|=0;h=(h+0x6D2B79F5)|0;let t=Math.imul(h^(h>>>15),1|h);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const choose=(r,a)=>a[Math.floor(r()*a.length)];
const WORDS={
 it:{
 greet:["Siete sintonizzati su Random Null Radio","Ancora una frequenza senza confini","Questa è la radio dei suoni imprevisti","Stasera il segnale è particolarmente strano"],
 bridge:["Tra poco un nuovo brano","Cambia il ritmo e cambiamo orizzonte","Lasciamo un po' di spazio alla musica","Questa traccia è finita, ma la notte è lunga"],
 origin:["un laboratorio sotterraneo","una cittadina sul mare","una stazione radio abbandonata","un quartiere industriale","una periferia senza nome","un osservatorio in montagna"],
 reason:["trasformare il rumore in melodie","far ballare anche le ombre","esplorare frequenze impossibili","ricordare suoni che non esistono","inventare il futuro della musica"],
 jokes:["Il nostro tecnico ha detto che oggi funziona tutto. Quindi preparatevi.","Un ascoltatore ci ha chiesto il silenzio. Gli abbiamo mandato un assolo di basso.","Il segnale è pulito. La mia reputazione un po' meno.","Se sentite una frequenza aliena, è soltanto il bollitore della regia."],
 ads:["Pubblicità immaginaria: Ombra Express, consegniamo il nulla prima di domani.","Spot inventato: Polvere Premium, il futuro della pulizia al contrario.","Finto sponsor: Antenne Lunari, ricevi anche quello che nessuno trasmette.","Messaggio pubblicitario fittizio: Caffè Nebulosa, non risolve niente ma profuma."],
 calls:["Pronto, sono un fan e volevo dirvi che questo pezzo mi ha fatto perdere il tram. Complimenti.","Ciao radio, ho alzato il volume e il vicino ora vuole il nome della band.","Sono in diretta? Bene, dico solo che questa musica mi ha cambiato la serata.","Vi seguo da un posto improbabile. Non smettete di trasmettere."],
 bio:["Provengono da","Hanno iniziato a suonare in","Si sono incontrati vicino a"],
 bio2:["Cercano di","Hanno una sola ossessione:","Registrano per"],
 fanLabel:"Telefonata inventata",adLabel:"Spot immaginario"
 },
 en:{
 greet:["You are tuned to Random Null Radio","Another unexpected frequency","Welcome back to a strange musical signal"],
 bridge:["Another track is coming up","The next sound is already on its way","Now let the music breathe"],
 origin:["an abandoned station","a small town by the sea","an underground laboratory","an industrial neighborhood"],
 reason:["turning noise into melody","exploring impossible frequencies","making shadows dance","remembering music that never existed"],
 jokes:["Our technician says everything works today. That is deeply suspicious.","The signal is clear. My reputation is not.","Someone requested silence. We sent a drum solo."],
 ads:["Fictional advertisement: Lunar Antennas. Signals that nobody transmitted.","Imaginary sponsor: Fog Deluxe. More atmosphere for less visibility."],
 calls:["Hello, I love this station. My neighbors now know every track.","I'm calling to say that this band made my evening."],
 bio:["They come from","They started in","They first met near"],
 bio2:["They are trying to","They make music for","Their favorite pastime is"],
 fanLabel:"Fictional call",adLabel:"Imaginary advertisement"
 }
};
export function planSpeaker(previous,next,{language="it",seed="",verifiedNews=[]}={}){
 const r=randomFor(seed+"|"+(previous?.seed||"")+"|"+(next?.seed||"")+"|DJ06");
 // One consistent presenter, independently cast callers for every appearance.
 const host=createVoicePersona("RNR/station/"+(seed||"default"),{role:"host",style:"radio"});
 const caller=createVoicePersona(next?.seed||seed||"guest",{role:"caller",style:"radio",excludeId:host.id});
 const pack=WORDS[language]||WORDS.en;
 const roll=r();if(roll<.52)return null;
 const voices=[{...host,emotion:"warm",stumble:0},
 {...caller,emotion:"excited"}];
 const band=next?.artist||"Random Null",title=next?.title||"Unknown Transmission";
 const pick=(a)=>choose(r,a);
 const news=Array.isArray(verifiedNews)?verifiedNews.filter(v=>v&&typeof v.title==="string"&&/^https:\/\//.test(v.url||"")&&v.verified===true):[];
 let type,text,persona=voices[0];
 if(roll<.68){type="intro";text=pick(pack.greet)+". "+pick(pack.bridge)+". "+band+". "+title+".";}
 else if(roll<.80){type="bio";text=band+". "+pick(pack.bio)+" "+pick(pack.origin)+". "+pick(pack.bio2)+" "+pick(pack.reason)+".";}
 else if(roll<.89){type="joke";text=pick(pack.jokes);}
 else if(roll<.96){type="advertisement";text=pick(pack.ads);}
 else if(roll<.99){type="caller";persona=voices[1];text=pack.fanLabel+". "+pick(pack.calls);}
 else if(news.length){type="news";const item=pick(news);text=item.title;}
 else {type="intro";text=pick(pack.bridge)+". "+band+".";}
 if(type==="joke")persona={...persona,emotion:r()>.5?"sarcastic":"grumpy"};
 if(type==="intro"&&next?.style==="hiphop")persona={...persona,emotion:"excited"};
 return {type,text,persona,language:WORDS[language]?language:"en",fictional:type==="caller"||type==="advertisement",verified:type==="news"};
}
export function renderSpeakerPCM(cue,{sampleRate=22050}={}){
 if(!cue?.text)return null;
 const sr=C(Math.round(sampleRate),8000,48000),rnd=randomFor(cue.text+cue.persona.id);
 const words=cue.text.split(/\s+/).filter(Boolean).slice(0,45);
 const samples=[];let total=0;
 for(let i=0;i<words.length;i++){
  let word=words[i];
  if(cue.persona.stumble&&rnd()<cue.persona.stumble&&word.length>4)
   word=word.slice(0,2)+"-"+word;
  const pause=/[.!?]$/.test(word)?.14:/[,;:]$/.test(word)?.06:.026;
  const duration=(.17+Math.min(.16,word.length*.012))/cue.persona.pace;
  const mood=cue.persona.emotion||"warm";
  const attitude=mood==="excited"?1.10:mood==="grumpy"?.94:1;
  const hz=cue.persona.pitch*attitude*(1+.065*Math.sin(i*.7)+(/\?$/.test(word)?.09:0));
  const pcm=synthesizeWord(word,{sampleRate:sr,targetSamples:Math.floor(duration*sr),pitch:hz,
   formantShift:cue.persona.formant,tuneStrength:0,language:cue.language,
   breathiness:cue.persona.breath,mode:cue.persona.mode,
   spectralTilt:cue.persona.spectralTilt,nasality:cue.persona.nasality,
   rasp:cue.persona.rasp,jitter:cue.persona.jitter,shimmer:cue.persona.shimmer,
   attack:cue.persona.attack,
   inflection:(mood==="excited"?.09:.06)*Math.sin(i*.5)},rnd);
  samples.push({pcm,pause:Math.round(pause*sr)});total+=pcm.length+Math.round(pause*sr);
 }
 const left=new Float32Array(total+Math.round(sr*.24)),right=new Float32Array(left.length);
 let at=0;for(const {pcm,pause} of samples){for(let i=0;i<pcm.length;i++){left[at+i]+=pcm[i]*.30;right[at+i]+=pcm[i]*.30;}at+=pcm.length+pause;}
 const edge=Math.min(Math.round(sr*.025),left.length>>>2);
 for(const ch of [left,right])for(let i=0;i<edge;i++){ch[i]*=i/edge;ch[ch.length-1-i]*=i/edge;}
 return {sampleRate:sr,channels:[left,right],duration:left.length/sr,cue};
}
