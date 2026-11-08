
const vm=require('node:vm'),assert=require('node:assert/strict');
const source=require('node:fs').readFileSync('viewer/app-access.js','utf8');
function setup(saved=''){
 const listeners={},els={},storage=new Map(saved?[['obscura-nullgod-access-v1',saved]]:[]);let set=0,forgot=0;
 const node=()=>({hidden:false,value:'',disabled:false,textContent:'',srcdoc:'',focus(){},addEventListener(t,f){this[t]=f},querySelector(s){return els[s]||(els[s]=node())}});
 const gate=node();const doc={createElement:()=>gate,body:{append(){}},getElementById:id=>els[id]||(els[id]=node())};
 const GH={setToken:async()=>{set++},discover:async()=>({}),forget:()=>forgot++};
 const ctx={URLSearchParams,location:{search:'?app=1&repo=NULLGOD-MUSIC',reload(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:doc,window:{SelloneGitHub:GH,addEventListener:(n,f)=>listeners[n]=f}};
 vm.runInNewContext(source,ctx);
 return {gate,storage,listeners,els,get set(){return set},get forgot(){return forgot}};
}
const first=setup();assert.equal(first.gate.hidden,false);
const known=setup('read-only-existing-token');assert.equal(known.gate.hidden,true);assert.equal(known.set,1);
known.listeners['sellone:access-error']({detail:{status:401}});assert.equal(known.gate.hidden,false);assert.equal(known.storage.size,0);
const limited=setup('read-only-existing-token');limited.listeners['sellone:access-error']({detail:{status:403}});assert.equal(limited.storage.size,1);
console.log('PASS: initial gate, remembered token, revoked token replacement, rate limit persistence');
