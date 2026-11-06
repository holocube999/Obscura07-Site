/* Seeded varied spoken material: isolated words, slogans, full statements.
 * No online lyric corpus. Exact repeats within one song are rejected. */
import {OFFLINE_DICTIONARY,originalSentence,rhymeStanza} from './linguistic-corpus.js';
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const TERMS={
 it:["silenzio","eclissi","macchina","infinito","memoria","vuoto","orizzonte","rinascita","antenna","segnale","ombra","luce","eternità","stella","oceano","tempo","entropia"],
 en:["silence","eclipse","machine","infinity","memory","void","horizon","rebirth","antenna","signal","shadow","light","eternity","star","ocean","time","entropy"],
 es:["silencio","eclipse","máquina","infinito","memoria","vacío","horizonte","renacer","antena","señal","sombra","luz","eternidad","estrella","océano","tiempo","entropía"],
 fr:["silence","éclipse","machine","infini","mémoire","vide","horizon","renaissance","antenne","signal","ombre","lumière","éternité","étoile","océan","temps","entropie"]
};
const CLAUSES={
 it:{
  subjects:["La notte","La memoria","Ogni macchina","Una voce lontana","Il futuro","Questo universo","Il tempo","L'ultima trasmissione"],
  verbs:["attraversa","ricorda","cerca","ascolta","insegue","dimentica","trasforma","risveglia"],
  objects:["un cielo senza stelle","le rovine del futuro","un segnale impossibile","il rumore dell'eternità","i sogni di una città sommersa","una nuova forma di vita"],
  slogans:["Nessun ritorno","Oltre il segnale","Ricorda il futuro","Non spegnere la luce","Il silenzio è vivo","Fuori dal tempo","Tutto cambia","Ancora una volta"],
 },
 en:{
  subjects:["The night","Memory","Every machine","A distant voice","Tomorrow","This universe","Time","The last transmission"],
  verbs:["crosses","remembers","seeks","listens to","chases","forgets","transforms","awakens"],
  objects:["a sky without stars","the ruins of tomorrow","an impossible signal","the sound of forever","the dreams of a drowned city","another kind of life"],
  slogans:["No way back","Beyond the signal","Remember tomorrow","Keep the light on","Silence is alive","Outside of time","Nothing stays still","Once more"],
 },
 es:{
  subjects:["La noche","La memoria","Una máquina","Una voz lejana","El futuro","Este universo"],
  verbs:["atraviesa","recuerda","busca","escucha","persigue","transforma"],
  objects:["un cielo sin estrellas","las ruinas del mañana","una señal imposible","el sonido de la eternidad"],
  slogans:["Sin retorno","Más allá de la señal","Recuerda el futuro","El silencio vive","Fuera del tiempo"]
 },
 fr:{
  subjects:["La nuit","La mémoire","Une machine","Une voix lointaine","Le futur","Cet univers"],
  verbs:["traverse","cherche","écoute","poursuit","oublie","transforme"],
  objects:["un ciel sans étoiles","les ruines de demain","un signal impossible","le son de l'éternité"],
  slogans:["Sans retour","Au-delà du signal","Souviens-toi de demain","Le silence vit","Hors du temps"]
 }
};
export function quantizeVoiceTime(time,sections=[],breaks=[],duration=60,form="slogan",bpm=100){
 const max=Math.max(.025,Number.isFinite(duration)?duration-.05:59.95);
 const target=Math.max(0,Math.min(max,Number.isFinite(time)?time:0));
 const selected=(Array.isArray(sections)?sections:[]).filter(x=>
  x&&Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start&&
  Number.isFinite(x.bpm)&&x.bpm>0);
 const options=selected.length?selected:[{start:0,end:duration,bpm,meter:4}];
 let best=target,score=Infinity;
 for(const section of options){
  const beat=60/section.bpm;
  const step=form==="word"?beat/2:form==="sentence"?beat*(section.meter||4):beat;
  const n=Math.round((target-section.start)/step);
  for(const ix of [n-1,n,n+1]){
   const at=section.start+ix*step;
   if(at<section.start-1e-5||at>Math.min(max,section.end-.025))continue;
   if((Array.isArray(breaks)?breaks:[]).some(br=>br&&at>=br.start-.001&&at<br.end+.001))continue;
   const dist=Math.abs(at-target);
   if(dist<score){score=dist;best=at}
  }
 }
 return +best.toFixed(3);
}

