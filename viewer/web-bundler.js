/* Sellone isolated module packager.
 * Fetches same-commit, SHA-checked CSS/ES modules via the parent GitHub loader.
 * No credentials are inserted in HTML, iframe URLs, or module contents.
 */
(()=>{'use strict';
const MAX_MODULES=96,MAX_BYTES=10*1024*1024;
const moduleExt=/\.(?:js|mjs)$/i,cssExt=/\.css$/i;
const textEncoder=new TextEncoder();
const importStatic=/(^\s*(?:import|export)\s+(?:[^\n;'"]*\bfrom\s*)?)(['"])(\.\.?\/[^'"]+)\2/gm;
const importDynamic=/(\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2(\s*\))/g;
function encode(bytes){
 let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(result);
}
function normalize(reference,base,ext){
 if(!/^\.\.?\//.test(reference)||/[?#\\]/.test(reference))throw Error('Risorsa non locale: '+reference);
 const segments=base.split('/');segments.pop();
 for(const part of reference.split('/')){
  if(part==='.'||part==='')continue;
  if(part==='..'){if(!segments.length)throw Error('Import fuori repository: '+reference);segments.pop()}
  else if(!/^[A-Za-z0-9_.-]+$/.test(part))throw Error('Percorso risorsa non valido: '+reference);
  else segments.push(part);
 }
 const path=segments.join('/');
 if(!path||path.length>250||!ext.test(path))throw Error('Estensione risorsa non supportata: '+reference);
 return path;
}
function attribute(raw,key){
 const re=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i');
 const m=re.exec(raw);return m?m[1]??m[2]:null;
}
function extractScriptUrls(html){
 const result=[];
 const pattern=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
 for(const match of html.matchAll(pattern)){
  const type=attribute(match[1],'type');
  const src=attribute(match[1],'src');
  if(src&&type?.toLowerCase()==='module')result.push(src);
 }
 return result;
}
function dependencies(source,origin){
 const targets=new Set();
 for(const re of [importStatic,importDynamic]){
  re.lastIndex=0;
  for(const match of source.matchAll(re)){
   targets.add(normalize(match[3],origin,moduleExt));
  }
 }
 return [...targets];
}
function transform(source,path){
 const replace=(match,pre,quote,spec,post='')=>{
  const target=normalize(spec,path,moduleExt);
  return pre+quote+'@sellone/'+target+quote+post;
 };
 return source.replace(importStatic,replace).replace(importDynamic,replace);
}
function looseCSP(html){
 // An opaque-origin sandbox is mandatory; parent-origin credentials cannot
 // be reached by guest scripts. Site-owned scripts receive no GitHub token.
 const safePolicy=[
  "default-src 'none'","base-uri 'none'","connect-src 'none'",
  "form-action 'none'","object-src 'none'","frame-src 'none'",
  "style-src 'unsafe-inline' data:","img-src data: blob:",
  "font-src data:","media-src data: blob:",
  "script-src 'unsafe-inline' data: blob:"
 ].join('; ');
 const existing=/<meta\b(?=[^>]*\bhttp-equiv\s*=\s*["']content-security-policy["'])[^>]*>/gi;
 html=html.replace(existing,'');
 // Run source code only in the existing sandbox (allow-scripts, no allow-same-origin).
 const tag='<meta http-equiv="Content-Security-Policy" content="'+safePolicy+'">';
 if(/<head\b[^>]*>/i.test(html))return html.replace(/<head\b[^>]*>/i,m=>m+tag);
 return '<head>'+tag+'</head>'+html;
}
async function prepare(result,loader=window.SelloneGitHub){
 if(!result||typeof result.html!=='string'||!result.repo||!result.ref||!result.path)throw Error('Build GitHub non verificata');
 const html=result.html;
 const links=[];
 const styles=/<link\b[^>]*>/gi;
 for(const m of html.matchAll(styles)){
  const rel=attribute(m[0],'rel'),href=attribute(m[0],'href');
  if(rel&&rel.toLowerCase().split(/\s+/).includes('stylesheet')&&href){
   links.push({markup:m[0],url:href});
  }
 }
 const scripts=extractScriptUrls(html);
 const hasLocal=links.some(x=>/^\.\.?\//.test(x.url))||scripts.some(x=>/^\.\.?\//.test(x));
 if(!hasLocal)return {...result,assetCount:0,moduleCount:0,packaged:false};
 const fetched=new Map();
 let total=0;
 async function get(path){
  if(fetched.has(path))return fetched.get(path);
  if(fetched.size>=MAX_MODULES)throw Error('Troppe dipendenze JS: massimo '+MAX_MODULES);
  const promise=loader.loadText({repo:result.repo,ref:result.ref,path}).then(item=>{
   if(item.path!==path||item.ref!==result.ref||typeof item.content!=='string')throw Error('Dipendenza GitHub non verificabile: '+path);
   total+=item.bytes;
   if(total>MAX_BYTES)throw Error('Dipendenze troppo grandi');
   return item.content;
  });
  fetched.set(path,promise);
  return promise;
 }
 const modules=new Map();
 async function visit(path){
  if(modules.has(path))return;
  modules.set(path,null);
  const source=await get(path);
  const deps=dependencies(source,path);
  await Promise.all(deps.map(visit));
  modules.set(path,transform(source,path));
 }
 const roots=[];
 for(const src of scripts){
  if(!/^\.\.?\//.test(src))throw Error('Script remoto non incorporabile: '+src);
  roots.push(normalize(src,result.path,moduleExt));
 }
 await Promise.all(roots.map(visit));
 let output=html;
 for(const link of links){
  if(!/^\.\.?\//.test(link.url))throw Error('CSS remoto non incorporabile: '+link.url);
  const path=normalize(link.url,result.path,cssExt);
  const css=await get(path);
  if(/url\s*\(\s*(?!['"]?(?:data:|#))\S/i.test(css))
   throw Error('CSS con file esterni non supportati: '+path);
  output=output.replace(link.markup,'<style data-sellone-asset="'+path+'">'+css.replace(/<\/style/gi,'<\\/style')+'</style>');
 }
 const imports={};
 for(const [path,source] of modules){
  imports['@sellone/'+path]='data:text/javascript;base64,'+encode(textEncoder.encode(source));
 }
 const map='<script type="importmap">'+JSON.stringify({imports}).replace(/</g,'\\u003c')+'</script>';
 // Preserve original execution order of the root entrypoints.
 output=output.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,(full,attrs,body)=>{
  const src=attribute(attrs,'src'),type=attribute(attrs,'type');
  if(!src||type?.toLowerCase()!=='module')return full;
  const path=normalize(src,result.path,moduleExt);
  return '<script type="module" data-sellone-entry="'+path+'">import "@sellone/'+path+'";</script>';
 });
 output=looseCSP(output);
 const i=output.search(/<script\b/i);
 // An import map must precede the first module script and its imports.
 if(i>=0)output=output.slice(0,i)+map+output.slice(i);
 else output+=map;
 return {...result,html:output,assetCount:fetched.size,moduleCount:modules.size,packaged:true};
}
window.SelloneBundle=Object.freeze({prepare});
})();
