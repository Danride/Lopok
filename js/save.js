// Зелёный удел 3.1 — save.js
const SAVE_KEY='green_fief_v3',OLD_SAVE_KEY='green_fief_v1';
function store(){try{
  localStorage.setItem(SAVE_KEY,JSON.stringify({version:3,wood,gold,deliveries,
    buildings:[...buildings.values()].map(b=>({type:b.type,i:b.i,j:b.j,rot:b.rot,logs:b.logs,regrow:b.regrow}))}));
}catch(e){console.warn('Save not available',e);}}
function restore(){
  try{
    const str=localStorage.getItem(SAVE_KEY)||localStorage.getItem(OLD_SAVE_KEY);
    if(!str)return false;
    const save=JSON.parse(str);if(!save||!Array.isArray(save.buildings))return false;
    if(Number.isFinite(save.wood))wood=Math.max(0,save.wood);
    if(Number.isFinite(save.gold))gold=Math.max(0,save.gold);
    if(Number.isFinite(save.deliveries))deliveries=save.deliveries;
    let created=0,skipped=0;
    const sorted=save.buildings.slice().sort((a,b)=>Number(a.type!=='sawmill')-Number(b.type!=='sawmill'));
    for(const s of sorted){
      const i=Number.isInteger(s.i)?s.i:Number((s.id||'').split(',')[0]);
      const j=Number.isInteger(s.j)?s.j:Number((s.id||'').split(',')[1]);
      const opts={logs:Number.isFinite(s.logs)?s.logs:3,regrow:s.regrow};
      if(sizes[s.type]&&Number.isInteger(i)&&Number.isInteger(j)&&addBuilding(s.type,i,j,Number(s.rot)||0,opts))created++;else skipped++;
    }
    if(skipped)notify(`Перенесено ${created} построек; ${skipped} не поместились после расширения лесопилок`);
    store();refresh();return true;
  }catch(e){console.warn('Restore failed',e);return false;}
}
function clearWorld(){
  for(const w of [...workers])removeWorker(w);
  for(const b of [...buildings.values()])removeBuilding(b,{refund:false});
  buildings.clear();byCell.clear();deliveries=0;buildingId=0;workerId=0;
}
function startWorld(){
  clearWorld();wood=125;gold=0;
  addBuilding('house',9,11,0);
  addBuilding('house',11,13,0);
  addBuilding('sawmill',13,10,0);
  for(const [i,j] of [[5,8],[7,9],[7,12],[15,6],[17,8],[17,14],[10,7],[5,15],[19,10]])addBuilding('tree',i,j);
  for(const [i,j] of [[10,10],[11,10],[12,10],[12,11],[12,12],[12,13]])if(allowed('road',i,j))addBuilding('road',i,j);
  store();refresh();
}
