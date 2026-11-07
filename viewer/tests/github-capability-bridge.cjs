'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const catalog=fs.readFileSync(path.join(root,'viewer/catalog.js'),'utf8');
const start=catalog.indexOf('function bridgeHtml('),end=catalog.indexOf('function showJS(',start);
assert(start>=0&&end>start,'Viewer bridge exists');
const channel='s-'+'a'.repeat(32);
const bridgeHtml=new Function('syncChannel',catalog.slice(start,end)+'\nreturn bridgeHtml')(channel);
const child='<!doctype html><html><head><meta charset="utf-8"></head><body><button id="scan">Scansiona</button><output id="decoded"></output><script>function jsQR(){return {data:"OT1|bridge-test"}} document.getElementById("scan").onclick=()=>SelloneHostBridge.scan(raw=>{document.getElementById("decoded").textContent=raw});</script></body></html>';
const guest=bridgeHtml(child,true);
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html><body><script src="/viewer/host-bridge.js"></script><iframe id="playframe" sandbox="allow-scripts allow-pointer-lock allow-forms allow-downloads"></iframe></body></html>');return}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  const context=await browser.newContext({permissions:['camera']});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(({html,channel})=>{const frame=document.getElementById('playframe');window.SelloneBridgeHost.enable(frame,channel);frame.srcdoc=html},{html:guest,channel});
  const guestFrame=page.frameLocator('#playframe');
  await guestFrame.locator('#scan').waitFor();
  const result=await guestFrame.locator('#scan').evaluate(async()=>window.SelloneHostBridge.digest(new TextEncoder().encode('abc').buffer));
  assert.equal(result,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await guestFrame.locator('#scan').click();
  await page.locator('#selloneQrScannerOverlay video').waitFor({timeout:15000});
  await guestFrame.locator('#decoded').getByText('OT1|bridge-test',{exact:true}).waitFor({timeout:15000});
  await page.locator('#selloneQrScannerOverlay button').click();
  assert.equal(await page.locator('#selloneQrScannerOverlay').count(),0);
  assert.equal(await guestFrame.locator('#scan').evaluate(()=>location.origin),'null','Guest stays opaque');
  assert.deepEqual(errors,[]);
  console.log('PASS GitHub-source opaque frame: camera relay, QR frames, SHA-256, cleanup');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
