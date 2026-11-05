/* Original offline grammar and rhyme corpus for Random[null]Radio.
 * No third-party headlines, scraped pages, external fetch or accounts.
 */
const IT={
 subjects:["La notte","La memoria","Una città invisibile","Il futuro","Un algoritmo stanco","Il tempo","La luna","Un astronauta","La radio","Il silenzio","Una macchina","Il sonno","Un archivio","Un satellite","Una fotografia","L'ultima antenna","Una biblioteca","Un giardino verticale","La paura","Una vecchia console","Il mare","La gravità","Un semaforo","Una cometa","La coscienza","Il deserto","Una stazione","Un oracolo","Il pianeta","Una voce lontana","L'universo","Un vecchio robot"],
 verbs:["ascolta","interroga","attraversa","insegue","dimentica","ricorda","rimette in ordine","protegge","nasconde","costruisce","trasforma","studia","cancella","inventa","incontra","misura","raccoglie","fotografa","scompone","ridisegna","imita","salva","osserva","rifiuta","sogna","descrive","analizza","decifra","contempla","sorveglia"],
 objects:["il rumore delle stelle","una finestra sul passato","le rovine di domani","il codice dell'oceano","una città che non esiste","la voce di un pianeta","un'ombra senza padrone","il cielo capovolto","i sogni di un microprocessore","la grammatica del vuoto","un temporale magnetico","il segnale perduto","un pianoforte sottomarino","la memoria di un edificio","il silenzio degli ascensori","un motore senza benzina","le antenne della luna","il battito di una montagna","la password di un ricordo","un archivio di possibilità","la geometria del sonno","una mappa senza strade","la pioggia artificiale","un orizzonte interrotto","il traffico dei satelliti","la materia delle parole","un oceano di vetro","i corridoi dell'infinito"],
 places:["nel sottosuolo digitale","tra colonne di basalto","oltre il confine della luce","sopra la città dormiente","dietro una porta senza muro","sulla superficie del tempo","dentro un sogno incompleto","alla fine della trasmissione","sotto un cielo di cemento","in un corridoio senza uscita","mentre il mondo cambia canale","prima dell'ultima eclissi","tra i segnali della notte","senza consultare l'orologio","quando tace il motore","sotto una pioggia di bit","tra i resti della cometa","nel silenzio di un museo","vicino a un modem dimenticato","all'ombra di una supernova"],
 adverbs:["lentamente","all'improvviso","senza rumore","per la seconda volta","come se fosse un ricordo","con una precisione assurda","con sospetta eleganza","fuori dal calendario","a occhi chiusi","in direzione opposta","in una lingua sconosciuta"],
 questions:["Se {a} {v} {o}, chi può fermare il tempo?","Quando {a} {v} {o}, è la causa o l'effetto a ricordarlo?","Perché {a} {v} {o}, se il silenzio non ha risposto?","Se fosse il futuro a inventare il passato, chi dovrebbe chiedere scusa?","È la domanda che cerca una risposta o la risposta che sogna una domanda?","Si può perdere la memoria di un luogo in cui non siamo mai stati?","È più pesante il silenzio di un archivio o l'eco di una stanza vuota?","Se il tempo si fermasse per ascoltare, chi darebbe il via alla musica?","Quando un sogno si accorge di essere reale, chi deve svegliarsi?","Se la notte interrogasse il sole, chi dei due sarebbe il testimone?"],
 rituals:["Il silenzio firma il verbale dell'impossibile.","Il futuro entra dalla porta che il passato ha dimenticato.","La memoria chiede al tempo di non avere fretta.","Un satellite presenta le dimissioni all'orizzonte.","La gravità si prende una pausa e perde il biglietto.","Il pianeta risponde alla radio con una domanda.","Il rumore si volta e riconosce il proprio silenzio.","Le antenne applaudono senza produrre suono."],
 slogans:["Nessun ritorno.","Un altro orizzonte.","Ricorda la trasmissione.","L'eco non dorme.","Il rumore ha memoria.","Sempre fuori frequenza.","Il sogno è in ascolto.","La notte non si spegne.","Sintonizza l'impossibile.","Cambia il futuro, non il segnale."],
 rhyme:{
  ore:["il motore","il rumore","il colore","il valore","il calore","l'errore","il terrore","lo splendore"],
  ale:["il segnale","il rituale","il finale","il canale","il temporale","un animale","il digitale","il piano astrale"],
  ione:["la visione","la collisione","la dimensione","la trasmissione","l'illusione","la proiezione","la connessione","la rivoluzione"],
  enza:["la frequenza","la presenza","la coscienza","la pazienza","l'assenza","la potenza","la resistenza","la sequenza"],
  etto:["il progetto","il difetto","il sospetto","il concetto","l'effetto","l'aspetto","il prospetto","il brevetto"],
  ita:["la verità","la velocità","la gravità","l'identità","l'oscurità","l'elettricità","la realtà","la possibilità"]
 },
 rapPrefixes:["Cammino tra le ombre e trovo","Il mondo cambia pelle, sento","Non vendo la mia voce, salvo","Sulla linea dell'orizzonte leggo","Un robot mi racconta ancora","La città si è svegliata con","Attraverso il silenzio e cerco","Non confondo i miei sogni con","Mi fermo al quarto battito e ascolto","Cambio direzione e difendo","La memoria non smette di cercare","Nel campione della notte riconosco","Sotto il cemento luminoso inseguo","Perdo la strada, ma ritrovo","Il basso rompe il vetro e sento"]
};
const EN={
 subjects:["The night","Memory","A silent machine","The future","A distant satellite","Time","The moon","An old algorithm","The radio","A forgotten signal","An invisible city","The ocean","A tired astronaut","A cosmic library","A broken mirror","A digital garden","A lonely planet","An ancient modem","A restless shadow","The last station"],
 verbs:["questions","follows","remembers","forgets","studies","rearranges","protects","describes","rewrites","measures","observes","deciphers","records","transforms","collects","imagines","invents","abandons","repairs","rebuilds"],
 objects:["a forgotten transmission","the geometry of silence","a window into tomorrow","the ruins of the future","the shadow of a planet","a dream without an ending","the sound of distant stars","a city beyond the horizon","an impossible signal","the memory of a mountain","a map with no roads","the rhythm of the ocean","a room without a ceiling","the password of time","an unfinished universe","the language of the moon","a clock without a face","the voice of an elevator"],
 places:["beneath the monoliths","between the stars","without asking permission","in a forgotten museum","before the next eclipse","under the broken neon","inside a distant dream","above the silent ocean","in the last transmission","beyond the morning haze"],
 adverbs:["slowly","without warning","for the last time","like an old memory","in the wrong direction","behind the closed door"],
 questions:["If {a} {v} {o}, what does the clock remember?","When {a} {v} {o}, which answer has forgotten its question?","Does the dream invent the dreamer, or does the dreamer invent the dream?","If silence could speak, who would understand its accent?","When the future remembers yesterday, what remains of tomorrow?","Can an empty room hear a thought before it exists?","Is a memory a journey or a destination with no address?"],
 rituals:["The station remembers a passenger who never arrived.","An antenna asks the moon for another frequency.","Silence reviews the minutes of its last meeting.","A digital garden dreams of a real storm.","The last satellite refuses to forget the sunrise.","A machine measures the weight of a question."],
 slogans:["No signal is ever truly lost.","Listen beyond the horizon.","Remember the future.","Nothing moves but the night.","Let the silence breathe.","Another universe is listening.","The last transmission continues."],
 rhyme:{
  ight:["the night","the light","my sight","the flight","the height","the fight","the right","the twilight"],
  eam:["the dream","the stream","the beam","the scheme","the theme","the team","the laser beam","the silver stream"],
  ow:["the glow","the flow","the snow","the show","the afterglow","the undertow","the echoing flow","the evening glow"],
  ound:["the sound","the ground","the background","the underground","the playground","the battleground","the common ground","the compound"]
 },
 rapPrefixes:["I walk through the static and follow","I cross the skyline and chase","I lose another signal but find","I count the broken beats beneath","I heard the city whisper about","I keep the final promise to","I leave my doubts behind and choose","I turn the silence into","I let the rhythm carry","I keep a secret written in","I hear the distant satellites call","The neon in my head reveals"]
};
export const OFFLINE_DICTIONARY={it:IT,en:EN};
const choose=(rng,arr)=>arr[Math.floor(rng()*arr.length)];
function scrub(value){
 return String(value||"").normalize("NFKC").replace(/<[^>]*>/g,"")
  .replace(/[^\p{L}\p{N}'’\-\s.,!?;:]/gu," ").replace(/\s+/g," ").trim().slice(0,3200);
}
export function fragmentWords(userText,limit=80){
 // Only user-supplied or licensed text. No background scraping.
 return [...new Set(scrub(userText).split(/\s+/)
   .map(x=>x.replace(/[.,!?;:]/g,"")).filter(x=>x.length>=4&&x.length<=18))].slice(0,limit);
}
export function originalSentence(rng,language="it",kind="statement",context=""){
 const data=OFFLINE_DICTIONARY[language]||EN;
 const a=choose(rng,data.subjects),v=choose(rng,data.verbs);
 const contextWords=context?fragmentWords(context):[];
 const contextual=contextWords.length&&rng()<.3;
 const o=contextual?(language==="it"?"l'idea di ":"the idea of ")+choose(rng,contextWords):choose(rng,data.objects);
 if(kind==="question"||kind==="marzullo"){
  return choose(rng,data.questions).replaceAll("{a}",a.toLowerCase())
   .replaceAll("{v}",v).replaceAll("{o}",o).replace(/^./,x=>x.toUpperCase());
 }
 if(kind==="slogan")return choose(rng,data.slogans);
 if(kind==="abstract")return choose(rng,data.rituals);
 if(kind==="word"){
  const pool=context?fragmentWords(context):[];
  return pool.length&&rng()<.25?choose(rng,pool):
   choose(rng,data.objects).split(/\s+/).at(-1).replace(/[^\p{L}\p{N}]/gu,"");
 }
 return a+" "+v+" "+o+" "+choose(rng,rng()<.5?data.places:data.adverbs)+".";
}
export function rhymeStanza(rng,language="it",stanza=0){
 const data=OFFLINE_DICTIONARY[language]||EN;
 const fam=Object.keys(data.rhyme);
 const first=choose(rng,fam);
 const second=choose(rng,fam.filter(x=>x!==first));
 const scheme=stanza%2?"ABAB":"AABB";
 const used={};
 return Array.from({length:4},(_,i)=>{
  const family=scheme[i]==="A"?first:second,choices=data.rhyme[family];
  const remaining=choices.filter(x=>!(used[family]||[]).includes(x));
  const end=choose(rng,remaining);
  (used[family]??=[]).push(end);
  const text=choose(rng,data.rapPrefixes)+" "+end+".";
  return {text,family,end,scheme:scheme[i],rhymeWord:end.split(/\s+/).pop(),bar:i};
 });
}
export function corpusCounts(){
 const banks=[IT,EN];return banks.reduce((acc,b)=>{
  for(const key of ["subjects","verbs","objects","places","adverbs","questions","rituals","slogans"])
   acc[key]=(acc[key]||0)+(b[key]?.length||0);
  acc.rhymeWords=(acc.rhymeWords||0)+Object.values(b.rhyme).reduce((n,v)=>n+v.length,0);
  return acc;
 },{});
}
