// Зелёный удел 3.1 — models.js
function mat(color){return new THREE.MeshLambertMaterial({color});}
const mats={wood:mat('#99673e'),leaf:mat('#346f45'),lightLeaf:mat('#518758'),stump:mat('#7b5437'),log:mat('#a87944'),cut:mat('#dab38c'),metal:mat('#b9c5c1')};
function treeModel(stump=false){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.095,.15,.54,7),mats.wood);
  trunk.position.y=.27;g.add(trunk);
  if(stump){trunk.scale.y=.31;trunk.position.y=.084;
    const cut=new THREE.Mesh(new THREE.CylinderGeometry(.096,.096,.013,7),mats.cut);
    cut.position.y=.17;g.add(cut);
  }else{
    const lower=new THREE.Mesh(new THREE.ConeGeometry(.46,.72,7),mats.leaf);
    lower.position.y=.78;g.add(lower);
    const upper=new THREE.Mesh(new THREE.ConeGeometry(.35,.63,7),mats.lightLeaf);
    upper.position.y=1.08;g.add(upper);
  }
  return g;
}
function roadModel(){
  const g=new THREE.Group();const slab=new THREE.Mesh(new THREE.BoxGeometry(.96,.05,.96),mat('#aba088'));
  slab.position.y=.03;g.add(slab);
  for(let k=0;k<4;k++){
    const stone=new THREE.Mesh(new THREE.BoxGeometry(.20,.015,.13),mat(k%2?'#c7b9a0':'#94896e'));
    stone.position.set((k%2?1:-1)*.20,.063,(k<2?-.24:.24));g.add(stone);
  }return g;
}
function houseFallback(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.73,.58,.70),mat('#cfad83'));
  body.position.y=.29;g.add(body);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(.67,.48,4),mat('#a75543'));
  roof.position.y=.78;roof.rotation.y=Math.PI/4;g.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.18,.3,.04),mat('#5d4634'));
  door.position.set(0,.15,-.37);g.add(door);return g;
}
function sawmillFallback(){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.42,.67,1.35),mat('#b78c65'));
  body.position.y=.34;g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.53,.13,1.47),mat('#8a5344'));
  roof.position.y=.75;g.add(roof);
  const saw=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.075,12),mats.metal);
  saw.rotation.x=Math.PI/2;saw.position.set(.3,.4,-.65);g.add(saw);return g;
}
function personFallback(){
  const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.13,.2,.12),mat('#526970'));
  body.position.y=.12;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16),mat('#e5b28d'));
  head.position.y=.29;g.add(head);
  for(const x of [-.045,.045]){
    const eye=new THREE.Mesh(new THREE.BoxGeometry(.026,.028,.012),mat('#21241e'));
    eye.position.set(x,.30,-.087);g.add(eye);
  }return g;
}
function normalizedTemplate(gltf,scaleWidth,scaleHeight){
  const raw=gltf.scene;
  raw.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(raw),size=bb.getSize(new THREE.Vector3());
  const center=bb.getCenter(new THREE.Vector3());
  raw.position.sub(new THREE.Vector3(center.x,bb.min.y,center.z));
  const group=new THREE.Group();group.add(raw);
  const widthScale=scaleWidth/Math.max(size.x,size.z,.01);
  group.scale.setScalar(scaleHeight?Math.min(widthScale,scaleHeight/Math.max(size.y,.01)):widthScale);
  raw.traverse(o=>{if(o.isMesh){
    o.material=o.material.clone();o.material.side=THREE.DoubleSide;
    if(o.material.map){o.material.map.magFilter=THREE.NearestFilter;o.material.map.minFilter=THREE.NearestMipmapNearestFilter;o.material.map.colorSpace=THREE.SRGBColorSpace;}
    o.material.needsUpdate=true;
  }});
  return group;
}
let templates={house:null,sawmill:null,person:null}, sawClip=null, personClip=null;
