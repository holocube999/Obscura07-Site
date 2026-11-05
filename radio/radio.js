/* RΛNDØM[NULL] RADIO • static seeded xenarmonic engine • original synthesis
   Browser ES module. No server, telemetry, samples, npm or CDN. */
import {arrangeMusic,EXTRA_STYLES} from "./arrangement.js";
import {composeVoices} from "./lyrics.js";
export const VERSION="0.2.0";
export const SAMPLE_RATE=22050;
export const STYLES=["xenodrone","vaporwave","dreamwave","synthwave","guitar","ritual","biosphere","darkambient","pulse",...EXTRA_STYLES];
export const MOODS=["liminal","euphoric","melancholic","nocturnal","hypnotic","curious","serene","alien","nostalgic","ominous","weightless","electric"];
export const CONCEPTS=["memory","time","horizon","machines","sleep","ocean","stars","ghosts","silence","light","dreams","cities","echoes","entropy","origin"];
export const LANGUAGE_PACKS={
 en:[["the silent","an unseen","my distant","the last","a lucid","a forgotten"],["signal","ocean","machine","horizon","dream","shadow"],["remembers","becomes","dissolves into","is searching for","dreams of"],["tomorrow","the empty sky","another life","a hidden city","the beginning"]],
 it:[["il silenzio","la notte","il futuro","una memoria","la luce"],["remota","impossibile","senza nome","di vetro","profonda"],["ricorda","attraversa","dimentica","incontra","ascolta"],["un oceano","le stelle","la macchina","un sogno","la fine"]],
 fr:[["la nuit","la mémoire","le silence","la machine"],["invisible","lointaine","éternelle","perdue"],["cherche","oublie","traverse","écoute"],["la lumière","les étoiles","un autre monde","le temps"]],
 es:[["la noche","el silencio","la memoria","la sombra"],["lejana","eléctrica","invisible","eterna"],["recuerda","atraviesa","escucha","imagina"],["el océano","las estrellas","otra vida","el tiempo"]],
 de:[["die Nacht","die Maschine","die Erinnerung","das Licht"],["ferne","verborgene","stille","ewige"],["träumt von","sucht","vergisst","erinnert sich an"],["den Horizont","die Sterne","das Meer","die Zukunft"]],
 pt:[["a noite","a memória","o silêncio","a máquina"],["distante","invisível","esquecida","lenta"],["procura","recorda","escuta","atravessa"],["o céu","as estrelas","o tempo","um sonho"]],
 nl:[["de nacht","de machine","de stilte","de schaduw"],["verre","stille","vergeten","vreemde"],["zoekt","hoort","droomt van","herinnert"],["de sterren","de zee","de tijd","een droom"]],
 sv:[["natten","minnet","tystnaden","maskinen"],["avlägsna","osynliga","glömda","eviga"],["minns","söker","lyssnar på","drömmer om"],["stjärnorna","havet","tiden","ljuset"]],
 fi:[["yö","muisto","hiljaisuus","kone"],["kaukainen","tuntematon","unohdettu","hidas"],["muistaa","etsii","kuuntelee","näkee"],["tähdet","meren","ajan","unen"]],
 pl:[["noc","pamięć","cisza","maszyna"],["daleka","ukryta","zapomniana","ostatnia"],["pamięta","szuka","słyszy","widzi"],["gwiazdy","ocean","czas","sen"]],
 tr:[["gece","hafıza","sessizlik","makine"],["uzak","gizli","sonsuz","sessiz"],["hatırlar","arar","dinler","düşler"],["yıldızları","denizi","zamanı","rüyayı"]],
 ja:[["夜は","記憶は","光は","機械は"],["静かに","遠くで","永遠に","ゆっくり"],["夢を見る","揺れている","忘れている","聞いている"],["星の声を","海の歌を","未来の音を","時間の影を"]],
 ko:[["밤은","기억은","기계는","빛은"],["조용히","멀리서","끝없이","천천히"],["꿈을 꾼다","기억한다","노래한다","듣는다"],["별의 소리","바다의 꿈","시간의 그림자","미래의 신호"]],
 zh:[["夜晚","记忆","机器","光"],["安静地","缓慢地","永远","遥远地"],["寻找","聆听","记得","梦见"],["星星","海洋","时间","未来"]],
 ar:[["الليل","الذاكرة","الضوء","الآلة"],["البعيد","الخفيف","الصامت","الأخير"],["يتذكر","يسمع","يبحث عن","يحلم بـ"],["النجوم","البحر","الزمن","الحلم"]],
 hi:[["रात","याद","प्रकाश","मशीन"],["दूर","शांत","अनंत","धीरे"],["सुनती है","याद करती है","खोजती है","देखती है"],["तारे","समुद्र","समय","सपना"]],
 el:[["η νύχτα","η μνήμη","η μηχανή","το φως"],["μακρινή","κρυφή","ήσυχη","αιώνια"],["θυμάται","ακούει","αναζητά","ονειρεύεται"],["τα αστέρια","τη θάλασσα","τον χρόνο","το όνειρο"]],
 ru:[["ночь","память","тишина","машина"],["далёкая","невидимая","забытая","вечная"],["помнит","ищет","слышит","видит"],["звёзды","океан","время","сон"]]
};
const CONCEPT_TERMS={
 en:"memory|time|horizon|machines|sleep|ocean|stars|ghosts|silence|light|dreams|cities|echoes|entropy|origin",
 it:"memoria|tempo|orizzonte|macchine|sonno|oceano|stelle|fantasmi|silenzio|luce|sogni|città|echi|entropia|origine",
 fr:"mémoire|temps|horizon|machines|sommeil|océan|étoiles|fantômes|silence|lumière|rêves|villes|échos|entropie|origine",
 es:"memoria|tiempo|horizonte|máquinas|sueño|océano|estrellas|fantasmas|silencio|luz|sueños|ciudades|ecos|entropía|origen",
 de:"Erinnerung|Zeit|Horizont|Maschinen|Schlaf|Ozean|Sterne|Geister|Stille|Licht|Träume|Städte|Echos|Entropie|Ursprung",
 pt:"memória|tempo|horizonte|máquinas|sono|oceano|estrelas|fantasmas|silêncio|luz|sonhos|cidades|ecos|entropia|origem",
 nl:"herinnering|tijd|horizon|machines|slaap|oceaan|sterren|geesten|stilte|licht|dromen|steden|echo's|entropie|oorsprong",
 sv:"minne|tid|horisont|maskiner|sömn|hav|stjärnor|spöken|tystnad|ljus|drömmar|städer|ekon|entropi|ursprung",
 fi:"muisto|aika|horisontti|koneet|uni|valtameri|tähdet|aaveet|hiljaisuus|valo|unet|kaupungit|kaiut|entropia|alkuperä",
 pl:"pamięć|czas|horyzont|maszyny|sen|ocean|gwiazdy|duchy|cisza|światło|sny|miasta|echa|entropia|początek",
 tr:"hafıza|zaman|ufuk|makineler|uyku|okyanus|yıldızlar|hayaletler|sessizlik|ışık|rüyalar|şehirler|yankılar|entropi|köken",
 ja:"記憶|時間|地平線|機械|睡眠|海|星|幽霊|静寂|光|夢|都市|反響|エントロピー|起源",
 ko:"기억|시간|지평선|기계|잠|바다|별|유령|침묵|빛|꿈|도시|메아리|엔트로피|기원",
 zh:"记忆|时间|地平线|机器|睡眠|海洋|星星|幽灵|寂静|光|梦|城市|回声|熵|起源",
 ar:"ذاكرة|زمن|أفق|آلات|نوم|محيط|نجوم|أشباح|صمت|ضوء|أحلام|مدن|أصداء|إنتروبيا|أصل",
 hi:"स्मृति|समय|क्षितिज|मशीनें|नींद|महासागर|तारे|भूत|मौन|प्रकाश|सपने|शहर|गूँज|एन्ट्रॉपी|उत्पत्ति",
 el:"μνήμη|χρόνος|ορίζοντας|μηχανές|ύπνος|ωκεανός|αστέρια|φαντάσματα|σιωπή|φως|όνειρα|πόλεις|ηχώ|εντροπία|προέλευση",
 ru:"память|время|горизонт|машины|сон|океан|звезды|призраки|тишина|свет|сны|города|эхо|энтропия|происхождение"
};
const PREFIX=["Null","Vanta","Vøid","Liminal","Ion","Echo","Nacre","Kryo","Moth","Aether","Obscura","Drift","Astra","Pale","Æon","Noct","Velvet","Signal"];
const SUFFIX=["Division","Choir","Circuit","Waves","Bureau","Archive","Haze","Protocol","Bloom","Antenna","Murmur","Dialect","Mirage","Halo","Garden","Memory"];
const TITLES_A=["Antenna","Memory","Night","Violet","Glass","Velvet","Spectral","Polar","Lunar","Ghost","Infinite","Afterimage","Slow","Prismatic","Silent","Dissolved"];
const TITLES_B=["Rain","Archive","Oceans","Dream","Engine","Frequency","Silence","Station","Echo","Orbit","Horizon","Cities","Transmission","Light","Garden","Ritual"];
const TUNINGS=[
 {name:"19-EDO",oct:2,steps:19,chord:[0,6,11,17],mel:[0,3,6,8,11,14,17,19]},
 {name:"31-EDO",oct:2,steps:31,chord:[0,10,18,28],mel:[0,5,10,13,18,23,28,31]},
 {name:"22-EDO",oct:2,steps:22,chord:[0,7,13,20],mel:[0,3,7,10,13,17,20,22]},
 {name:"53-EDO",oct:2,steps:53,chord:[0,17,31,48],mel:[0,9,17,22,31,39,48,53]},
 {name:"7-limit JI",oct:2,ratios:[1,9/8,7/6,5/4,4/3,7/5,3/2,5/3,7/4,2],chord:[0,3,6,8],mel:[0,1,2,3,4,5,6,7,8,9]}
];
function hash(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function randomSeed(){const a=new Uint32Array(2);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(a);else{a[0]=(Math.random()*2**32)>>>0;a[1]=(Math.random()*2**32)>>>0;}return Array.from(a,x=>x.toString(36)).join("-");}
export function rngFor(seed){let a=hash(seed);return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const select=(r,a)=>a[Math.floor(r()*a.length)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const whole=(x,a,b,f)=>Number.isFinite(+x)?clamp(+x,a,b):f;
function pitch(t,n,base){if(t.ratios)return base*t.ratios[((n%t.ratios.length)+t.ratios.length)%t.ratios.length]*Math.pow(2,Math.floor(n/t.ratios.length));return base*Math.pow(2,n/t.steps);}
function phrase(r,language,concept){
 const pack=LANGUAGE_PACKS[language]||LANGUAGE_PACKS.en;
 const a=pack.map(part=>select(r,part));
 const topic=(CONCEPT_TERMS[language]||CONCEPT_TERMS.en).split("|")[CONCEPTS.indexOf(concept)];
 return [a[0],a[1],a[2],topic].join(" ");
}
function voiceIdentity(r,mood,concept){
 const v={id:Math.floor(r()*1000000),base:85+r()*120,grain:r(),drive:r(),formant:0.65+r()*1.6,rate:.75+r()*.6,whisper:r()*.75,robot:r(),vibrato:r()*.08};
 if(["melancholic","serene","weightless"].includes(mood)){v.base*=.83;v.drive*=.54;v.rate*=.84;}
 if(["electric","euphoric","curious"].includes(mood)){v.base*=1.13;v.rate*=1.18;v.drive=Math.min(1,v.drive+.19);}
 if(["ominous","alien","hypnotic"].includes(mood)){v.base*=.79;v.formant*=.7;v.whisper=Math.max(v.whisper,.35);}
 if(concept==="machines")v.robot=Math.max(.9,v.robot);
 if(concept==="ocean")v.whisper=Math.max(.42,v.whisper);
 if(concept==="ghosts")v.formant*=.68;
 return v;
}
export function makePlan(options={}){
 // R1 recipe keeps all audible settings inside the seed token.
 const input=String(options.seed??randomSeed()).slice(0,128);
 const bits=input.split(".");
 const recipe=bits[0]==="R1"&&bits.length===11?bits:null;
 const base=(recipe?recipe[1]:input).replace(/[.|]/g,"-").slice(0,48)||"null";
 const q=rngFor(base+"|RNR|metadata-v1");
 const style=STYLES.includes(options.style)?options.style:recipe&&STYLES[parseInt(recipe[2],36)]||select(q,STYLES);
 const mood=MOODS.includes(options.mood)?options.mood:recipe&&MOODS[parseInt(recipe[3],36)]||select(q,MOODS);
 const concept=CONCEPTS.includes(options.concept)?options.concept:recipe&&CONCEPTS[parseInt(recipe[4],36)]||select(q,CONCEPTS);
 const langs=Object.keys(LANGUAGE_PACKS);
 const language=LANGUAGE_PACKS[options.language]?options.language:recipe&&langs[parseInt(recipe[5],36)]||select(q,langs);
 const tuning=recipe&&TUNINGS[parseInt(recipe[6],36)]||select(q,TUNINGS);
 const preferred=style==="hiphop"?78+q()*32:style==="punk"?158+q()*42:style==="metal"?125+q()*60:style==="techno"?124+q()*30:style==="chiptune"?120+q()*56:style==="glitch"?95+q()*85:style==="harpsichord"||style==="medieval"?70+q()*52:style==="meditation"||style==="hangdrum"?48+q()*47:style==="synthwave"?94+q()*25:50+q()*57;
 const bpm=Math.round(whole(options.bpm,42,205,recipe?parseInt(recipe[7],36):preferred));
 const duration=Math.round(whole(options.duration,16,125,recipe?parseInt(recipe[8],36):40+q()*31));
 const withVox=Boolean(options.withVox??options.withVøx??(recipe?recipe[10]==="1":style==="hiphop"));
 const intensity=Math.round(whole(options.intensity,0,1,recipe?parseInt(recipe[9],36)/1000:.27+q()*.5)*1000)/1000;
 const seed=["R1",base,STYLES.indexOf(style).toString(36),MOODS.indexOf(mood).toString(36),CONCEPTS.indexOf(concept).toString(36),langs.indexOf(language).toString(36),TUNINGS.indexOf(tuning).toString(36),bpm.toString(36),duration.toString(36),Math.round(intensity*1000).toString(36),withVox?"1":"0"].join(".");
 const r=rngFor(seed+"|RNR|arrangement-v1");
 const artist=select(r,PREFIX)+" "+select(r,SUFFIX);
 const title=select(r,TITLES_A)+" "+select(r,TITLES_B);
 const root=[41.2,43.65,48.999,55,61.735,65.406,73.416,82.407,98][Math.floor(r()*9)];
 // Arrangement is deterministic for a given recipe; style indices 0–8 remain compatible.
 const {events,sections,breaks}=arrangeMusic({seed,style,mood,concept,language,bpm,duration,intensity},tuning,root,rngFor,pitch);
 const voices=composeVoices({seed,style,mood,concept,language,bpm,duration,intensity,withVox,breaks,sections,context:String(options.extraText||"").slice(0,3200)},
   LANGUAGE_PACKS,CONCEPT_TERMS,CONCEPTS,rngFor,voiceIdentity);
 return {version:VERSION,seed,style,mood,concept,language,bpm,duration,withVox,intensity,
  artist,title,tuning:tuning.name,events,sections,breaks,voices};
}
function renderEvent(channels,event,sr,seed){
 const L=channels[0],R=channels[1],from=Math.max(0,Math.floor(event.time*sr)),count=Math.min(Math.ceil(event.length*sr),L.length-from),f=event.freq,amp=event.amp;
 const pan=clamp(event.pan,-1,1),lg=Math.sqrt((1-pan)*.5),rg=Math.sqrt((1+pan)*.5);
 const kind=event.kind,phase=event.phase;let noisestate=event.noiseSeed|1,low=0,prev=0;
 const length=Math.max(.05,event.length);
 for(let j=0;j<count;j++){
  const t=j/sr,u=t/length,a=Math.min(1,t/(kind==="drone"?.9:.015)),release=Math.min(1,(length-t)/(kind==="drone"?1:.05));
  let env=a*clamp(release,0,1),v=0;
  noisestate^=noisestate<<13;noisestate^=noisestate>>>17;noisestate^=noisestate<<5;
  const noise=(noisestate/2147483648);
  if(kind==="kick"){env=Math.exp(-t*16);v=Math.sin(6.283185*(63*t+55*(1-Math.exp(-t*31))/31));}
  else if(kind==="snare"){env=Math.exp(-t*24);v=noise*.82+Math.sin(6.283185*176*t)*.18;}
  else if(kind==="hat"){env=Math.exp(-t*54);v=noise-prev;prev=noise;}
  else if(kind==="clap"){env=Math.exp(-t*26);v=noise*((t<.02||t>.036&&t<.055||t>.085)?1:.17);}
  else if(kind==="nature"){low=low*.995+noise*.005;v=(noise*.11+low*2)*Math.sin(6.283185*(.07+.17*u)*t);env=Math.sin(Math.PI*u);}
  else {
   const wobble=1+.0016*Math.sin(6.283185*(.18+event.phase*.12)*t);
   const p=6.283185*f*t*wobble+phase;
   const s=Math.sin(p),s2=Math.sin(p*2.001),s3=Math.sin(p*3.002);
   if(kind==="drone"){env*=.58+.32*Math.sin(Math.PI*u);v=s*.67+s2*.21+s3*.08;}
   if(kind==="pad"){env*=.46+.54*Math.sin(Math.PI*u);v=s*.6+Math.sin(p*1.004)*.19+s2*.18;}
   if(kind==="bell"){env*=Math.exp(-3.5*u);v=s*.6+Math.sin(p*2.72)*.24+Math.sin(p*4.14)*.12;}
   if(kind==="lead"){env*=.76+.23*Math.sin(t*7);v=Math.tanh((s+.39*s3)*1.7);}
   if(kind==="guitar"){env*=Math.exp(-4.2*u);v=(s*.6+s2*.26+s3*.1+noise*.045)*(.93+.07*Math.sin(6.283185*3.5*t));}
   if(kind==="bass"){env*=Math.exp(-.8*u);v=s*.7+s2*.16+Math.sin(p*.5)*.18;}
   if(kind==="chip"){env*=Math.exp(-.48*u);const x=(f*t+phase/(2*Math.PI))%1;v=(x<.22?1:-1)*.64+Math.sin(p*2)*.18;}
   if(kind==="chipbass"){env*=Math.exp(-1.7*u);const x=(f*t+phase/(2*Math.PI))%1;v=(x<.5?1:-1)*.42+Math.sin(p)*.53;}
   if(kind==="harpsichord"){env*=Math.exp(-6.5*t);v=s*.47+Math.sin(2*p)*.28+Math.sin(3.01*p)*.18+Math.sin(4.97*p)*.08;}
   if(kind==="lute"){env*=Math.exp(-4.2*t);v=s*.52+s2*.22+Math.sin(3*p)*.12+noise*.04;}
   if(kind==="flute"){env*=.7+.3*Math.sin(Math.PI*u);v=.85*Math.sin(p+.013*Math.sin(6.283185*4.8*t))+.07*noise;}
   if(kind==="handpan"){env*=Math.exp(-3.1*t);v=s*.54+Math.sin(p*2.02)*.27+Math.sin(p*3.92)*.13+Math.sin(p*.501)*.09;}
   if(kind==="metal"){env*=Math.exp(-.7*u);v=Math.tanh((s*.81+Math.sin(p*2.004)*.38+Math.sin(3.01*p)*.22)*4.5)*.83;}
   if(kind==="acid"){env*=Math.exp(-1.8*u);const saw=2*((f*t+phase/(2*Math.PI))%1)-1;low=low*.9+saw*.1;v=Math.tanh((saw*.52+(saw-low)*1.9)*2.1);}
   if(kind==="glitch"){const gate=Math.floor(t*18)%6;env*=gate===1||gate===4?.08:1;v=Math.round((s*.67+s2*.22)*7)/7;}
   if(kind==="choir"){env*=.55+.45*Math.sin(Math.PI*u);v=(Math.sin(p)*.49+Math.sin(p*1.005)*.32+Math.sin(p*.5)*.21);}
  }
  const out=amp*env*v;L[from+j]+=out*lg;R[from+j]+=out*rg;
 }
}
function renderVox(channels,item,sr){
 const {voice,text,time}=item;const chars=Array.from(text.toLowerCase()).filter(c=>c.trim()).slice(0,90);
 const step=.073/voice.rate,start=Math.floor(time*sr),L=channels[0],R=channels[1];
 let state=voice.id|1;const phonemes="aeiouàèéìòùäöüαειοηωаиоеуыэиあいうえおㅏㅓㅗㅜㅣ";
 for(let c=0;c<chars.length;c++){
  const ch=chars[c],code=ch.codePointAt(0),vowel=phonemes.includes(ch)||((code%9)<3),vowelBase=code%7;
  const f0=voice.base*(.85+((code%13)/28)),f1=(vowel?370:850)+(vowelBase*115)*voice.formant,f2=1050+vowelBase*195*voice.formant;
  const from=start+Math.floor(c*step*sr),n=Math.min(Math.floor(step*sr*.96),L.length-from);
  if(n<=0)break;
  let lp=0;
  for(let i=0;i<n;i++){
   const t=i/sr,u=i/n;state^=state<<13;state^=state>>>17;state^=state<<5;
   const noise=state/2147483648,attack=Math.min(1,u*9),tail=Math.min(1,(1-u)*5);
   const freq=f0*(1+voice.vibrato*Math.sin(6.283185*4*t)),p=6.283185*freq*t;
   const harmonic=Math.sin(p)+.46*Math.sin(2*p)+.21*Math.sin(3*p);
   const formant=.47*Math.sin(6.283185*f1*t)+.22*Math.sin(6.283185*f2*t);
   const raw=((.45+.55*voice.robot)*harmonic*formant+.27*voice.whisper*noise);
   lp=lp*.78+raw*.22;const distorted=Math.tanh((lp*.7+raw*.3)*(1.7+voice.drive*4));
   const value=distorted*.055*attack*tail*(vowel?1:.55);
   L[from+i]+=value*.7;R[from+i]+=value*.7;
  }
 }
}
function watermark(channels,seed,sr){
 // Low-level redundant acoustic provenance, NOT an unbreakable secret. No keys shipped.
 const r=rngFor("RNR/provenance/"+seed),L=channels[0],R=channels[1],len=L.length;
 for(let time=1;time<len/sr-1;time+=2.63){
  const bit=r()>.5?1:-1,f=1650+(Math.floor(r()*8)*53),start=Math.floor(time*sr),n=Math.min(2400,len-start);
  for(let i=0;i<n;i++){const e=Math.sin(Math.PI*i/n)**2;const v=bit*.00013*e*Math.sin(6.283185*f*i/sr);L[start+i]+=v;R[start+i]+=v;}
 }
}
function applyArrangementBreaks(channels,breaks,sr){
 // Short fades bound true silence in the final PCM, after delay feedback.
 if(!breaks?.length)return;
 const n=channels[0].length,edge=Math.max(1,Math.round(sr*.015));
 for(const br of breaks){
  const start=Math.max(0,Math.min(n,Math.floor(br.start*sr)));
  const end=Math.max(start,Math.min(n,Math.ceil(br.end*sr)));
  for(const ch of channels){
   for(let i=Math.max(0,start-edge);i<start;i++)ch[i]*=(start-i)/edge;
   ch.fill(0,start,end);
   for(let i=end;i<Math.min(n,end+edge);i++)ch[i]*=(i-end)/edge;
  }
 }
}
export function renderPCM(plan,sampleRate=SAMPLE_RATE){
 const sr=whole(sampleRate,16000,48000,SAMPLE_RATE),n=Math.ceil(plan.duration*sr);
 const channels=[new Float32Array(n),new Float32Array(n)];
 for(const ev of plan.events)renderEvent(channels,ev,sr,plan.seed);
 if(plan.withVox)for(const v of plan.voices)renderVox(channels,v,sr);
 const dl=Math.max(1,Math.floor(sr*.18)),dr=Math.max(1,Math.floor(sr*.263));
 const L=channels[0],R=channels[1];let m=0;
 for(let i=0;i<n;i++){
  if(i>=dl)L[i]+=.19*R[i-dl];
  if(i>=dr)R[i]+=.16*L[i-dr];
  m=Math.max(m,Math.abs(L[i]),Math.abs(R[i]));
 }
 const gain=m>0?.86/Math.max(m,.86):1;
 for(let i=0;i<n;i++){L[i]=Math.tanh(L[i]*gain*.91);R[i]=Math.tanh(R[i]*gain*.91);}
 applyArrangementBreaks(channels,plan.breaks,sr);
 watermark(channels,plan.seed,sr);
 return {channels,sampleRate:sr,plan};
}
export function pcmToWav(audio){
 const [L,R]=audio.channels,sr=audio.sampleRate,n=L.length,out=new ArrayBuffer(44+n*4),dv=new DataView(out);
 const ascii=(pos,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(pos+i,s.charCodeAt(i));};
 ascii(0,"RIFF");dv.setUint32(4,36+n*4,true);ascii(8,"WAVE");ascii(12,"fmt ");dv.setUint32(16,16,true);
 dv.setUint16(20,1,true);dv.setUint16(22,2,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*4,true);dv.setUint16(32,4,true);dv.setUint16(34,16,true);
 ascii(36,"data");dv.setUint32(40,n*4,true);
 for(let i=0;i<n;i++){dv.setInt16(44+i*4,Math.round(clamp(L[i],-1,1)*32767),true);dv.setInt16(46+i*4,Math.round(clamp(R[i],-1,1)*32767),true);}
 return new Blob([out],{type:"audio/wav"});
}
function syncsafe(buffer,offset,length){
 buffer[offset]=(length>>>21)&127;buffer[offset+1]=(length>>>14)&127;buffer[offset+2]=(length>>>7)&127;buffer[offset+3]=length&127;
}
function id3StringFrame(id,value){
 const data=new TextEncoder().encode(String(value)),size=data.length+1,b=new Uint8Array(10+size);
 for(let i=0;i<4;i++)b[i]=id.charCodeAt(i);syncsafe(b,4,size);b[10]=3;b.set(data,11);return b;
}
function id3Tag(plan){
 const recipe=JSON.stringify({generator:"RNR",version:VERSION,seed:plan.seed,tuning:plan.tuning,style:plan.style,vox:plan.withVox});
 const frames=[id3StringFrame("TIT2",plan.title),id3StringFrame("TPE1",plan.artist),id3StringFrame("TALB","RΛNDØM[NULL] RADIO"),id3StringFrame("TCON","Xenarmonic"),id3StringFrame("TXXX","RNR\u0000"+recipe)];
 const len=frames.reduce((a,b)=>a+b.length,0),head=new Uint8Array(10),tag=new Uint8Array(10+len);head.set([73,68,51,4,0,0]);syncsafe(head,6,len);tag.set(head);
 let p=10;for(const f of frames){tag.set(f,p);p+=f.length;}return tag;
}
export function pcmToMP3(audio,bitrate=128){
 if(!globalThis.lamejs?.Mp3Encoder)throw new Error("Encoder MP3 statico non caricato (vendor/lame.min.js).");
 const [L,R]=audio.channels,enc=new globalThis.lamejs.Mp3Encoder(2,audio.sampleRate,whole(bitrate,64,192,128)),chunks=[id3Tag(audio.plan)];
 for(let i=0;i<L.length;i+=1152){
  const n=Math.min(1152,L.length-i),left=new Int16Array(n),right=new Int16Array(n);
  for(let j=0;j<n;j++){left[j]=Math.round(clamp(L[i+j],-1,1)*32767);right[j]=Math.round(clamp(R[i+j],-1,1)*32767);}
  const b=enc.encodeBuffer(left,right);if(b.length)chunks.push(b);
 }
 const tail=enc.flush();if(tail.length)chunks.push(tail);
 return new Blob(chunks,{type:"audio/mpeg"});
}
export function filename(plan,ext="mp3"){
 const clean=s=>s.normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
 return clean(plan.artist)+"--"+clean(plan.title)+"--"+clean(plan.seed)+"."+ext;
}
export async function generate(options={},format="mp3"){
 const plan=makePlan(options),audio=renderPCM(plan),blob=format==="wav"?pcmToWav(audio):pcmToMP3(audio);
 return {plan,blob};
}
