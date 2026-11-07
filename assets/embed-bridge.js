/* Sync relative page navigation with the minimal official-domain shell. */
(()=>{'use strict';
  if(window.parent===window)return;
  const BASE='/Obscura07-Site/';
  const ORIGIN='https://nullgod.tech';
  function sync(){
    if(!location.pathname.startsWith(BASE))return;
    const relative=location.pathname.slice(BASE.length)+location.search+location.hash;
    window.parent.postMessage({type:'obscura07:route',route:relative},ORIGIN);
  }
  // pushState/replaceState do not emit popstate; SPA navigation must be relayed too.
  for(const name of ['pushState','replaceState']){
    const original=history[name];
    if(typeof original!=='function')continue;
    history[name]=function(...args){
      const result=Reflect.apply(original,this,args);
      sync();
      return result;
    };
  }
  window.addEventListener('hashchange',sync);
  window.addEventListener('popstate',sync);
  sync();
})();
