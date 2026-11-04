/* Seeded varied spoken material: isolated words, slogans, full statements.
 * No online lyric corpus. Exact repeats within one song are rejected. */
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
export function composeVoices(plan,languagePacks,conceptTerms,concepts,rngFor,voiceIdentity){
 if(!plan.withVox)return [];
 const r=rngFor(plan.seed+"|speech-arrangement-v2"),lang=plan.language;
 const lines=CLAUSES[lang]||CLAUSES.en,bank=languagePacks[lang]||languagePacks.en;
 const terms=TERMS[lang]||(conceptTerms[lang]||conceptTerms.en).split("|");
 const count=Math.max(1,Math.min(14,Math.floor(plan.duration/(6+r()*6))));
 const used=new Set(),voices=[];
 const startMode=Math.floor(r()*3);
 for(let i=0;i<count;i++){
  const form=["word","slogan","sentence"][(i+startMode)%3];
  let text="";
  for(let n=0;n<24;n++){
   if(form==="word")text=pick(r,terms);
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
  const fraction=(i+.35+r()*.45)/(count+.4);
  let time=Math.min(plan.duration-1.1,Math.max(0.4,fraction*plan.duration));
  // Let occasional isolated slogans land directly after a stop/drop.
  if(form==="slogan" && plan.breaks?.length && r()<.45){
    const br=plan.breaks[i%plan.breaks.length];
    if(Math.abs(br.end-time)<4)time=Math.min(plan.duration-1,br.end+.12);
  }
  const voice=voiceIdentity(r,plan.mood,plan.concept);
  voices.push({time:+time.toFixed(3),text,form,language:lang,mood:plan.mood,concept:plan.concept,voice});
 }
 return voices;
}
