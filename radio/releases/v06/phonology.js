/* RNR/PHONO v1. Rules, not machine learning: Italian-first G2P with
 * cautious English/fallback heuristics, lexical stress and phoneme timing.
 * No external dictionary/model/data or services. */
const vowels=new Set(["a","e","i","o","u","y"]);
const accent=/[àáèéìíòóùú]/;
const digits=["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove"];
const translit={"α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"ks","ο":"o","π":"p","ρ":"r","σ":"s","ς":"s","τ":"t","υ":"i","φ":"f","χ":"h","ψ":"ps","ω":"o",
"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"};
const strip=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const syllabic=s=>vowels.has(s);
function baseWord(raw){
 const text=[...String(raw||"").toLowerCase()].map(c=>translit[c]??c).join("");
 return text.replace(/\d/g,d=>digits[Number(d)]).replace(/[^\p{L}'’\-]/gu,"").slice(0,60);
}
function glyphs(raw,language){
 const original=baseWord(raw),s=strip(original).replace(/[’'-]/g,"");
 const out=[],stressSource=[];
 const push=(sym,at,geminate=false)=>{out.push({sym,source:at,geminate});};
 for(let i=0;i<s.length;){
  const rest=s.slice(i),prev=s[i-1]||"",next=s[i+1]||"";
  if(language==="it"){
   if(rest.startsWith("gli")&&/[aeiou]/.test(s[i+3]||"")){push("ly",i);i+=3;continue;}
   if(rest.startsWith("gn")){push("ny",i);i+=2;continue;}
   if(rest.startsWith("sci")&&/[aou]/.test(s[i+3]||"")){push("sh",i);i+=3;continue;}
   if(rest.startsWith("sc")&&/[ei]/.test(s[i+2]||"")){push("sh",i);i+=2;continue;}
   if(rest.startsWith("sch")){push("s",i);push("k",i+1);i+=3;continue;}
   if(rest.startsWith("ch")){push("k",i);i+=2;continue;}
   if(rest.startsWith("gh")){push("g",i);i+=2;continue;}
   if(rest.startsWith("qu")){push("k",i);push("w",i+1);i+=2;continue;}
   if(rest.startsWith("ci")&&/[aou]/.test(s[i+2]||"")){push("ch",i);i+=2;continue;}
   if(rest.startsWith("gi")&&/[aou]/.test(s[i+2]||"")){push("j",i);i+=2;continue;}
   if(s[i]==="c"){push(/[ei]/.test(next)?"ch":"k",i);i++;continue;}
   if(s[i]==="g"){push(/[ei]/.test(next)?"j":"g",i);i++;continue;}
   if(s[i]==="z"){push("ts",i);i++;continue;}
   if(s[i]==="h"){i++;continue;}
  }else{
   const rules=[["tion",["sh","o","n"]],["sion",["zh","o","n"]],["tch",["ch"]],["igh",["a","i"]],["ough",["o"]],["ph",["f"]],["th",["th"]],["sh",["sh"]],["ch",["ch"]],["ck",["k"]],["ng",["ng"]],["ee",["i"]],["oo",["u"]],["qu",["k","w"]],["wh",["w"]],["ou",["a","u"]]];
   const rule=rules.find(([key])=>rest.startsWith(key));
   if(rule){for(const sym of rule[1])push(sym,i);i+=rule[0].length;continue;}
   if(s[i]==="c"&&/[eiy]/.test(next)){push("s",i);i++;continue;}
  }
  const c=s[i],sym=c==="q"?"k":c==="x"?"ks":c;
  if(vowels.has(sym)||/^(?:b|d|f|g|h|j|k|l|m|n|p|r|s|t|v|w|z)$/.test(sym))push(sym,i);
  i++;
 }
 // Normalize multi-character fallback phones into supported acoustic segments.
 const cleaned=[];
 for(const p of out){
  if(p.sym==="ks"){cleaned.push({...p,sym:"k"},{...p,sym:"s"});continue;}
  cleaned.push(p);
 }
 const accents=[...original].map((c,i)=>accent.test(c)?i:-1).filter(i=>i>=0);
 const vocalIndices=cleaned.map((p,i)=>syllabic(p.sym)?i:-1).filter(i=>i>=0);
 // Latin accent position is normally stable after diacritic removal; foreign
 // fallback lacks reliable stress, so use a predictable penultimate heuristic.
 let stressed=vocalIndices.length?Math.max(0,vocalIndices.length-2):-1;
 if(accents.length&&vocalIndices.length){
  const explicit=cleaned.findIndex(p=>p.source===accents[accents.length-1]&&syllabic(p.sym));
  if(explicit>=0)stressed=vocalIndices.indexOf(explicit);
 }
 if(vocalIndices.length===1)stressed=0;
 if(stressed<0&&vocalIndices.length)stressed=vocalIndices.length-1;
 const stressedIndex=vocalIndices[stressed]??-1;
 for(let i=0;i<cleaned.length;i++){
  const p=cleaned[i],isVowel=syllabic(p.sym),previous=cleaned[i-1];
  const nextVowel=vocalIndices.findIndex(n=>n>=i);
  p.syllable=Math.max(0,nextVowel<0?vocalIndices.length-1:nextVowel);
  const geminate=Boolean(previous?.sym===p.sym&&!isVowel);
  p.geminate=geminate;
  p.stressed=i===stressedIndex;
  p.kind=isVowel?"vowel":/^(s|sh|f|th|h|z|zh)$/.test(p.sym)?"fricative":
    /^(p|b|t|d|k|g|ch|j|ts)$/.test(p.sym)?"stop":/^(m|n|ny|ng)$/.test(p.sym)?"nasal":"liquid";
  p.weight=isVowel?(p.stressed?2.05:1.55):
    p.kind==="stop"?.68:p.kind==="fricative"?1.04:p.kind==="nasal"?.92:.77;
  if(geminate)p.weight*=1.45;
 }
 return {phones:cleaned,syllables:Math.max(1,vocalIndices.length),stressedIndex,normalized:s};
}
export function analyzeWord(text,language="it"){
 return glyphs(text,language);
}
export function estimateSyllables(text,language="it"){
 return String(text||"").split(/\s+/).filter(Boolean)
  .reduce((sum,word)=>sum+analyzeWord(word,language).syllables,0);
}
export function phonemesFromText(text,language="it"){
 const tokens=String(text||"").slice(0,240).match(/[\p{L}\p{N}'’]+|[.,!?;:]|\s+/gu)||[];
 const output=[];
 for(const token of tokens){
  if(/^\s+$/u.test(token))output.push(" ");
  else if(/^[.,!?;:]$/u.test(token))output.push(".");
  else output.push(...analyzeWord(token,language).phones.map(x=>x.sym));
 }
 return output.slice(0,180);
}
