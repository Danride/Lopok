// Зелёный удел 3.1 — ui.js
function refresh(){
  const houses=allBuildings('house').length,mills=allBuildings('sawmill').length;
  $('wood').textContent=Math.floor(wood);
  $('gold').textContent=Math.floor(gold);
  $('houses').textContent=houses;
  $('population').textContent=workers.length;
  $('mills').textContent=mills;
  $('deliveries').textContent=deliveries;
  $('woodDetail').textContent=`Только доставка: +${WOOD_PER_LOG} за бревно`;
  const chopping=workers.filter(w=>w.state==='chopping').length;
  const carrying=workers.filter(w=>w.carrying).length;
  $('activity').textContent=mills===0?'Нужна лесопилка для доставки':`Работают: ${chopping} · несут брёвна: ${carrying}`;
}
let toastTimer;
function notify(t){const node=$('toast');node.textContent=t;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400);}
function floatingText(t,pos){
  const p=pos.clone().add(new THREE.Vector3(0,.46,0)).project(camera);
  const a=document.createElement('div');a.className='floating';a.textContent=t;
  a.style.left=((p.x+1)*.5*innerWidth)+'px';a.style.top=((-p.y+1)*.5*innerHeight)+'px';
  $('flyLayer').appendChild(a);setTimeout(()=>a.remove(),1300);
}
const previewGroup=new THREE.Group();scene.add(previewGroup);
const previewMeshes=[];
for(let n=0;n<4;n++){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.97,.97),new THREE.MeshBasicMaterial({color:'#d0f4a4',transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.077;previewGroup.add(mesh);previewMeshes.push(mesh);
}
previewGroup.visible=false;
function choose(t){
  tool=t;document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.tool===t));
  const hints={house:'Дом: 25 древесины · 1–2 жителя',sawmill:'Лесопилка: 2×2 клетки · 60 древесины · принимает брёвна',
    tree:'Дерево: 6 древесины · жители рубят его и несут бревно на лесопилку',road:'Дорожка: 3 древесины · по ней ходят быстрее',
    erase:'Снос: любое место лесопилки удаляет всё здание',view:'Камера: тащи мышью или одним пальцем. ПКМ — вращение.'};
  $('hint').textContent=hints[t];
  showPreview(lastMouse.x,lastMouse.y);
}
document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.tool)));
