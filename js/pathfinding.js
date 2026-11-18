// Зелёный удел 3.1 — pathfinding.js
function walkPath(start,goals){
  const begin=nearestEmpty(start.i,start.j);
  const open=[begin],parent=new Map(),seen=new Set([tileKey(begin.i,begin.j)]);
  const goalKeys=new Set(goals.map(g=>tileKey(g.i,g.j)));let found=null;
  for(let k=0;k<open.length;k++){
    const here=open[k],key=tileKey(here.i,here.j);
    if(goalKeys.has(key)){found=here;break;}
    for(const [dx,dz] of dirs){const x=here.i+dx,z=here.j+dz,kk=tileKey(x,z);
      if(accessible(x,z)&&!seen.has(kk)){seen.add(kk);parent.set(kk,key);open.push({i:x,j:z});}
    }
  }
  if(!found)return null;
  const out=[];let at=tileKey(found.i,found.j),startKey=tileKey(begin.i,begin.j);
  while(at!==startKey){let [i,j]=at.split(',').map(Number);out.push({i,j});at=parent.get(at);if(!at)return null;}
  out.reverse();return out;
}
