// A reproducible smoke policy, not a claim of optimal play or complete build balance.
import {equipmentProjection} from '../games/duskbound/item-ui.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const nearest=(origin,items)=>items.reduce((a,e)=>!a||distance(origin,e)<distance(origin,a)?e:a,null);
function warningEscape(p,h){
 const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy),margin=(p.radius||12)+12;
 if(h.geometry==='safeZone')return d>(h.safeRadius||140)-margin?{x:-dx,y:-dy}:null;
 if(h.geometry==='line'){
  const vx=h.x2-h.x,vy=h.y2-h.y,l=vx*vx+vy*vy,t=l?Math.max(0,Math.min(1,(dx*vx+dy*vy)/l)):0;
  const nx=dx-t*vx,ny=dy-t*vy;
  return Math.hypot(nx,ny)<(h.width||20)/2+margin?{x:nx||-vy,y:ny||vx}:null;
 }
 if(h.geometry==='cone'){
  const angle=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(angle-h.angle),Math.cos(angle-h.angle));
  if(d>=(h.radius||0)+margin||Math.abs(delta)>(h.arc||1)/2+.1)return null;
  const side=delta<0?-1:1;return {x:-Math.sin(h.angle)*side,y:Math.cos(h.angle)*side};
 }
 if(h.geometry==='ring'&&d<(h.innerRadius||0)-margin)return null;
 if(d>=(h.radius||0)+margin)return null;
 return {x:dx||1,y:dy};
}
export function smokeInput(run){
 const p=run.player;
 // Preserve the established pursuit/separation policy; speculative future collision
 // scoring stalled this bot even against the pre-expansion enemy model.
 const goal=nearest(p,run.gems)||nearest(p,run.enemies.filter(e=>e.hp>0&&!e.invulnerable));
 let x=goal?goal.x-p.x:Math.cos(run.time*.25),y=goal?goal.y-p.y:Math.sin(run.time*.25);
 const norm=Math.hypot(x,y);if(norm){x/=norm;y/=norm;}
 for(const e of run.enemies){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(e.hp>0&&d<60&&d>0){x+=dx/d*3;y+=dy/d*3;}}
 // React only to imminent visible attack geometry; never penalize future enemy
 // positions, which caused the rejected predictive policy to stop collecting XP.
 const warnings=(run.hazards||[]).filter(h=>h.expiresAt>run.time&&h.warningUntil-run.time<.8);
 for(const e of run.enemies){const a=e.action;if(e.hp<=0||a?.phase!=='windup'||a.until-run.time>.8||!a.geometry)continue;warnings.push({...a,x:a.x??e.x,y:a.y??e.y,width:a.kind==='rhoaCharge'?e.radius*2:a.width,geometry:a.kind==='bloodRain'?'safeZone':a.geometry,safeRadius:a.kind==='bloodRain'?140:a.safeRadius});}
 for(const h of warnings){const escape=warningEscape(p,h),length=escape&&Math.hypot(escape.x,escape.y);if(length){x+=escape.x/length*3;y+=escape.y/length*3;}}
 return {x,y};
}
export function takeSmokeLoot(run){
 if(run.pendingItem?.uniqueId==='eye-of-innocence')return false;
 const {before,after}=equipmentProjection(run,run.pendingItem);
 const value=s=>s.life*.4+s.energyShield*.4+s.armour*.025+s.evasion*.015+s.speed*.05+['fire','cold','lightning','chaos'].reduce((n,k)=>n+(s[k]||0)*150,0)+['bolt','orbit','nova','lightning','minion'].reduce((n,k)=>n+(run.upgrades[k]?s[k]||0:0),0);
 return value(after)>=value(before);
}