export function composeVoices(plan,languagePacks,conceptTerms,concepts,rngFor,voiceIdentity){
 if(!plan.withVox)return [];
 const r=rngFor(plan.seed+"|speech-arrangement-v2"+(plan.lyricsVariant?"|variant:"+plan.lyricsVariant:"")),lang=plan.language;
 const provided=String(plan.lyricsText||"").split(/\n+/).map(s=>s.trim().slice(0,180)).filter(Boolean).slice(0,64);
 if(plan.style==="hiphop"){
  // Scores explicitly mark instrumentals and breakdowns as vocal rests.
  const beat=60/(plan.bpm||94);
  const active=(plan.sections||[]).filter(s=>s.voice&&s.name!=="outro"&&s.end>s.start+beat);
  const count=Math.min(42,active.length),voices=[],usedRap=new Set();
  let stanza=[];
  for(let i=0;i<count;i++){
   if(i%4===0)stanza=rhymeStanza(r,lang,Math.floor(i/4),plan.concept);
   const phrase=stanza[i%4],custom=provided.length?provided[i%provided.length]:null;
   let finalText=custom||phrase.text;
   if(!custom&&usedRap.has(finalText)){
    const lead=lang==="it"?["Adesso","Ancora","Da lontano","Stavolta","Senza tregua"]:
     ["Now","Again","From afar","Tonight","This time"];
    const base=phrase.text.charAt(0).toLowerCase()+phrase.text.slice(1);
    let variant=0;
    do{finalText=lead[(i+variant)%lead.length]+", "+base;variant++;}
    while(usedRap.has(finalText)&&variant<lead.length);
    if(usedRap.has(finalText))finalText="Ancora "+(i+1)+", "+base;
   }
   usedRap.add(finalText);
   const endWord=custom?(custom.match(/[\p{L}\p{N}]+(?=[^\p{L}\p{N}]*$)/u)||[])[0]||phrase.rhymeWord:phrase.rhymeWord;
   const section=active[i],time=section.start;
   const voice=voiceIdentity(r,plan.mood,plan.concept);
   voices.push({time:+time.toFixed(3),rhymeTime:+(time+beat*3).toFixed(3),
    barEnd:+Math.min(plan.duration,section.end).toFixed(3),bar:section.bar,
    text:finalText,rhymeWord:endWord,rhymeFamily:phrase.family,scheme:phrase.scheme,
    form:"rap",delivery:"hiphop",language:lang,section:section.name,
    emphasis:section.name==="hook"?.9:.52,restBefore:i===0||section.bar-active[i-1].bar>1,
    mood:plan.mood,concept:plan.concept,voice});
  }
  return voices;
 }

 const lines=CLAUSES[lang]||CLAUSES.en,bank=languagePacks[lang]||languagePacks.en;
 const terms=TERMS[lang]||(conceptTerms[lang]||conceptTerms.en).split("|");
 const count=Math.max(1,Math.min(14,Math.floor(plan.duration/(6+r()*6))));
 const used=new Set(),voices=[];
 const startMode=Math.floor(r()*3);
 for(let i=0;i<count;i++){
  const form=["word","slogan","sentence"][(i+startMode)%3];
  let text="";
  for(let n=0;n<24;n++){
   if(OFFLINE_DICTIONARY[lang]&&r()<.84){
     const kind=form==="sentence"?(r()<.32?"question":r()<.22?"abstract":"statement"):
      form==="slogan"?(r()<.36?"question":"slogan"):"word";
     text=originalSentence(r,lang,kind,plan.context||"");
   }else if(form==="word")text=pick(r,terms);
   else if(form==="slogan"){
     text=pick(r,lines.slogans);
     if(r()<.4)text+=". "+pick(r,terms)+"!";
   }else if(r()<.65){
     text=pick(r,lines.subjects)+" "+pick(r,lines.verbs)+" "+pick(r,lines.objects)+".";
     if(r()<.34)text+=" "+pick(r,lines.slogans)+".";
   }else{
     const fragment=bank.map(x=>pick(r,x));
     text=fragment.join(" ")+".";
   }
   if(!used.has(text))break;
  }
  if(used.has(text))text+=" "+String(i+1); // deterministic escape for exhausted short dictionaries
  used.add(text);
  if(provided.length)text=provided[i%provided.length];
  const fraction=(i+.35+r()*.45)/(count+.4);
  let time=Math.min(plan.duration-1.1,Math.max(0.4,fraction*plan.duration));
  // Let occasional isolated slogans land directly after a stop/drop.
  if(form==="slogan" && plan.breaks?.length && r()<.45){
    const br=plan.breaks[i%plan.breaks.length];
    if(Math.abs(br.end-time)<4)time=Math.min(plan.duration-1,br.end+.12);
  }
  const voice=voiceIdentity(r,plan.mood,plan.concept);
  const onset=quantizeVoiceTime(time,plan.sections,plan.breaks,plan.duration,form,plan.bpm);
  voices.push({time:onset,text,form,language:lang,mood:plan.mood,concept:plan.concept,voice});
 }
 return voices;
}

/** Editable draft matching the lyrics already scheduled in the score. */
export function lyricSheet(plan){
 const lines=(plan?.voices||[]).filter(v=>typeof v?.text==="string").map(v=>v.text.trim());
 if(plan.style!=="hiphop")return lines.join("\n");
 return lines.map((line,i)=>line+(i%4===3&&i<lines.length-1?"\n":"")).join("\n");
}
