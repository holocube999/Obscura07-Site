'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+pathname);
 if(!(file===root||file.startsWith(root+path.sep))){res.writeHead(403).end();return}
 let target=file;try{if(fs.statSync(file).isDirectory())target=path.join(file,'index.html')}catch{}
 try{res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target))}
 catch{res.writeHead(404).end('not found')}
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  const context=await browser.newContext({permissions:['camera']});
  const origin='http://127.0.0.1:'+server.address().port+'/';
  const a=await context.newPage(),b=await context.newPage(),errors=[];
  a.on('pageerror',e=>errors.push('A: '+e.message));b.on('pageerror',e=>errors.push('B: '+e.message));
  await Promise.all([a.goto(origin),b.goto(origin)]);
  for(const page of [a,b]){
    const secure=await page.evaluate(()=>({
      secure:window.isSecureContext,
      crypto:!!crypto.subtle,
      camera:!!navigator.mediaDevices?.getUserMedia
    }));
    assert.deepEqual(secure,{secure:true,crypto:true,camera:true},'First-party camera and WebCrypto must be enabled');
  }
  const stream=await b.evaluate(async()=>{
    const input=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
    const active=input.getVideoTracks().length>0;
    input.getTracks().forEach(t=>t.stop());
    return active;
  });
  assert.equal(stream,true,'Camera permission works without an iframe');

  await Promise.all([a.evaluate(()=>document.querySelector('#stun').checked=false),b.evaluate(()=>document.querySelector('#stun').checked=false)]);
  assert.equal(await a.locator('#identity').isVisible(),false);
  assert.equal(await a.locator('#transfer').isVisible(),false);
  await a.locator('[data-mode=send]').click();
  await a.locator('#next').click();
  await a.waitForFunction(()=>document.querySelector('#local').value.includes('"offer"'),{timeout:30000});
  await a.waitForFunction(()=>!document.querySelector('#qrDisplay').hidden&&document.querySelector('#qrImage canvas'),null,{timeout:15000});
  const decoded=await a.evaluate(()=>{
   const canvas=document.querySelector('#qrImage canvas');
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
   const item=jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
   return item?.data||'';
  });
  assert.match(decoded,/^OT[12]\\|/,'Rendered QR must be decoded optically by offline scanner');
  const offer=await a.locator('#local').inputValue();
  await b.locator('[data-mode=receive]').click();
  await b.locator('#signalReceive summary').click();
  await b.locator('#remote').fill(offer);
  await b.locator('#next').click();
  await b.waitForFunction(()=>document.querySelector('#local').value.includes('"answer"'),{timeout:30000});
  const answer=await b.locator('#local').inputValue();
  await a.locator('#next').click();
  await a.locator('#signalReceive summary').click();
  await a.locator('#remote').fill(answer);
  await a.locator('#next').click();
  await Promise.all([
   a.waitForFunction(()=>document.querySelector('#theirLed').classList.contains('online'),null,{timeout:30000}),
   b.waitForFunction(()=>document.querySelector('#theirLed').classList.contains('online'),null,{timeout:30000})
  ]);
  assert.equal(await a.locator('#connectedInfo').isVisible(),true);
  assert.equal(await a.locator('#transfer').isVisible(),true);
  assert.equal(await a.locator('#advanced').isVisible(),true);
  assert.equal(await b.locator('#connectedInfo').isVisible(),true);
  const bytes=Buffer.from('OBSCURA browser-to-browser transfer verified');
  await a.locator('#files').setInputFiles({name:'browser-test.txt',mimeType:'text/plain',buffer:bytes});
  await a.locator('#send').click();
  const link=b.locator('#downloads a');
  await link.waitFor({state:'visible',timeout:30000});
  assert.equal(await link.getAttribute('download'),'browser-test.txt');
  const received=await link.evaluate(async e=>await (await fetch(e.href)).text());
  assert.equal(received,bytes.toString());
  await a.waitForFunction(()=>document.querySelector('#state').textContent.includes('SHA-256 verificato'),null,{timeout:30000});
  await a.locator('#nick').fill('Mutant-Local');
  await b.waitForFunction(()=>document.querySelector('#theirLabel').textContent==='Mutant-Local',null,{timeout:10000});
  await a.locator('#share').click();
  await b.waitForFunction(()=>document.querySelector('#fileList').textContent.includes('browser-test.txt'),null,{timeout:10000});
  await b.locator('#search').fill('%.txt');
  assert.match(await b.locator('#fileList').textContent(),/browser-test\.txt/);
  await b.locator('#fileList button').first().click();
  await b.waitForFunction(()=>document.querySelectorAll('#downloads a').length===2,null,{timeout:30000});
  await a.locator('.pickFile').first().uncheck();
  await b.waitForFunction(()=>!document.querySelector('#fileList').textContent.includes('browser-test.txt'),null,{timeout:10000});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Browser E2E PASS: WebRTC, live identity, transfer, catalog, remote request, revocation');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
}
run().catch(err=>{console.error(err);process.exitCode=1});
