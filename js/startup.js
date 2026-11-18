// Зелёный удел 3.1 — startup.js
$('save').onclick=()=>{store();notify('Поселение сохранено');};
$('reset').onclick=()=>{if(confirm('Начать новое поселение? Сохранение будет перезаписано.')){startWorld();homeCamera();notify('Создано новое поселение');}};
$('helpBtn').onclick=()=>$('help').classList.add('visible');
$('closeHelp').onclick=()=>$('help').classList.remove('visible');
$('help').onclick=e=>{if(e.target===$('help'))$('help').classList.remove('visible');};

function loadModel(path,callback){
  new GLTFLoader().load(path,callback,undefined,error=>{
    console.warn('Unable to load model',path,error);
    notify('Не удалось загрузить модель: '+path);
  });
}
loadModel('./assets/models/house.gltf',gltf=>{
  templates.house=normalizedTemplate(gltf,.94);
  for(const b of buildings.values())if(b.type==='house')rebuildModel(b);
});
loadModel('./assets/models/sawmill.gltf',gltf=>{
  templates.sawmill=normalizedTemplate(gltf,1.77);
  sawClip=gltf.animations.find(a=>a.name==='Saw')||gltf.animations[0]||null;
  for(const b of buildings.values())if(b.type==='sawmill')rebuildModel(b);
  if(!sawClip)notify('У лесопилки нет анимации Saw; модель всё равно загружена');
});
loadModel('./assets/models/resident.gltf',gltf=>{
  templates.person=normalizedTemplate(gltf,.26,.34);
  personClip=gltf.animations[0]||null;
  replaceWorkerModels();
});
if(!restore())startWorld();
refresh();
let previous=performance.now(),uiTimer=0,saveTimer=0;
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(.08,Math.max(0,(t-previous)/1000));previous=t;
  updateWorkers(dt);updateTrees(dt);
  for(const b of buildings.values())if(b.mixer)b.mixer.update(dt);
  gold+=dt*allBuildings('house').length;
  uiTimer+=dt;saveTimer+=dt;
  if(uiTimer>.24){refresh();uiTimer=0;}
  if(saveTimer>10){store();saveTimer=0;}
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
