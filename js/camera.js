// Зелёный удел 3.1 — camera.js
// Orbit camera, orthographic perspective, correct screen-space panning.
const cam={target:new THREE.Vector3(0,0,0),yaw:.73,pitch:.86,zoom:1.06,distance:32};
function applyCamera(){
  const cp=Math.cos(cam.pitch);
  camera.position.set(cam.target.x+Math.sin(cam.yaw)*cp*cam.distance,
    cam.target.y+Math.sin(cam.pitch)*cam.distance,
    cam.target.z+Math.cos(cam.yaw)*cp*cam.distance);
  camera.lookAt(cam.target);camera.zoom=cam.zoom;camera.updateProjectionMatrix();
}
function clampCamera(){cam.pitch=THREE.MathUtils.clamp(cam.pitch,.41,1.34);cam.zoom=THREE.MathUtils.clamp(cam.zoom,.64,3.25);
  cam.target.x=THREE.MathUtils.clamp(cam.target.x,-HALF+2,HALF-2);
  cam.target.z=THREE.MathUtils.clamp(cam.target.z,-HALF+2,HALF-2);
}
function pan(dx,dy){
  const h=(camera.top-camera.bottom)/cam.zoom,w=(camera.right-camera.left)/cam.zoom;
  const sx=dx/renderer.domElement.clientWidth*w,sy=dy/renderer.domElement.clientHeight*h;
  cam.target.x-=Math.cos(cam.yaw)*sx+Math.sin(cam.y)*sy/Math.sin(cam.pitch);
  cam.target.z+=Math.sin(cam.yaw)*sx-Math.cos(cam.y)*sy/Math.sin(cam.pitch);
  clampCamera();applyCamera();
}
function orbit(dx,dy){cam.yaw+=dx*.008;cam.pitch+=dy*.006;clampCamera();applyCamera();}
function zoomBy(factor){cam.zoom*=factor;clampCamera();applyCamera();}
function homeCamera(){cam.target.set(0,0,0);cam.yaw=.73;cam.pitch=.86;cam.zoom=1.06;applyCamera();}
function fit(){const w=innerWidth,h=innerHeight,a=w/Math.max(h,1),v=12.0;
  camera.left=-v*a;camera.right=v*a;camera.top=v;camera.bottom=-v;
  renderer.setSize(w,h);applyCamera();}
window.addEventListener('resize',fit);fit();
$('camLeft').onclick=()=>orbit(-Math.PI/.008/4,0);
$('camRight').onclick=()=>orbit(Math.PI/.008/4,0);
$('camUp').onclick=()=>orbit(0,70);
$('camDown').onclick=()=>orbit(0,-70);
$('camPlus').onclick=()=>zoomBy(1.22);
$('camMinus').onclick=()=>zoomBy(1/1.22);
$('camReset').onclick=homeCamera;
