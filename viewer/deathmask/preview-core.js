/*
 * Sellone Playtest core, no external dependencies.
 * Separate browser-only diagnostic for the native Death Mask Amiga project.
 * It is NOT the Gloom/Dread/Grind renderer, an Amiga binary, or a faithful port.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DMPreviewCore=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const T={FLOOR:0,WALL:1,DOOR:2,EXIT:3,START:4,OBJECT:5,UNKNOWN:6};
  const DEMO_ROWS=[
    "############",
    "#1...#.....#",
    "#....#..+..#",
    "#..+....#..#",
    "#.......#..#",
    "#.#..#.....#",
    "#....+...2.#",
    "#..........#",
    "#......E...#",
    "############"
  ];
  function fail(msg){throw new Error(msg);}
  function worldFromRows(rows){
    if(!Array.isArray(rows)||!rows.length||rows.length>64)fail("righe non valide");
    const w=rows[0].length,h=rows.length,tiles=[],raw=[],starts=[];
    if(!w||w>64)fail("larghezza non valida");
    for(let y=0;y<h;y++){
      if(typeof rows[y]!=="string"||rows[y].length!==w)fail("larghezza incoerente");
      for(let x=0;x<w;x++){
        const c=rows[y][x];
        const kind=c==="#"?T.WALL:c==="+"?T.DOOR:c==="E"?T.EXIT:
                   c==="1"||c==="2"?T.START:c==="."?T.FLOOR:null;
        if(kind===null)fail("simbolo non supportato nel livello");
        tiles.push(kind);raw.push(0);
        if(c==="1"||c==="2")starts[Number(c)-1]={x:x+.5,y:y+.5,angle:-Math.PI/2};
      }
    }
    if(!starts[0])fail("manca player 1");
    return {name:"Fixture sintetica — NON Death Mask originale",w,h,tiles,raw,
      starts,provenance:"fixture",unknown:0,cellSizeGloom:1};
  }
  function worldFromForensic(data,mapName){
    if(!data||!Array.isArray(data.maps))fail("JSON forensic: maps mancante");
    const records=data.maps.filter(m=>m&&m.mapName===mapName);
    if(records.length!==1)fail("mappa originale non trovata o ambigua");
    const m=records[0],w=m.width,h=m.height;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>64||h>64)
      fail("dimensioni BOD non valide");
    if(!Array.isArray(m.originalGrid)||m.originalGrid.length!==h)
      fail("originalGrid assente o incompatibile: non uso remakeGrid");
    const kinds=new Map();
    if(Array.isArray(data.entities))for(const e of data.entities){
      if(!e||!Array.isArray(e.originalRuntimeIds))continue;
      const label=String(e.type||"").toLowerCase();
      for(const id of e.originalRuntimeIds)if(Number.isInteger(id)&&id>0)
        kinds.set(id,label);
    }
    const tiles=[],raw=[],starts=[],objects=[],counts={};
    for(let y=0;y<h;y++){
      const row=m.originalGrid[y];
      if(!Array.isArray(row)||row.length!==w)fail("riga originalGrid non valida");
      for(let x=0;x<w;x++){
        const id=row[x];
        if(!Number.isInteger(id)||id<0||id>65535)fail("ID BOD fuori range");
        const label=kinds.get(id)||"";
        let type=id===0?T.FLOOR:id>=1&&id<=24?T.WALL:
          label.includes("wall")?T.WALL:label.includes("door")?T.DOOR:
          label.includes("exit")?T.EXIT:label.includes("start")?T.START:
          label?T.OBJECT:T.UNKNOWN;
        tiles.push(type);raw.push(id);counts[id]=(counts[id]||0)+1;
        if(type===T.START)starts.push({x:x+.5,y:y+.5,angle:-Math.PI/2});
        if(type===T.OBJECT||type===T.UNKNOWN)
          objects.push({x:x+.5,y:y+.5,id,type,label});
      }
    }
    return {name:mapName+" · geometria BOD ricostruita",w,h,tiles,raw,
      starts:starts.slice(0,2),objects,
      provenance:"forensic-originalGrid",unknown:tiles.filter(t=>t===T.UNKNOWN).length,
      cellSizeGloom:.5,sourceCells:w*h};
  }
  function cell(world,x,y){
    const cx=Math.floor(x),cy=Math.floor(y);
    if(cx<0||cy<0||cx>=world.w||cy>=world.h)return -1;
    return cy*world.w+cx;
  }
  function isSolid(state,x,y){
    const n=cell(state.world,x,y);
    if(n<0)return true;
    const t=state.world.tiles[n];
    return t===T.WALL||(t===T.DOOR&&!state.doors.has(n));
  }
  function canStand(state,x,y){
    const r=.18;
    return !isSolid(state,x-r,y-r)&&!isSolid(state,x+r,y-r)&&
           !isSolid(state,x-r,y+r)&&!isSolid(state,x+r,y+r);
  }
  function start(world,choice){
    const spawn=choice||world.starts[0];
    if(!spawn||!Number.isFinite(spawn.x)||!Number.isFinite(spawn.y))
      fail("seleziona manualmente una posizione sulla minimappa");
    const state={world,doors:new Set(),player:{x:spawn.x,y:spawn.y,
      angle:spawn.angle===undefined?-Math.PI/2:spawn.angle},ticks:0,finished:false,
      interactions:0,travel:0};
    if(!canStand(state,state.player.x,state.player.y))
      fail("partenza dentro un ostacolo");
    return state;
  }
  function step(state,input,dt){
    if(state.finished)return state;
    const p=state.player;
    const elapsed=Math.max(0,Math.min(.05,Number(dt)||0));
    const turn=(Number(!!input.turnRight)-Number(!!input.turnLeft))*2.55*elapsed;
    p.angle+=turn;
    let forward=Number(!!input.forward)-Number(!!input.backward);
    let side=Number(!!input.strafeRight)-Number(!!input.strafeLeft);
    const scale=(forward&&side)?Math.SQRT1_2:1;
    const speed=2.7*elapsed*scale;
    const dx=(Math.cos(p.angle)*forward-Math.sin(p.angle)*side)*speed;
    const dy=(Math.sin(p.angle)*forward+Math.cos(p.angle)*side)*speed;
    const px=p.x,py=p.y;
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.12));
    for(let k=0;k<n;k++){
      if(canStand(state,p.x+dx/n,p.y))p.x+=dx/n;
      if(canStand(state,p.x,p.y+dy/n))p.y+=dy/n;
    }
    state.travel+=Math.hypot(p.x-px,p.y-py);
    if(input.use)interact(state);
    const idx=cell(state.world,p.x,p.y);
    if(idx>=0&&state.world.tiles[idx]===T.EXIT)state.finished=true;
    state.ticks++;
    return state;
  }
  function interact(state){
    const p=state.player,world=state.world;
    const dx=Math.cos(p.angle),dy=Math.sin(p.angle);
    for(let range=.2;range<=1.55;range+=.1){
      const n=cell(world,p.x+range*dx,p.y+range*dy);
      if(n<0)break;
      const t=world.tiles[n];
      if(t===T.DOOR){
        state.doors.add(n);
        state.interactions++;
        return true;
      }
      if(t===T.WALL)break;
    }
    return false;
  }
  function cast(state,angle,maxDistance){
    const w=state.world,p=state.player,dx=Math.cos(angle),dy=Math.sin(angle);
    let x=Math.floor(p.x),y=Math.floor(p.y);
    const deltaX=Math.abs(1/(Math.abs(dx)<1e-10?1e-10:dx));
    const deltaY=Math.abs(1/(Math.abs(dy)<1e-10?1e-10:dy));
    const sx=dx<0?-1:1,sy=dy<0?-1:1;
    let sideX=(dx<0?p.x-x:x+1-p.x)*deltaX;
    let sideY=(dy<0?p.y-y:y+1-p.y)*deltaY;
    const max=Math.min(128,Math.ceil((maxDistance||30)*2)+4);
    for(let i=0;i<max;i++){
      let face=0,dist=0;
      if(sideX<sideY){dist=sideX;sideX+=deltaX;x+=sx;face=0;}
      else{dist=sideY;sideY+=deltaY;y+=sy;face=1;}
      if(dist>(maxDistance||30))break;
      const n=cell(w,x+.5,y+.5);
      if(n<0)return {hit:true,distance:dist,side:face,kind:T.WALL,id:0,boundary:true};
      const t=w.tiles[n];
      if(t===T.WALL||(t===T.DOOR&&!state.doors.has(n))){
        const impact=face===0?p.y+dist*dy:p.x+dist*dx;
        return {hit:true,distance:dist,side:face,kind:t,id:w.raw[n],
                texture:impact-Math.floor(impact),boundary:false};
      }
    }
    return {hit:false,distance:maxDistance||30,side:0,kind:T.FLOOR,id:0};
  }
  return {T,DEMO_ROWS,worldFromRows,worldFromForensic,start,step,cast,
          interact,cell,isSolid,canStand};
});
