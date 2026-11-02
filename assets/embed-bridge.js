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
  window.addEventListener('hashchange',sync);
  window.addEventListener('popstate',sync);
  sync();
})();
