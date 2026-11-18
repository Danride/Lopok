// Зелёный удел 3.1 — residents.js
function workerCell(w){return indexAt(w.model.position.x,w.model.position.z);}
function overlapsResident(type,i,j){
  // Only block new solid objects. Roads can be built under a passing resident.
  if(type==='road')return false;
  const keys=new Set(cellsFor(type,i,j).map(p=>tileKey(p.i,p.j)));
  return workers.some(w=>{const p=workerCell(w);return keys.has(tileKey(p.i,p.j));});
}
function pathTo(w,b){return walkPath(workerCell(w),adjacentTo(b));}
function attachEquipment(w){
  const axe=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.18,5),mats.wood);
  handle.position.y=.075;axe.add(handle);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.083,.044,.028),mats.metal);
  blade.position.set(.033,.148,0);axe.add(blade);
  axe.position.set(.12,.13,-.10);axe.visible=false;w.model.add(axe);w.axe=axe;
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.24,7),mats.log);
  log.rotation.z=Math.PI/2;log.position.set(0,.19,-.13);log.visible=false;
  w.model.add(log);w.log=log;
}
function createWorker(home,slot){
  const spawn=adjacentTo(home)[slot%Math.max(1,adjacentTo(home).length)]||nearestEmpty(home.i+1,home.j);
  const p=coords(spawn.i,spawn.j),model=(templates.person||personFallback()).clone(true);
  model.position.set(p.x,0,p.z);model.rotation.y=Math.PI;
  cloneAndShade(model);scene.add(model);
  const w={id:++workerId,homeId:home.id,slot,model,state:'idle',path:[],treeId:null,millId:null,
    carrying:false,chop:0,wait:Math.random()*1.2,mixer:null,axe:null,log:null,phase:Math.random()*6.283};
  attachEquipment(w);
  if(templates.person&&personClip){w.mixer=new THREE.AnimationMixer(model);w.mixer.clipAction(personClip).play();}
  workers.push(w);return w;
}
function spawnResidents(home){const count=1+((home.i*13+home.j*7)%2);for(let n=0;n<count;n++)createWorker(home,n);}
function removeWorker(w){if(w.treeId){const b=buildings.get(w.treeId);if(b&&b.reservedBy===w.id)b.reservedBy=null;}
  if(w.mixer)w.mixer.stopAllAction();scene.remove(w.model);
  for(const accessory of [w.axe,w.log])accessory?.traverse(o=>{if(o.isMesh)o.geometry?.dispose();});
  const ix=workers.indexOf(w);if(ix!==-1)workers.splice(ix,1);
}
function replaceWorkerModels(){
  const states=workers.map(w=>({homeId:w.homeId,slot:w.slot,position:w.model.position.clone(),rotation:w.model.rotation.y,
    state:w.state,path:w.path.slice(),treeId:w.treeId,millId:w.millId,carrying:w.carrying,chop:w.chop,wait:w.wait}));
  for(const w of [...workers])removeWorker(w);
  // Retain jobs where possible, then ensure tree reservations still point to workers.
  for(const b of buildings.values())if(b.type==='tree')b.reservedBy=null;
  for(const old of states){
    const home=buildings.get(old.homeId);if(!home)continue;
    const w=createWorker(home,old.slot);w.model.position.copy(old.position);w.model.rotation.y=old.rotation;
    Object.assign(w,{state:old.state,path:old.path,treeId:old.treeId,millId:old.millId,carrying:old.carrying,chop:old.chop,wait:old.wait});
    w.log.visible=w.carrying;
    if(w.treeId){const tree=buildings.get(w.treeId);if(tree&&tree.logs>0)tree.reservedBy=w.id;else {w.treeId=null;w.state='idle';w.path=[];}}
  }
}
function lookToward(w,x,z,dt){
  const dx=x-w.model.position.x,dz=z-w.model.position.z;
  if(Math.abs(dx)+Math.abs(dz)<.0001)return;
  // UV analysis of user's Blockbench model: face with the eyes is local -Z.
  const desired=Math.atan2(-dx,-dz);
  const delta=Math.atan2(Math.sin(desired-w.model.rotation.y),Math.cos(desired-w.model.rotation.y));
  w.model.rotation.y+=delta*Math.min(1,dt*15);
}
function assignWork(w){
  const mills=allBuildings('sawmill');
  if(!mills.length)return false;
  if(w.carrying){
    let best=null;
    for(const mill of mills){const path=pathTo(w,mill);if(path&&(!best||path.length<best.path.length))best={mill,path};}
    if(!best)return false;
    w.millId=best.mill.id;w.path=best.path;w.state='toMill';return true;
  }
  let best=null;
  for(const tree of allBuildings('tree')){
    if(tree.logs<=0||tree.reservedBy!==null)continue;
    const path=pathTo(w,tree);if(!path)continue;
    // Do not pick an inaccessible tree that cannot be taken to any mill.
    const from=path.length?path[path.length-1]:workerCell(w);
    const hasDelivery=mills.some(m=>walkPath(from,adjacentTo(m))!==null);
    if(!hasDelivery)continue;
    if(!best||path.length<best.path.length)best={tree,path};
  }
  if(!best)return false;
  best.tree.reservedBy=w.id;w.treeId=best.tree.id;w.path=best.path;w.state='toTree';return true;
}
function wander(w){
  const home=buildings.get(w.homeId);if(!home)return;
  const p=workerCell(w),options=[];
  for(let q=0;q<12;q++){
    const i=home.i+Math.floor(Math.random()*9)-4,j=home.j+Math.floor(Math.random()*9)-4;
    if(!accessible(i,j))continue;
    const path=walkPath(p,[{i,j}]);if(path)options.push(path);
  }
  if(options.length){w.path=options[Math.floor(Math.random()*options.length)];w.state='wander';}
  else w.wait=1;
}
function finishChop(w){
  const b=buildings.get(w.treeId);
  if(!b||b.type!=='tree'||b.logs<1){w.treeId=null;w.state='idle';w.axe.visible=false;return;}
  b.logs--;
  b.reservedBy=null;
  if(b.logs===0){b.regrow=TREE_REGEN_SECONDS;rebuildModel(b);}
  w.treeId=null;w.carrying=true;w.log.visible=true;w.axe.visible=false;
  if(!assignWork(w)){w.state='idle';w.wait=1;}
}
function atDestination(w){
  if(w.state==='toTree'){
    const tree=buildings.get(w.treeId);
    if(!tree||!tree.logs){w.state='idle';w.treeId=null;return;}
    const p=tileCenter(tree);
    lookToward(w,p.x,p.z,1);
    w.state='chopping';w.chop=FELL_SECONDS;w.axe.visible=true;return;
  }
  if(w.state==='toMill'){
    const mill=buildings.get(w.millId);
    if(!mill||mill.type!=='sawmill'){w.state='idle';w.millId=null;return;}
    w.carrying=false;w.log.visible=false;w.state='idle';w.wait=.3;w.millId=null;
    wood+=WOOD_PER_LOG;deliveries++;floatingText(`+${WOOD_PER_LOG} 🪵`,w.model.position);
    refresh();return;
  }
  w.state='idle';w.wait=.5+Math.random()*.6;
}
function updateWorkers(dt){
  for(const w of workers){
    if(w.mixer)w.mixer.update(dt);
    if(w.state==='chopping'){
      const b=buildings.get(w.treeId);
      if(!b||!b.logs){w.axe.visible=false;w.state='idle';w.treeId=null;continue;}
      const p=tileCenter(b);lookToward(w,p.x,p.z,dt);
      w.axe.rotation.z=Math.sin((FELL_SECONDS-w.chop)*13)*.65;
      if(b.model)b.model.rotation.z=Math.sin((FELL_SECONDS-w.chop)*18)*.035;
      w.chop-=dt;if(w.chop<=0){if(b.model)b.model.rotation.z=0;finishChop(w);}
      continue;
    }
    if(w.path.length){
      // A new building may block a previously valid route. Never walk through it.
      const next=w.path[0];
      if(!accessible(next.i,next.j)){
        w.path=[];
        if(w.state==='toTree'){
          const tree=buildings.get(w.treeId),alternate=tree?pathTo(w,tree):null;
          if(alternate)w.path=alternate;
          else{if(tree&&tree.reservedBy===w.id)tree.reservedBy=null;w.treeId=null;w.state='idle';}
        }else if(w.state==='toMill'){
          if(!assignWork(w)){w.millId=null;w.state='idle';w.wait=1;}
        }else w.state='idle';
        continue;
      }
      const step=w.path[0],p=coords(step.i,step.j),pos=w.model.position;
      const dx=p.x-pos.x,dz=p.z-pos.z,d=Math.hypot(dx,dz);
      if(d<.055){pos.x=p.x;pos.z=p.z;w.path.shift();if(!w.path.length)atDestination(w);}
      else{
        lookToward(w,p.x,p.z,dt);
        const speed=(getAt(step.i,step.j)?.type==='road'?1.05:.78);
        const move=Math.min(d,speed*dt);pos.x+=dx/d*move;pos.z+=dz/d*move;
        if(!w.mixer)pos.y=Math.abs(Math.sin(performance.now()*.010+w.phase))*.018;
      }
      continue;
    }
    if(!w.mixer)w.model.position.y=0;
    if(w.wait>0){w.wait-=dt;continue;}
    if(w.state==='toTree'||w.state==='toMill'){atDestination(w);continue;}
    if(w.state==='idle'||w.state==='wander'){
      if(assignWork(w))continue;
      if(w.carrying){w.wait=1.4;continue;}
      wander(w);w.wait=1.8;
    }
  }
}
function updateTrees(dt){
  for(const b of buildings.values())if(b.type==='tree'&&b.logs===0){
    b.regrow-=dt;
    if(b.regrow<=0){b.logs=3;b.regrow=0;rebuildModel(b);}
  }
}
