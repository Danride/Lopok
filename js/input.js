// Зелёный удел 3.1 — input.js
const ray=new THREE.Raycaster(),point=new THREE.Vector2();
function tileAt(x,y){const box=renderer.domElement.getBoundingClientRect();
  point.set((x-box.left)/box.width*2-1,-(y-box.top)/box.height*2+1);ray.setFromCamera(point,camera);
  const intersections=ray.intersectObject(ground,false);if(!intersections.length)return null;
  const t=indexAt(intersections[0].point.x,intersections[0].point.z);
  return within(t.i,t.j)?t:null;
}
const lastMouse={x:-900,y:-900};
function showPreview(x,y){
  lastMouse.x=x;lastMouse.y=y;
  const t=tileAt(x,y);
  previewGroup.visible=!!t&&tool!=='view';if(!t||tool==='view')return;
  const cells=tool==='erase'?(getAt(t.i,t.j)?cellsFor(getAt(t.i,t.j).type,getAt(t.i,t.j).i,getAt(t.i,t.j).j):[{i:t.i,j:t.j}]):cellsFor(tool,t.i,t.j);
  const okay=tool==='erase'?!!getAt(t.i,t.j):allowed(tool,t.i,t.j)&&!overlapsResident(tool,t.i,t.j)&&wood>=costs[tool];
  cells.forEach((p,n)=>{const mesh=previewMeshes[n];if(!mesh)return;mesh.visible=within(p.i,p.j);const pos=coords(p.i,p.j);mesh.position.set(pos.x,.078,pos.z);
    mesh.material.color.set(okay?(tool==='erase'?'#ffaaa2':'#d0f4a4'):'#f4897b');});
  for(let k=cells.length;k<previewMeshes.length;k++)previewMeshes[k].visible=false;
}
function actionAt(x,y){
  const t=tileAt(x,y);if(!t||tool==='view')return;
  if(tool==='erase'){
    const b=getAt(t.i,t.j);if(!b){notify('Здесь нет постройки');return;}
    removeBuilding(b);store();refresh();notify('Постройка снесена');showPreview(x,y);return;
  }
  if(!allowed(tool,t.i,t.j)){notify(tool==='sawmill'?'Лесопилке нужен свободный участок 2×2':'Место занято');return;}
  if(overlapsResident(tool,t.i,t.j)){notify('Нельзя строить на месте жителя');return;}
  if(wood<costs[tool]){notify('Не хватает древесины');return;}
  wood-=costs[tool];addBuilding(tool,t.i,t.j,rotation);store();refresh();
  notify({house:'Дом построен: появились жители',sawmill:'Лесопилка построена (2×2)',tree:'Дерево посажено',road:'Дорожка построена'}[tool]);showPreview(x,y);
}
const canvas=renderer.domElement;canvas.style.touchAction='none';
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const pointers=new Map();let gesture=null;
function getTouches(){return [...pointers.values()].filter(p=>p.pointerType==='touch');}
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,pointerType:e.pointerType,moved:false});
  const touches=getTouches();
  if(touches.length>=2){for(const t of touches)t.gestureUsed=true;const a=touches[0],b=touches[1];gesture={dist:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
});
canvas.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);
  if(!p){showPreview(e.clientX,e.clientY);return;}
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>5)p.moved=true;
  const touches=getTouches();
  if(touches.length>=2){
    const a=touches[0],b=touches[1],dist=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    if(gesture){zoomBy(dist/Math.max(gesture.dist,1));pan(mx-gesture.x,my-gesture.y);}
    gesture={dist,x:mx,y:my};for(const q of touches)q.moved=true;
  }else if(p.button===2||e.altKey){orbit(dx,dy);}
  else if(p.button===1||e.shiftKey||tool==='view'||p.pointerType==='touch'){pan(dx,dy);}
  showPreview(e.clientX,e.clientY);
});
function releasePointer(e){const p=pointers.get(e.pointerId);if(p&&!p.moved&&!p.gestureUsed&&p.button===0&&(p.pointerType!=='touch'||getTouches().length===1))actionAt(e.clientX,e.clientY);
  pointers.delete(e.pointerId);if(getTouches().length<2)gesture=null;}
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY>0?.90:1.10);showPreview(e.clientX,e.clientY);},{passive:false});
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='r'){rotation=(rotation+1)%4;notify('Поворот при строительстве: '+rotation*90+'°');}
  if(k==='q')orbit(-42,0);if(k==='e')orbit(42,0);
  if(k==='+'||k==='=')zoomBy(1.16);if(k==='-'||k==='_')zoomBy(1/1.16);
  if(k==='home')homeCamera();if(k==='escape')choose('view');
  if(k==='w'||k==='arrowup')pan(0,22);if(k==='s'||k==='arrowdown')pan(0,-22);
  if(k==='a'||k==='arrowleft')pan(22,0);if(k==='d'||k==='arrowright')pan(-22,0);
});
