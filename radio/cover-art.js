/* Seed-stable original Canvas album artwork. No network, borrowed photos or external models. */
import {rngFor} from "./radio.js";
export function coverRecipe(plan){
  const r=rngFor(plan.seed+"|sleeve-v2");
  const palettes=[
    ["#050c16","#1b3143","#84a3ad","#cfb4a6"],["#100b1e","#493459","#b287a5","#e7d4ae"],
    ["#081711","#1c4b44","#70a991","#c3d1b2"],["#0f0e14","#49313a","#b55d59","#edc8ac"],
    ["#101316","#3d4652","#9aabb7","#d8dbd0"],["#090d17","#28315b","#7b9ccb","#e7d0e8"],
    ["#150d11","#61443c","#bb9474","#e2d7b7"],["#080c14","#334a56","#94c0ce","#f5d9b1"]
  ];
  return {kind:Math.floor(r()*12),palette:palettes[Math.floor(r()*palettes.length)],
    horizon:.3+r()*.47,grain:Math.floor(r()*1e9),angle:r()*Math.PI*2,shape:3+Math.floor(r()*11),
    title:plan.title,artist:plan.artist,serial:Math.floor(r()*99999)};
}
const mix=(a,b,p)=>a+(b-a)*p;
export function drawCover(canvas,plan){
  if(!canvas?.getContext||!plan)return null;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  const w=canvas.width=320,h=canvas.height=320;
  const q=coverRecipe(plan),r=rngFor(plan.seed+"|sleeve-draw-v2"),p=q.palette;
  const bg=ctx.createLinearGradient(0,0,320,320);
  bg.addColorStop(0,p[0]);bg.addColorStop(.53,p[1]);bg.addColorStop(1,p[0]);
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.save();
  const sun=ctx.createRadialGradient(140+r()*60,80+r()*70,4,140,130,220);
  sun.addColorStop(0,p[3]);sun.addColorStop(.25,p[2]+"aa");sun.addColorStop(1,p[0]+"00");
  ctx.globalAlpha=.36+r()*.36;ctx.fillStyle=sun;ctx.fillRect(0,0,w,h);ctx.restore();
  if(q.kind%4===0){
    // Film-like coastal landscape with atmospheric depth and stratified silhouettes.
    for(let layer=0;layer<12;layer++){
      const y=320*q.horizon+layer*10;
      ctx.beginPath();ctx.moveTo(0,y);
      for(let x=0;x<=320;x+=8)ctx.lineTo(x,y+(r()-.5)*(layer+1)*4+18*Math.sin(x/90+layer*.55));
      ctx.lineTo(320,320);ctx.lineTo(0,320);ctx.closePath();
      ctx.globalAlpha=.07+layer*.037;ctx.fillStyle=layer%2?p[0]:p[2];ctx.fill();
    }
  }else if(q.kind%4===1){
    // Brutalist photographic-architecture-inspired perspective and hard light.
    for(let i=0;i<16;i++){
      const x=r()*360-40,y=r()*340-40;
      ctx.save();ctx.translate(x,y);ctx.rotate((r()-.5)*.42);
      ctx.fillStyle=i%3?p[1]:p[2];ctx.globalAlpha=.12+r()*.35;
      ctx.fillRect(0,0,12+r()*55,60+r()*220);
      ctx.fillStyle=p[3];ctx.globalAlpha=.06;ctx.fillRect(3,0,3,240);ctx.restore();
    }
  }else if(q.kind%4===2){
    // Long-exposure spectral-light topography.
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<35;i++){
      ctx.beginPath();const sy=r()*320;
      for(let x=0;x<=320;x+=4){
        const y=sy+24*Math.sin(x/30+i*.27)+24*Math.sin(x/77+i*.3);
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=i%2?p[2]:p[3];ctx.lineWidth=.5+r()*3.5;ctx.globalAlpha=.05+r()*.15;ctx.stroke();
    }ctx.globalCompositeOperation="source-over";
  }else{
    // Collaged microscope/film emulsions and elliptical forms.
    for(let i=0;i<70;i++){
      ctx.beginPath();const x=r()*320,y=r()*320,s=1+r()*85;
      ctx.ellipse(x,y,s,s*(.25+r()),r()*6.28,0,Math.PI*2);
      ctx.strokeStyle=i%3?p[3]:p[2];ctx.globalAlpha=.045+r()*.2;ctx.lineWidth=.4+r()*2;ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  const vignette=ctx.createRadialGradient(160,142,50,160,160,240);
  vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#000000bb");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,320,320);
  // Analog fine grain: deterministic, applied after shapes and before typography.
  const pixels=ctx.getImageData(0,0,320,320),d=pixels.data;
  for(let i=0;i<d.length;i+=4){
    const noise=(r()-.5)*35;
    d[i]=Math.max(0,Math.min(255,d[i]+noise));
    d[i+1]=Math.max(0,Math.min(255,d[i+1]+noise));
    d[i+2]=Math.max(0,Math.min(255,d[i+2]+noise));
  }ctx.putImageData(pixels,0,0);
  ctx.strokeStyle="#ffffff44";ctx.lineWidth=1;ctx.strokeRect(13.5,13.5,293,293);
  ctx.fillStyle="#f4efe9";ctx.font="700 10px ui-monospace,monospace";
  ctx.fillText("RΛNDØM / NULL",23,29);
  ctx.fillStyle="#ffffffaa";ctx.font="8px ui-monospace,monospace";
  ctx.fillText("XN - "+String(q.serial).padStart(5,"0"),235,29);
  ctx.fillStyle="#fff8";ctx.fillRect(22,246,276,1);
  ctx.fillStyle="#f5f1e8";ctx.font="700 17px ui-monospace,monospace";
  const title=String(q.title).slice(0,26);
  ctx.fillText(title,22,272,275);
  ctx.font="10px ui-monospace,monospace";ctx.fillStyle="#ebdbe4";
  ctx.fillText(String(q.artist).slice(0,36),23,290,275);
  return q;
}
