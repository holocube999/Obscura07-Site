'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
 let url;
 try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 let target=path.resolve(root,'.'+url);
 if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return}
 try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html')}catch{}
 try{res.setHeader('content-type',mime[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target))}
 catch{res.writeHead(404).end('Not found')}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  const context=await browser.newContext({permissions:['camera']});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/viewer/?repo=OBSCURA-TUNNEL');
  const frameLocator=page.frameLocator('#tunnelFrame');
  await frameLocator.locator('[data-mode=receive]').waitFor({state:'visible',timeout:30000});
  assert.equal(new URL(page.url()).pathname,'/viewer/','Viewer must stay in frame container');
  assert.equal(await page.locator('#playframe').getAttribute('sandbox'),'allow-scripts allow-pointer-lock allow-forms allow-downloads');
  assert.equal(await page.locator('#tunnelFrame').isVisible(),true);
  assert.equal(await page.locator('#playframe').isVisible(),false);
  const frame=page.frame({url:/\/transfer\/index\.html/});
  assert(frame,'Trusted transfer app frame missing');
  const capabilities=await frame.evaluate(()=>({secure:isSecureContext,crypto:!!crypto.subtle,camera:!!navigator.mediaDevices?.getUserMedia,origin:location.origin}));
  assert.equal(capabilities.secure,true);assert.equal(capabilities.crypto,true);assert.equal(capabilities.camera,true);
  assert.equal(capabilities.origin,base,'Trusted frame should have same origin as Viewer');
  const opened=await frame.evaluate(async()=>{
   const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
   const active=stream.getVideoTracks().some(track=>track.readyState==='live');
   stream.getTracks().forEach(track=>track.stop());
   return active;
  });
  assert.equal(opened,true,'camera stream should open inside embedded app');
  await frameLocator.locator('[data-mode=receive]').click();
  await frameLocator.locator('#scanStart').click();
  await frame.waitForFunction(()=>{const video=document.querySelector('#qrVideo');return video&&!video.hidden&&!!video.srcObject},{timeout:15000});
  await frameLocator.locator('#scanStart').click();
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Embedded Viewer camera, HTTPS-origin capabilities, scanner and sandbox regression: PASS');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
