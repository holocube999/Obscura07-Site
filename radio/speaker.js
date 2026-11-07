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
const BIO_QUESTIONS=[
 (band,p)=>band+" nasce "+p.origin+". Il primo esperimento era "+p.experiment+".",
 (band,p)=>"Il progetto "+band+" è formato da "+p.members+". Sono noti per "+p.instrument+".",
 (band,p)=>"La loro ossessione è "+p.reason+". Tutto è cominciato "+p.origin+".",
 (band,p)=>"Quando gli chiedono perché suonano, rispondono che vogliono "+p.reason+".",
 (band,p)=>"Il primo concerto di "+band+" è stato "+p.origin+".",
 (band,p)=>"Per "+band+" il suono più importante è "+p.instrument+".",
 (band,p)=>"La band è nata nel "+p.year+", dopo un esperimento con "+p.instrument+".",
 (band,p)=>"La leggenda vuole che "+band+" abbia scritto il suo primo pezzo "+p.origin+".",
 (band,p)=>"Non hanno mai smesso di cercare "+p.reason+".",
 (band,p)=>"Il loro metodo è insolito: prima registrano "+p.instrument+", poi scrivono il resto.",
 (band,p)=>"Una volta hanno suonato per "+p.members+" e un tecnico addormentato.",
 (band,p)=>"La cosa che li rende diversi è la scelta di "+p.instrument+".",
 (band,p)=>"I loro concerti cambiano sempre, ma il punto di partenza rimane "+p.reason+".",
 (band,p)=>"Il brano di stasera è la loro risposta a una domanda: come trasformare "+p.experiment+" in musica?",
 (band,p)=>"Hanno scelto il nome "+band+" dopo una notte trascorsa "+p.origin+".",
 (band,p)=>"I loro strumenti cambiano spesso. Non rinunciano mai a "+p.instrument+"."
];
const BIO_DETAIL={
 it:{members:["un duo di fratelli","tre amici d'infanzia","quattro improvvisatori","una musicista e due programmatori","cinque sperimentatori","due ex tecnici radio"],
 instrument:["un sintetizzatore difettoso","un vecchio campionatore","una drum machine modificata","un basso preparato","nastri magnetici consumati","strumenti costruiti a mano","un oscillatore analogico","un organo modificato","una chitarra senza accordatura","microfoni a contatto"],
 experiment:["una registrazione notturna","un segnale ricevuto per errore","un rumore di fabbrica","il canto di una vecchia antenna","una sequenza senza fine"]},
 en:{members:["a pair of siblings","three old friends","four improvisers","two sound engineers","five sonic explorers"],
 instrument:["a damaged synthesizer","an old sampler","a modified drum machine","a prepared bass","tape loops","handbuilt instruments","an analog oscillator","a detuned guitar"],
 experiment:["a midnight recording","a stray radio signal","factory noise","a forgotten tape","an endless pulse"]}
};
function bandProfile(band,lang,pack){
 const r=randomFor("RNR-BAND-PROFILE-1|"+band+"|"+lang),details=BIO_DETAIL[lang]||BIO_DETAIL.en;
 return {origin:choose(r,pack.origin),reason:choose(r,pack.reason),members:choose(r,details.members),
 instrument:choose(r,details.instrument),experiment:choose(r,details.experiment),
 year:1980+Math.floor(r()*46)};
}
const FOREIGN={
 fr:{
  intro:["Vous écoutez Random Null Radio","Un nouveau morceau arrive","Gardons la fréquence ouverte"],
  bio:["Un groupe venu de","Ils enregistrent près de","Ils se sont rencontrés dans"],
  origin:["une ancienne station de radio","une ville au bord de la mer","un laboratoire souterrain","un quartier industriel","un observatoire isolé"],
  reason:["transformer le bruit en mélodie","explorer des fréquences impossibles","faire danser les ombres"],
  joke:["Notre technicien a encore perdu la fréquence.","La radio fonctionne. C'est presque inquiétant."],
  ads:["Antennes Lunaires, même les fantômes vous captent.","Café Nébuleuse, une tasse pour les nuits étranges."],
  calls:["J'adore cette musique, mes voisins aussi maintenant.","Votre émission vient de sauver ma soirée."],
  ad:"Publicité fictive",call:"Appel fictif",news:"Selon"},
 es:{
  intro:["Escuchas Random Null Radio","Llega otra canción","Seguimos en una frecuencia imposible"],
  bio:["Un grupo nacido en","Se conocieron cerca de","Graban sus canciones en"],
  origin:["una radio abandonada","un pueblo junto al mar","un laboratorio subterráneo","un barrio industrial","un observatorio de montaña"],
  reason:["convertir ruido en melodía","explorar frecuencias imposibles","hacer bailar a las sombras"],
  joke:["El técnico dice que todo funciona. Qué sospechoso.","No sabemos adónde va la señal, pero suena bien."],
  ads:["Antenas Lunares, para señales imposibles.","Café Nebulosa, para noches sin reloj."],
  calls:["Me encanta esta canción, ¡subid el volumen!","Este grupo me ha alegrado la noche."],
  ad:"Anuncio ficticio",call:"Llamada ficticia",news:"Según"},
 de:{
  intro:["Hier ist Random Null Radio","Gleich kommt ein neuer Titel","Wir bleiben auf dieser seltsamen Frequenz"],
  bio:["Eine Band aus","Sie trafen sich in","Ihre Aufnahmen stammen aus"],
  origin:["einem verlassenen Radiosender","einer kleinen Küstenstadt","einem unterirdischen Labor","einem Industrieviertel","einer abgelegenen Sternwarte"],
  reason:["Lärm in Melodien verwandeln","unmögliche Frequenzen erforschen","die Schatten tanzen lassen"],
  joke:["Unser Techniker sagt, alles funktioniert. Verdächtig.","Das Signal ist klar, unser Plan nicht."],
  ads:["Mondantennen, für unmögliche Signale.","Nebelkaffee, für die ganz langen Nächte."],
  calls:["Großartige Musik, meine Nachbarn hören jetzt mit.","Diese Band hat meinen Abend gerettet."],
  ad:"Erfundene Werbung",call:"Erfundener Anruf",news:"Laut"}
};
export function planSpeaker(previous,next,{language="it",seed="",verifiedNews=[],forcedType=null}={}){
 const r=randomFor(seed+"|"+(previous?.seed||"")+"|"+(next?.seed||"")+"|DJ07");
 const host=createVoicePersona("RNR/station/"+(seed.split("-")[0]||"default"),{role:"host",style:"radio"});
 const caller=createVoicePersona("RNR/fan/"+(next?.seed||seed),{role:"caller",style:"radio",excludeId:host.id});
 const pack=WORDS[language]||WORDS.en,foreign=FOREIGN[language];
 const roll=r();
 if(!forcedType&&roll<.52)return null;
 const news=Array.isArray(verifiedNews)?verifiedNews.filter(v=>v&&typeof v.title==="string"&&/^https:\/\//.test(v.url||"")&&v.verified===true&&typeof v.source==="string"):[];
 const type=forcedType||(
  roll<.68?"intro":roll<.80?"bio":roll<.89?"joke":
  roll<.96?"advertisement":roll<.99?"caller":news.length?"news":"intro");
 if(!["intro","bio","joke","advertisement","caller","news"].includes(type))return null;
 if(type==="news"&&!news.length)return null;
 const band=String(next?.artist||"Random Null").slice(0,100),
  title=String(next?.title||"Unknown Transmission").slice(0,100);
 const profile=bandProfile(band,language,foreign?{...pack,origin:foreign.origin,reason:foreign.reason}:pack),pick=a=>choose(r,a);
 let text="",persona={...host,emotion:"warm",stumble:0},segments=null,article=null;
 if(type==="intro"){
  if(foreign)text=pick(foreign.intro)+". "+band+", "+title+".";
  else {
   const variants=[
    ()=>pick(pack.greet)+". "+band+" con "+title+".",
    ()=>pick(pack.bridge)+". Arrivano "+band+": "+title+".",
    ()=>"Dopo "+(previous?.title||"la pausa")+" cambiamo aria. "+band+", "+title+".",
    ()=>"Tra poco ascolterete "+title+" dei "+band+".",
    ()=>"La prossima frequenza è di "+band+". Si chiama "+title+".",
    ()=>"Per chi è ancora sveglio, ecco "+band+" con "+title+".",
    ()=>"Non aggiungo altro: "+band+", "+title+".",
    ()=>"Abbassiamo le luci. "+band+" e "+title+"."
   ];
   text=pick(variants)();
  }
 }else if(type==="bio"){
  if(foreign)text=band+". "+pick(foreign.bio)+" "+profile.origin+". "+
  pick(foreign.intro)+".";
  else if(language==="it")text=pick(BIO_QUESTIONS)(band,profile);
  else {
   const choices=[
    band+" formed in "+profile.origin+" and started by recording "+profile.experiment+".",
    band+" is "+profile.members+". Their trademark is "+profile.instrument+".",
    "Why do they play? To "+profile.reason+". "+title+" is their latest experiment.",
    band+" first played in "+profile.origin+". They still use "+profile.instrument+".",
    band+" began in "+profile.year+". Their obsession is "+profile.reason+"."
   ];
   text=pick(choices);
  }
 }else if(type==="joke"){
  text=foreign?pick(foreign.joke):pick(pack.jokes);
  persona={...persona,emotion:r()>.5?"sarcastic":"grumpy"};
 }else if(type==="advertisement"){
  text=foreign?foreign.ad+": "+pick(foreign.ads):pick(pack.ads);
 }else if(type==="caller"){
  const fan=foreign?foreign.call+": "+pick(foreign.calls):pack.fanLabel+". "+pick(pack.calls);
  const intro=language==="it"?"C'è una telefonata immaginaria in linea. Pronto?":
   language==="fr"?"Un appel fictif à l'antenne. Allô?":
   language==="es"?"Tenemos una llamada ficticia. ¿Hola?":
   language==="de"?"Ein erfundener Anruf. Hallo?":
   "We have a fictional caller on the line. Hello?";
  segments=[
   {text:intro,persona:{...host,emotion:"curious",stumble:0}},
   {text:fan,persona:{...caller,emotion:"excited"}},
   {text:language==="it"?"Grazie per la chiamata, torniamo alla musica.":
    language==="fr"?"Merci pour cet appel, place à la musique.":
    language==="es"?"Gracias por llamar, volvemos a la música.":
    language==="de"?"Danke für den Anruf, zurück zur Musik.":
    "Thanks for calling. Back to the music.",persona:{...host,emotion:"warm",stumble:0}}
  ];
  text=segments.map(x=>x.text).join(" ");
  persona=caller;
 }else if(type==="news"){
  article=pick(news);
  const prefix=language==="it"?"Titolo dalle notizie, secondo":
   foreign?foreign.news:"News headline according to";
  text=prefix+" "+article.source+": "+article.title+".";
 }
 if(type==="intro"&&next?.style==="hiphop")persona={...persona,emotion:"excited"};
 return {type,text,persona,segments,language:WORDS[language]||FOREIGN[language]?language:"en",
  fictional:type==="caller"||type==="advertisement"||type==="bio",
  verified:type==="news",article};
}
export function renderSpeakerPCM(cue,{sampleRate=22050}={}){
 if(!cue?.text)return null;
 const sr=C(Math.round(sampleRate),8000,48000);
 const segments=Array.isArray(cue.segments)&&cue.segments.length?cue.segments:[{text:cue.text,persona:cue.persona}];
 const packets=[];let total=0;
 for(const segment of segments){
  const persona=segment.persona||cue.persona,rnd=randomFor(segment.text+persona.id);
  const words=String(segment.text).split(/\s+/).filter(Boolean).slice(0,55);
  for(let i=0;i<words.length;i++){
   let word=words[i];
   if(persona.stumble&&rnd()<persona.stumble&&word.length>4)word=word.slice(0,2)+"-"+word;
   const pause=/[.!?]$/.test(word)?.14:/[,;:]$/.test(word)?.06:.026;
   const duration=(.17+Math.min(.16,word.length*.012))/persona.pace;
   const mood=persona.emotion||"warm";
   const attitude=mood==="excited"?1.10:mood==="grumpy"?.94:1;
   const hz=persona.pitch*attitude*(1+.065*Math.sin(i*.7)+(/\?$/.test(word)?.09:0));
   const pcm=synthesizeWord(word,{sampleRate:sr,targetSamples:Math.floor(duration*sr),pitch:hz,
    formantShift:persona.formant,tuneStrength:0,language:cue.language,
    breathiness:persona.breath,mode:persona.mode,
    spectralTilt:persona.spectralTilt,nasality:persona.nasality,
    rasp:persona.rasp,jitter:persona.jitter,shimmer:persona.shimmer,
    attack:persona.attack,inflection:(mood==="excited"?.09:.06)*Math.sin(i*.5)},rnd);
   const silence=Math.round(pause*sr);packets.push({pcm,silence,pan:persona.role==="caller"?.16:0});
   total+=pcm.length+silence;
  }
  total+=Math.round(sr*.15);packets.push({pcm:new Float32Array(0),silence:Math.round(sr*.15),pan:0});
 }
 const left=new Float32Array(total+Math.round(sr*.24)),right=new Float32Array(left.length);
 let at=0;
 for(const {pcm,silence,pan} of packets){
  const l=pan>0?.25:.30,r=pan<0?.25:.30;
  for(let i=0;i<pcm.length;i++){left[at+i]+=pcm[i]*l;right[at+i]+=pcm[i]*r;}
  at+=pcm.length+silence;
 }
 const edge=Math.min(Math.round(sr*.025),left.length>>>2);
 for(const ch of [left,right])for(let i=0;i<edge;i++){
  ch[i]*=i/edge;ch[ch.length-1-i]*=i/edge;
 }
 return {sampleRate:sr,channels:[left,right],duration:left.length/sr,cue};
}
