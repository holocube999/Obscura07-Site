const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('viewer/app-access.js','utf8');
let listener,removed=0,forgot=0,url='',cleared=0;
const child={postMessage(){}},frame={contentWindow:child,removeAttribute(name){if(name==='srcdoc')cleared++},src:''};
const current='https://example.test/viewer/?repo=NULLGOD-MUSIC&app=1';
const storage=new Map([['obscura-nullgod-access-v1','test-token']]);
const node={hidden:false,innerHTML:'',querySelector(){return {addEventListener(){}}}};
vm.runInNewContext(code,{
 URL,URLSearchParams,Date,
 location:{search:'?repo=NULLGOD-MUSIC&app=1',href:current,replace(x){url=x}},
 localStorage:{getItem:k=>storage.get(k)||'',removeItem(k){removed++;storage.delete(k)}},
 window:{SelloneGitHub:{setToken:()=>Promise.resolve(),forget(){forgot++}},addEventListener(type,fn){if(type==='message')listener=fn}},
 document:{getElementById:()=>frame,createElement:()=>node,body:{append(){}}}
});
listener({source:{},data:{type:'NULLGOD_FORGET_ACCESS_V1'}});
assert.equal(removed,0,'Messages from unrelated windows must be ignored');
listener({source:child,data:{type:'NULLGOD_FORGET_ACCESS_V1'}});
assert.equal(storage.size,0);assert.equal(forgot,1);assert.equal(cleared,1);
assert.notEqual(url,current,'Logout must cause a document reload, not identical-URL navigation');
assert(new URL(url).searchParams.has('accessReset'));
console.log('PASS: authorized forget clears stored/in-memory access and navigates to a fresh login document');
