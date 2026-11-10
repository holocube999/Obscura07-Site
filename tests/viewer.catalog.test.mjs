import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const require=createRequire(import.meta.url);
const C=require('../viewer/catalog-organizer.js');
const catalog=JSON.parse(read('catalog.json')).projects;
const NOW=Date.parse('2026-11-07T12:00:00Z');
const ago=h=>new Date(NOW-h*3600000).toISOString();
test('all catalog entries have an explicit, non-runtime macro category',()=>{
 const allowed=new Set(C.CATEGORIES.map(x=>x.id));
 assert.ok(catalog.length>=41);
 assert.ok(catalog.every(x=>allowed.has(x.category)));
 assert.ok(new Set(catalog.map(x=>x.category)).size>=7);
 assert.equal(catalog.find(x=>x.id==='RandomNullRadio').category,'audio');
 assert.equal(catalog.find(x=>x.id==='OBSCURA-EMU').category,'retro');
 assert.equal(catalog.find(x=>x.id==='OBSCURA-TUNNEL').category,'communication');
 assert.equal(catalog.find(x=>x.id==='NG-REForge').category,'tools');
 assert.equal(catalog.find(x=>x.id==='JSDoctor-MadDoctor').category,'games');
 for(const app of catalog.filter(x=>x.release_path))
  assert.ok(app.published);
});
test('freshness is exclusive to real ISO timestamps: 0-6h pulsing, 6-24h static, 24-48h dark, then gone',()=>{
 assert.equal(C.badgeState(ago(0),NOW),'blink');
 assert.equal(C.badgeState(ago(5.99),NOW),'blink');
 assert.equal(C.badgeState(ago(6),NOW),'fresh');
 assert.equal(C.badgeState(ago(23.99),NOW),'fresh');
 assert.equal(C.badgeState(ago(24),NOW),'dark');
 assert.equal(C.badgeState(ago(47.99),NOW),'dark');
 assert.equal(C.badgeState(ago(48),NOW),null);
 assert.equal(C.badgeState(ago(480),NOW),null);
 assert.equal(C.badgeState('yesterday',NOW),null);
 assert.equal(C.badgeState('2026-11-07T11:00:00',NOW),null);
 assert.equal(C.badgeState(new Date(NOW+6*60000).toISOString(),NOW),null);
 assert.equal(C.badgeState(new Date(NOW+2*60000).toISOString(),NOW),null);
});
test('recent sorting prioritizes verified timestamps, alphabetical is explicit and stable',()=>{
 const data=[
  {title:'Zoo',category:'audio',updated_at:ago(1)},
  {title:'Beta',category:'audio',updated_at:ago(12)},
  {title:'Alpha',category:'audio'},
  {title:'Gamma',category:'tools',updated_at:ago(3)}
 ];
 assert.deepEqual(C.groupedProjects(data,{sort:'recent',now:NOW})[0].items.map(x=>x.title),['Zoo','Beta','Alpha']);
 assert.deepEqual(C.groupedProjects(data,{sort:'az',now:NOW})[0].items.map(x=>x.title),['Alpha','Beta','Zoo']);
 assert.deepEqual(C.groupedProjects(data,{category:'tools',now:NOW}).map(x=>x.id),['tools']);
 assert.deepEqual(C.groupedProjects(data,{filter:'gAmMa',now:NOW}).map(x=>x.id),['tools']);
 assert.equal(C.groupedProjects(data,{filter:'nonexistent',now:NOW}).length,0);
 assert.equal(data[0].title,'Zoo','sorting must not mutate catalog');
});
test('dates are not fabricated for private projects and actual release timestamp wins',()=>{
 assert.equal(C.updatedAt({repo:'Private',category:'research'}),'');
 assert.equal(C.updatedAt({released_at:ago(12),updated_at:ago(1)}),ago(12));
 assert.ok(C.dateMillis(ago(1),NOW));
 assert.equal(C.dateMillis('not-a-date',NOW),0);
});
test('HTML and controller retain one Sellone viewer with compact category and sort controls',()=>{
 const html=read('viewer/index.html'),controller=read('viewer/catalog.js'),ui=read('viewer/catalog-ui.js');
 for(const id of ['search','grid','categoryFilter','sortOrder'])assert.ok(html.includes('id="'+id+'"'));
 const runtime=read('assets/obscura-webplayer-runtime.js');
 assert.match(html,/src="\.\.\/assets\/obscura-webplayer-runtime\.js\?v=/);
 const modules=['catalog-organizer.js','catalog-ui.js','catalog.js'];
 const offsets=modules.map(name=>runtime.indexOf('/* '+name+' */'));
 assert.ok(offsets.every(offset=>offset>=0),'All catalog modules must be bundled');
 assert.ok(offsets[0]<offsets[1]&&offsets[1]<offsets[2],'Bundled catalog modules must remain in dependency order');
 assert.match(ui,/is-blink/);assert.match(ui,/is-dark/);
 assert.match(ui,/prefers-reduced-motion|refreshBadges/);
 assert.match(controller,/SelloneCatalogUI\.init/);
 assert.match(controller,/SelloneCatalogUI\.list/);
 assert.match(ui,/credentials:"omit"/);
 assert.ok(!ui.includes('Authorization'));
});
class Node{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.textContent='';
  this.dataset={};this.className='';this.value='';this.dateTime='';this.title='';}
 append(...xs){for(const x of xs){x.parent=this;this.children.push(x)}}
 insertBefore(node,sibling){
  const i=this.children.indexOf(sibling);if(i<0)this.append(node);else{node.parent=this;this.children.splice(i,0,node);}
 }
 replaceChildren(...xs){this.children=[];this.append(...xs)}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 querySelector(selector){
  const name=selector.startsWith('.')?selector.slice(1):'';
  if(name){
   const visit=node=>{for(const ch of node.children){
    if(ch.className.split(' ').includes(name))return ch;
    const found=visit(ch);if(found)return found;
   }return null};
   return visit(this);
  }
  return null;
 }
 querySelectorAll(){return []}
}
test('browser catalog UI groups cards, preserves details, and switches category/sort with no server',()=>{
 const elems=Object.fromEntries(['grid','categoryFilter','sortOrder','stats','message'].map(id=>[id,new Node()]));
 const document={getElementById:id=>elems[id],createElement:tag=>new Node(tag)};
 const sandbox={document,Intl,Date,console,localStorage:{getItem:()=>null,setItem:()=>{}},
  SelloneCatalogSort:C,setInterval:()=>{}};
 vm.runInNewContext(read('viewer/catalog-ui.js'),sandbox,{timeout:2000});
 const api=sandbox.SelloneCatalogUI;
 const data=[
  {title:'Zeta',repo:'z',category:'games',published:false,updated_at:new Date(Date.now()-3600000).toISOString()},
  {title:'Alfa',repo:'a',category:'games',published:true,release_path:'viewer/vic20/',released_at:new Date(Date.now()-6*3600000).toISOString()},
  {title:'Echo',repo:'e',category:'audio',published:false}
 ];
 function makeCard(item){
  const card=new Node('article');card.className='project';
  const h=new Node('h3');h.textContent=item.title;
  const actions=new Node('div');actions.className='actions';
  card.append(h,actions);return card;
 }
 api.init(data,makeCard,{visible:false});
 api.list(data,'',makeCard);
 assert.equal(elems.grid.children.length,2);
 const games=elems.grid.children.find(x=>x.dataset.category==='games');
 assert.equal(games.children[1].children.length,2);
 assert.equal(games.children[1].children[0].children[0].textContent,'Zeta');
 const updated=games.children[1].children[0].querySelector('.project-release');
 assert.ok(updated);assert.ok(updated.querySelector('.new-badge'));
 const release=games.children[1].children[1].querySelector('.project-release');
 assert.ok(release);assert.equal(release.children[0].textContent,'Rilascio');
 assert.equal(elems.stats.textContent,'3 / 3 progetti · 1 anteprime pubbliche');
 elems.sortOrder.value='az';elems.sortOrder.onchange();
 assert.equal(elems.grid.children[0].children[1].children[0].children[0].textContent,'Alfa');
 elems.categoryFilter.value='audio';elems.categoryFilter.onchange();
 assert.equal(elems.grid.children.length,1);
 assert.equal(elems.grid.children[0].dataset.category,'audio');
});
