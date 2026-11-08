const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('viewer/github-runtime.js','utf8');
const a=source.indexOf('async function api(url){'),b=source.indexOf('\nfunction safePath(',a);
assert(a>=0&&b>a);
async function error(status,message,headers={}){
 const fn=vm.runInNewContext('('+source.slice(a,b)+')',{
 token:'test-token',Date,
 fetch:async()=>({ok:false,status,json:async()=>({message}),headers:{get:k=>headers[k]??null}})
 });
 try{await fn('https://api.github.com/repos/owner/repo');assert.fail('must reject')}catch(e){return e}
}
(async()=>{
 assert.equal((await error(401,'Bad credentials')).reason,'invalid_token');
 assert.equal((await error(403,'Resource not accessible by personal access token')).reason,'permissions');
 const rate=await error(403,'API rate limit exceeded',{'x-ratelimit-remaining':'0','x-ratelimit-reset':'2000000000'});
 assert.equal(rate.reason,'rate_limit');assert(rate.retryAt>0);
 assert.equal((await error(429,'Rate limit')).reason,'rate_limit');
 assert.equal((await error(403,'SAML authorization needed')).reason,'organization');
 assert.equal((await error(404,'Not Found')).reason,'not_found');
 assert.equal((await error(403,'Forbidden')).reason,'forbidden');
 console.log('PASS GitHub auth: revoked token, permissions, SSO, primary/secondary limit and inaccessible repo');
})().catch(e=>{console.error(e);process.exitCode=1});
