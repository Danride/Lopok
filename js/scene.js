// Зелёный удел 3.1 — scene.js
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b6c6ad');
scene.fog=new THREE.Fog('#b6c6ad',38,76);
const camera=new THREE.OrthographicCamera(-12,12,12,-12,0.1,160);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
$('game').appendChild(renderer.domElement);
window.__gameReady=true;
scene.add(new THREE.HemisphereLight('#fff9df','#708e70',2.0));
const sunlight=new THREE.DirectionalLight('#fff1d6',2.55);
sunlight.position.set(-11,22,15);
sunlight.castShadow=true;
sunlight.shadow.mapSize.set(1024,1024);
Object.assign(sunlight.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:.5,far:80});
sunlight.shadow.bias=-0.00035;
scene.add(sunlight);

const N=22, HALF=N/2, FELL_SECONDS=3.1, WOOD_PER_LOG=8, TREE_REGEN_SECONDS=42;
const coords=(i,j)=>({x:i-HALF+.5,z:j-HALF+.5});
const indexAt=(x,z)=>({i:Math.floor(x+HALF),j:Math.floor(z+HALF)});
const tileKey=(i,j)=>`${i},${j}`;
const within=(i,j)=>i>=0&&j>=0&&i<N&&j<N;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(N,N),new THREE.MeshLambertMaterial({color:'#8db47b'}));
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true;scene.add(ground);
const base=new THREE.Mesh(new THREE.BoxGeometry(N+.5,.27,N+.5),new THREE.MeshLambertMaterial({color:'#678a58'}));
base.position.y=-.18;base.receiveShadow=true;scene.add(base);
const grid=new THREE.GridHelper(N,N,'#f6ffdf','#f6ffdf');grid.position.y=.018;
grid.material.transparent=true;grid.material.opacity=.12;grid.material.depthWrite=false;scene.add(grid);
const grassGeometry=new THREE.ConeGeometry(.085,.18,3);
const grass=new THREE.InstancedMesh(grassGeometry,new THREE.MeshLambertMaterial({color:'#567f50'}),320);
const inst=new THREE.Object3D();
for(let p=0;p<320;p++){
  const gx=(Math.random()-.5)*(N-.8),gz=(Math.random()-.5)*(N-.8);
  inst.position.set(gx,.08,gz);inst.rotation.y=Math.random()*6.28;inst.scale.setScalar(.45+Math.random()*.5);
  inst.updateMatrix();grass.setMatrixAt(p,inst.matrix);
}
scene.add(grass);
