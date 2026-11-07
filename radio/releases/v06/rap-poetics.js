/* Symbolic rap authoring: constrained syllables and rhyme families, 100% offline. */
import {estimateSyllables} from "./phonology.js";
import {rhymeStanza} from "./linguistic-corpus.js";
const WORDS={
 it:{
 memory:"archivio|memoria|diario|ricordo|fotogramma|vinile|passato|taccuino|album|ritratto|nastrino|pellicola",
 time:"tempo|quadrante|ritardo|minuto|domani|storia|presente|notte|orologio|giorno|secondo|sveglia",
 horizon:"confine|distanza|passaggio|sentiero|viaggio|finestra|cavalcavia|ponte|binario|orizzonte|traguardo",
 machines:"motore|circuito|codice|antenna|sensore|tastiera|processore|algoritmo|segnale|robot|display|scheda",
 sleep:"sogno|risveglio|incubo|veglia|pensiero|lenzuolo|stanza|silenzio|palpebra|cuscino|notte",
 ocean:"abisso|oceano|porto|corrente|marea|bussola|faro|nave|onda|risacca|fondale|schiuma",
 stars:"stella|orbita|cometa|cosmo|galassia|satellite|atmosfera|telescopio|pianeta|luna|eclissi",
 ghosts:"ombra|fantasma|corridoio|soglia|specchio|rovina|voce|ruggine|eco|assenza|sussurro",
 silence:"silenzio|attesa|respiro|pausa|vuoto|calma|eco|pensiero|vento|assenza|distanza",
 light:"neon|alba|bagliore|finestra|riflesso|sole|luce|colore|lampione|vetrina|lampo",
 dreams:"sogno|fantasia|desiderio|mente|visione|futuro|ricordo|risveglio|incubo|pensiero",
 cities:"strada|palazzo|periferia|quartiere|asfalto|stazione|vicolo|tetto|piazza|ponte|cortile|semaforo",
 echoes:"eco|antenna|radio|frequenza|riverbero|rimbombo|voce|cassa|traccia|ritmo|stereo",
 entropy:"caos|frattura|errore|rumore|polvere|ruggine|rovina|scintilla|crepa|detrito|guasto",
 origin:"origine|radice|seme|sorgente|partenza|memoria|casa|radice|strada|traccia|fondamento"
 },
 en:{
 memory:"archive|memory|record|picture|diary|cassette|portrait|album|photograph|yesterday",
 time:"clock|second|sunset|tomorrow|hour|history|minute|midnight|future|day",
 machines:"engine|circuit|processor|signal|robot|screen|code|sensor|keyboard|modem",
 cities:"city|street|suburb|station|bridge|district|tower|sidewalk|crossing|alley",
 ocean:"wave|ocean|tide|harbor|compass|current|island|ship|shore|lighthouse",
 stars:"planet|orbit|comet|galaxy|satellite|telescope|cosmos|moon|meteor|eclipse",
 dreams:"dream|vision|future|thought|nightmare|desire|memory|night|fantasy|sleep",
 silence:"silence|pause|breath|quiet|absence|distance|waiting|static|fog|wind"
 }
};
const ACTION={
 it:"conto i passi|cambio prospettiva|rileggo i segni|tengo il ritmo|alzo la voce|seguo la traccia|rompo il silenzio|guardo lontano|respiro piano|ascolto il basso|cambio frequenza|riapro la porta|cerco le prove|raccolgo i pezzi|tengo la rotta|ricordo ogni passo|non cambio faccia|ritorno sul beat|salto la barriera|trovo un dettaglio|porto la storia|inseguo il suono|attraverso la notte|sfido la corrente|ritrovo la strada|fisso la scena|scrivo la rotta|metto a fuoco|misuro il tempo|cambio il finale|scelgo le parole|rompo lo schema".split("|"),
 en:"counting the steps|changing the frame|reading the signs|keeping the rhythm|raising my voice|following tracks|breaking the silence|watching the light|hearing the drums|opening doors|finding the beat|holding the course|changing the story|crossing the line|moving through night|following the sound|keeping my word|finding a path|changing direction|searching for clues".split("|")
};
const BRIDGE={
 it:"sul beat|tra i muri|a occhi aperti|nel buio|in equilibrio|senza scuse|in mezzo al traffico|ad alta voce|nella nebbia|fino all'alba|controvento|fuori rotta|a mani nude|nel silenzio|sulla strada|nel presente|prima del giorno|fuori dal coro|lontano da casa|dietro la curva|dentro al ritmo|sotto i neon|senza fretta|a mezzanotte".split("|"),
 en:"on the beat|under the lights|through the night|without a map|on the road|in the dark|on my own|over the line|in the rain|out of time|in the distance|past the corner|under the moon|around the block".split("|")
};
const sample=(r,a)=>a[Math.floor(r()*a.length)];
function phrase(r,language,topic,ending){
 const a=sample(r,ACTION[language]),b=sample(r,BRIDGE[language]),n=sample(r,topic);
 const formats=language==="it"?[
  a+", "+b+", seguo "+ending,
  a+", ritrovo "+ending,
  "Da "+n+" arriva "+ending,
  a+", non perdo "+ending,
  "Tra "+n+" e "+b+" distinguo "+ending,
  a+", la mia strada porta a "+ending,
  "Sotto "+n+" non nascondo "+ending,
  "Con "+n+" nella testa riconosco "+ending,
  b+", cambio passo verso "+ending,
  a+", poi mi fermo su "+ending,
  "Non vendo "+n+", conservo "+ending
 ]:[
  a+", "+b+", I follow "+ending,
  a+", looking for "+ending,
  "Past "+n+", I'm finding "+ending,
  a+", I remember "+ending,
  b+", I can hear "+ending,
  "Behind "+n+", I discover "+ending
 ];
 const picked=sample(r,formats);
 return picked[0].toUpperCase()+picked.slice(1)+".";
}
export function composeRapStanza(random,lang="it",stanzaIndex=0,concept="memory",used=new Set()){
 const language=lang==="it"?"it":"en",rhyme=rhymeStanza(random,language,stanzaIndex,concept);
 const pool=(WORDS[language][concept]||WORDS[language].memory).split("|");
 const target=[11,13,12,14][stanzaIndex%4];
 return rhyme.map((end,i)=>{
  let candidate=null;
  for(let j=0;j<64;j++){
   const line=phrase(random,language,pool,end.end);
   if(used.has(line))continue;
   const syllables=estimateSyllables(line,language);
   const targetSyllables=target+(i%2);
   const cost=Math.abs(targetSyllables-syllables)+Math.max(0,syllables-19)*2+random()*.12;
   if(!candidate||cost<candidate.cost)candidate={line,syllables,cost};
   if(cost<=1.11)break;
  }
  if(!candidate){const line=phrase(random,language,pool,end.end);candidate={line,syllables:estimateSyllables(line,language)};}
  used.add(candidate.line);
  return {...end,text:candidate.line,syllables:candidate.syllables,
   rhythmic:{meter:4,bar:i,syllableTarget:target+(i%2),rhymeBeat:4,accentBeats:[2,4]}};
 });
}
