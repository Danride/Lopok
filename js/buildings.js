// Зелёный удел 3.1 — buildings.js
let wood=125,gold=0,tool='house',rotation=0,deliveries=0,workerId=0,buildingId=0;
const buildings=new Map(),byCell=new Map(),workers=[];
const sizes={house:[1,1],sawmill:[2,2],road:[1,1],tree:[1,1]};
const costs={house:25,sawmill:60,road:3,tree:6};
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
function cellsFor(type,i,j){const [w,h]=sizes[type];const a=[];for(let dz=0;dz<h;dz++)for(let dx=0;dx<w;dx++)a.push({i:i+dx,j:j+dz});return a;}
function allowed(type,i,j){return cellsFor(type,i,j).every(p=>within(p.i,p.j)&&!byCell.has(tileKey(p.i,p.j)));}
function getAt(i,j){const id=byCell.get(tileKey(i,j));return id===undefined?null:buildings.get(id)||null;}
function accessible(i,j){const b=getAt(i,j);return within(i,j)&&(!b||b.type==='road');}
function tileCenter(b){return {x:b.i+(b.w-1)/2-HALF+.5,z:b.j+(b.h-1)/2-HALF+.5};}
function adjacentTo(b){
  const a=[];for(let y=b.j-1;y<=b.j+b.h;y++)for(let x=b.i-1;x<=b.i+b.w;x++){
    const edge=(x===b.i-1||x===b.i+b.w)&&(y>=b.j&&y<b.j+b.h)||(y===b.j-1||y===b.j+b.h)&&(x>=b.i&&x<b.i+b.w);
    if(edge&&accessible(x,y))a.push({i:x,j:y});
  }return a;
}
function nearestEmpty(i,j){if(accessible(i,j))return {i,j};for(let r=1;r<N;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(Math.abs(dx)+Math.abs(dz)===r&&accessible(i+dx,j+dz))return {i:i+dx,j:j+dz};return {i:0,j:0};}
function cloneAndShade(m){m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return m;}
function newModel(b){
  let model;
  if(b.type==='house')model=(templates.house||houseFallback()).clone(true);
  else if(b.type==='sawmill')model=(templates.sawmill||sawmillFallback()).clone(true);
  else if(b.type==='tree')model=treeModel(b.logs===0);
  else model=roadModel();
  // Global 180-degree fix for all buildings; additional R rotations remain relative.
  if(b.type==='house'||b.type==='sawmill')model.rotation.y=Math.PI+(b.rot||0)*Math.PI/2;
  const p=tileCenter(b);model.position.set(p.x,0,p.z);
  cloneAndShade(model);scene.add(model);b.model=model;
  if(b.type==='sawmill'&&templates.sawmill&&sawClip){
    b.mixer=new THREE.AnimationMixer(model);
    b.mixer.clipAction(sawClip).play();
  }
}
function disposeBuildingModel(b){
  if(!b.model)return;
  scene.remove(b.model);
  // Procedural trees and roads get fresh geometries every time. Dispose them.
  // Imported GLTF geometry is shared between clones and must not be disposed here.
  if(b.type==='tree'||b.type==='road')b.model.traverse(o=>{
    if(!o.isMesh)return;
    o.geometry?.dispose();
    if(b.type==='road'){
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
      else o.material?.dispose();
    }
  });
  b.model=null;
}
function rebuildModel(b){disposeBuildingModel(b);if(b.mixer)b.mixer.stopAllAction();b.mixer=null;newModel(b);}
function addBuilding(type,i,j,rot=0,opts={}){
  if(!sizes[type]||!allowed(type,i,j))return null;
  const [w,h]=sizes[type];const b={id:++buildingId,type,i,j,w,h,rot,logs:type==='tree'?Math.max(0,Math.min(3,Number.isFinite(opts.logs)?opts.logs:3)):0,
    regrow:type==='tree'?Math.max(0,Number(opts.regrow)||0):0,reservedBy:null,model:null,mixer:null};
  buildings.set(b.id,b);
  for(const p of cellsFor(type,i,j))byCell.set(tileKey(p.i,p.j),b.id);
  newModel(b);
  if(type==='house')spawnResidents(b);
  return b;
}
function removeBuilding(b,{refund=true}={}){
  if(!b)return;
  if(b.type==='house')for(let i=workers.length-1;i>=0;i--)if(workers[i].homeId===b.id)removeWorker(workers[i]);
  if(b.type==='tree'&&b.reservedBy){const w=workers.find(w=>w.id===b.reservedBy);if(w){w.treeId=null;w.state='idle';w.path=[];w.wait=0;if(w.axe)w.axe.visible=false;}}
  disposeBuildingModel(b);if(b.mixer)b.mixer.stopAllAction();
  for(const p of cellsFor(b.type,b.i,b.j))byCell.delete(tileKey(p.i,p.j));
  buildings.delete(b.id);
  if(refund)wood+=Math.floor(costs[b.type]/2);
  // Reassign workers whose goal or carrying job was made invalid.
  for(const w of workers){
    if(w.treeId===b.id){w.treeId=null;w.state='idle';w.path=[];w.wait=0;if(w.axe)w.axe.visible=false;}
    if(w.millId===b.id){w.millId=null;w.state='idle';w.path=[];w.wait=0;}
  }
}
function allBuildings(type){return [...buildings.values()].filter(b=>b.type===type);}
