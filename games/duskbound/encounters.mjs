// Signature behaviours follow the saved PoE sources; every numerical value is local Duskbound balance.
const TAU = Math.PI * 2;
const NORMAL_CAP = 180;
const HAZARD_CAP = 64;
const UNLOCKS={drowned:0,ancientArcher:20,rhoa:35,goatman:65,flameSentinel:100,evangelist:150,carrionQueen:190,tentacleMiscreation:220};
const specs = [
  ['drowned','Drowned',34,16,55,1,10,65,'meleeWindup'],
  ['rhoa','Rhoa Mare',42,20,80,2,14,530,'rhoaCharge'],
  ['goatman','Goatman',50,18,65,2,16,360,'leapSlam'],
  ['ancientArcher','Ancient Archer',30,14,58,2,10,430,'bowDraw'],
  ['flameSentinel','Flame Sentinel',48,19,52,3,13,450,'fireFan'],
  ['evangelist','Undying Evangelist',65,17,48,3,18,430,'physicalRune'],
  ['carrionQueen','Carrion Queen',100,29,32,4,14,450,'broodSpawn'],
  ['tentacleMiscreation','Tentacle Miscreation',65,24,45,3,12,480,'spineVolley'],
];
export const MONSTERS = Object.freeze(Object.fromEntries(specs.map(([id,name,hp,radius,speed,xp,damage,range,action])=>[id,Object.freeze({id,name,hp,radius,speed,xp,damage,range,action,artKey:id,unlockAt:UNLOCKS[id],balance:'Duskbound'})])));
const DAUGHTER = Object.freeze({id:'carrionMinion',name:'Carrion Minion',hp:18,radius:10,speed:105,xp:1,damage:6,range:42,action:'meleeWindup',artKey:'carrionMinion',balance:'Duskbound'});
export const BOSSES = Object.freeze(Object.fromEntries([
  ['brutus','Brutus, Lord Incarcerator',3400,43,45,28,'Lord Incarcerator'],
  ['merveil','Merveil, the Siren',4200,35,42,24,'The Siren'],
  ['dominus','Dominus, High Templar',5200,40,38,28,'High Templar'],
  ['kitava','Kitava, the Insatiable',7600,78,0,36,'The Insatiable'],
].map(([id,name,hp,radius,speed,damage,phaseLabel])=>[id,Object.freeze({id,name,hp,radius,speed,damage,phaseLabel,xp:80,artKey:id,balance:'Duskbound'})])));
export const BOSS_SCHEDULE = Object.freeze(['brutus','merveil','dominus','kitava'].map((id,i)=>Object.freeze({id,at:[120,240,360,450][i]})));
const distance = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const noReward = ()=>({boss:false,uniqueReward:false,final:false});
function rng(run,api){if(api?.random)return api.random();run._rng=(Math.imul(run._rng??1,1664525)+1013904223)>>>0;return run._rng/4294967296;}
function id(run){run._nextId ??= 1;return run._nextId++;}
function regularCount(run){return run.enemies.filter(e=>e.hp>0&&e.kind!=='boss'&&e.kind!=='heart').length;}
export function initEncounters(run){
  run.encounters={activeBossId:null,queue:[],scheduled:[],defeatedBosses:[],rewardedBosses:[],center:null,nextHazardId:1};
  run.hazards=[];run.bossDefeated=false;
  // Reset removes subsystem-owned entities/debuffs but preserves unrelated fixture entities.
  run.enemies=(run.enemies||[]).filter(e=>!e.poeKind);
  for(const target of targets(run,true))delete target.corruptedBlood;
  return run.encounters;
}
function initialized(run){if(!run.encounters)initEncounters(run);return run.encounters;}
export function spawnPoeEnemy(run,kind,position){
  initialized(run);const d=MONSTERS[kind]||(kind==='carrionMinion'?DAUGHTER:null);
  if(!d||regularCount(run)>=NORMAL_CAP)return null;
  const scale=1+(run.time||0)/180,hp=Math.round(d.hp*scale);
  const e={id:id(run),kind,poeKind:kind,artKey:d.artKey,name:d.name,x:position?.x??0,y:position?.y??0,hp,maxHp:hp,radius:d.radius,speed:d.speed,xp:d.xp,damage:d.damage+Math.floor((run.time||0)/90)*2,hit:0,shotTimer:.8,telegraph:0,accuracy:100,evasion:5,action:null,attackCycle:0};
  run.enemies.push(e);return e;
}
export function startBossEncounter(run,bossId,position){
  const s=initialized(run),d=BOSSES[bossId];
  if(!d||s.activeBossId||s.defeatedBosses.includes(bossId))return null;
  const center={x:position?.x??run.player.x+300,y:position?.y??run.player.y};
  const e={id:id(run),kind:'boss',poeKind:bossId,bossId,name:d.name,artKey:d.artKey,...center,hp:d.hp,maxHp:d.hp,radius:d.radius,speed:d.speed,xp:d.xp,damage:d.damage,hit:0,shotTimer:1,telegraph:1.5,accuracy:100,evasion:5,phase:1,phaseLabel:d.phaseLabel,action:null,attackCycle:0,encounterCenter:{...center},cannotBeSlowed:bossId==='kitava'};
  s.activeBossId=bossId;s.center={...center};if(!s.scheduled.includes(bossId))s.scheduled.push(bossId);s.queue=s.queue.filter(x=>x!==bossId);run.enemies.push(e);return e;
}
// Called after the hit pipeline, immediately before subtracting HP, for hits and DoT alike.
// Threshold clamping makes form/heart transitions survive a lethal hit; a later tick opens the next form.
export function prepareEncounterDamage(run,enemy,amount){
  if(!enemyTargetable(enemy)||!Number.isFinite(amount)||amount<=0)return 0;
  if(enemy.kind==='boss'&&['merveil','dominus','kitava'].includes(enemy.bossId)&&enemy.phase===1)
    return Math.min(amount,Math.max(0,enemy.hp-enemy.maxHp*.5));
  return amount;
}
export function enemyTargetable(enemy){return !!enemy&&enemy.hp>0&&(enemy.telegraph||0)<=0&&!enemy.invulnerable;}
// Live actor coordinates are our explicit local impact policy. An absent actor falls back to stored source coordinates.
export function proximityBlocks(run,enemy,origin,{isDot=false}={}){
  if(isDot||!enemy||!origin)return false;
  let actor=origin.actor;
  if(actor?.kind==='player')actor=run.player||actor;
  else if(actor?.id!=null){actor=[run.player,...(run.minions||[]),...(run.totems||[]),...(run.mercenaryMinions||[]),run.mercenary,run.sentinel].find(a=>a?.id===actor.id)||actor;}
  const source=Number.isFinite(actor?.x)?actor:origin;
  if(!Number.isFinite(source.x)||!Number.isFinite(source.y))return false;
  return run.enemies.some(e=>e.poeKind==='evangelist'&&e.hp>0&&e.shieldUntil>run.time&&distance(enemy,e)<=e.shieldRadius&&distance(source,e)>e.shieldRadius);
}
function removeOwnerHazards(run,enemy){run.hazards=run.hazards.filter(h=>h.ownerId!==enemy.id);enemy.action=null;enemy.shieldUntil=0;}
export function recordEncounterKill(run,enemy){
  const s=initialized(run);if(!enemy||enemy.hp>0||enemy.encounterKillRecorded)return noReward();enemy.encounterKillRecorded=true;removeOwnerHazards(run,enemy);
  if(enemy.kind==='heart'){
    const body=run.enemies.find(e=>e.id===enemy.bodyId&&e.hp>0);
    if(body){body.invulnerable=false;body.phase=2;body.phaseLabel='Unbound';body.heartCompleted=true;body.shotTimer=1;}
    return noReward();
  }
  if(enemy.kind!=='boss'||!BOSSES[enemy.bossId])return noReward();
  const bossId=enemy.bossId;
  if(s.defeatedBosses.includes(bossId))return noReward();
  s.defeatedBosses.push(bossId);const uniqueReward=!s.rewardedBosses.includes(bossId);if(uniqueReward)s.rewardedBosses.push(bossId);
  if(s.activeBossId===bossId)s.activeBossId=null;
  for(const e of run.enemies)if(e.bodyId===enemy.id){e.hp=0;e.encounterKillRecorded=true;removeOwnerHazards(run,e);}
  for(const target of targets(run))if(target.corruptedBlood?.sourceId===enemy.id)delete target.corruptedBlood;
  run.bossDefeated=BOSS_SCHEDULE.every(b=>s.defeatedBosses.includes(b.id));
  return {boss:true,uniqueReward,final:run.bossDefeated};
}
function targets(run,includeDead=false){return [run.player,...(run.minions||[]),...(run.totems||[]),...(run.mercenaryMinions||[]),run.mercenary,run.sentinel].filter((t,i,all)=>t&&(includeDead||t.hp>0)&&all.indexOf(t)===i);}
function attackTarget(run,e){return e.mercenaryTauntUntil>run.time&&run.mercenary?.hp>0?run.mercenary:run.player;}
function context(e,skill,type='physical',extra={}){return {enemyId:e.id,type,spell:false,isAttack:true,hit:true,area:false,melee:false,skill,...extra};}
function damage(run,api,target,amount,ctx){const enemy=run.enemies.find(e=>e.id===ctx.enemyId);const c={...ctx,enemy};if(target===run.player)api.damagePlayer?.(amount,c);else api.damageAlly?.(target,amount,c);}
function segmentDistance(p,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-x1)*dx+(p.y-y1)*dy)/l)):0;return Math.hypot(p.x-x1-dx*t,p.y-y1-dy*t);}
function geometryHit(h,t){
  const r=t.radius||12,d=distance(h,t);
  if(h.geometry==='line')return segmentDistance(t,h.x,h.y,h.x2,h.y2)<=h.width/2+r;
  if(h.geometry==='cone'){const delta=Math.atan2(Math.sin(Math.atan2(t.y-h.y,t.x-h.x)-h.angle),Math.cos(Math.atan2(t.y-h.y,t.x-h.x)-h.angle));return d<=h.radius+r&&(d<=r||Math.abs(delta)<=h.arc/2+Math.asin(Math.min(1,r/Math.max(r,d))));}
  if(h.geometry==='ring')return d<=h.radius+r&&d>=h.innerRadius-r;
  if(h.geometry==='safeZone')return d>h.safeRadius+r;
  return d<=h.radius+r;
}
function hazard(run,e,kind,geometry,delay,damageValue,ctx,extra={}){
  if(run.hazards.length>=HAZARD_CAP)return null;
  const h={id:run.encounters.nextHazardId++,ownerId:e.id,bossId:e.bossId||null,kind,geometry,x:e.x,y:e.y,radius:70,warningUntil:run.time+delay,expiresAt:run.time+delay+.16,nextHitAt:run.time+delay,damage:damageValue,context:ctx,hitIds:[],...extra};run.hazards.push(h);return h;
}
function cue(api,h){api.effect?.('nova',h.x,h.y,h.radius,h.context.type==='fire'?'#ff9863':h.context.type==='cold'?'#9ddfff':'#d69fa5',.3,{skill:h.kind,geometry:h.geometry,ownerId:h.ownerId});}
function updateHazards(run,api){
  const kept=[];
  for(const h of run.hazards){
    const owner=run.enemies.find(e=>e.id===h.ownerId);if(!owner||owner.hp<=0)continue;
    if(h.followOwner){h.x=owner.x;h.y=owner.y;}
    if(h.growSpeed&&run.time>=h.warningUntil){h.radius=Math.min(h.maxRadius,h.baseRadius+(run.time-h.warningUntil)*h.growSpeed);h.innerRadius=Math.max(0,h.radius-h.ringWidth);}
    if(run.time+1e-8>=h.nextHitAt&&h.nextHitAt<=h.expiresAt){
      if(!h.fired){cue(api,h);h.fired=true;}
      for(const t of targets(run)){
        if(!geometryHit(h,t))continue;
        if(h.kind==='bloodRain'){
          const options={count:1,stacks:1,duration:3,dps:4,sourceId:owner.id};
          // A supplied authority (classes for the player) owns immunity and ticking. Return false for ally fallback.
          if(api.applyCorruptedBlood&&api.applyCorruptedBlood(t,options)!==false)continue;
          const old=t.corruptedBlood;
          t.corruptedBlood={stacks:Math.min(10,(old?.until>run.time?old.stacks:0)+1),until:run.time+3,sourceId:owner.id,nextTickAt:old?.nextTickAt??run.time+.5};
        }else{
          const key=t===run.player?'player':t.id;
          if((!h.pulse||h.singleHit)&&h.hitIds.includes(key))continue;
          h.hitIds.push(key);damage(run,api,t,h.damage,h.context);
          if(h.pull){const d=distance(t,owner);if(d>0){t.x=owner.x+(t.x-owner.x)/d*55;t.y=owner.y+(t.y-owner.y)/d*55;}}
          if(h.chill)t.chillUntil=Math.max(t.chillUntil||0,run.time+1);
        }
      }
      h.nextHitAt=h.pulse?run.time+h.pulse:h.expiresAt+1;
    }
    if(run.time<h.expiresAt)kept.push(h);
  }
  run.hazards=kept;
}
function updateDebuffs(run,api){
  for(const t of targets(run)){
    const blood=t.corruptedBlood;
    if(blood){
      if(blood.until<=run.time)delete t.corruptedBlood;
      else if(run.time+1e-8>=blood.nextTickAt){damage(run,api,t,blood.stacks*2,{enemyId:blood.sourceId,type:'physical',hit:false,isDot:true,isAttack:false,spell:false,ailment:'corruptedBlood',skill:'corruptedBlood'});blood.nextTickAt=run.time+.5;}
    }
  }
}
function shoot(api,e,target,skill,type,count=1,spread=.2,extra={}){
  for(let i=0;i<count;i++)api.projectile?.(e,target,{hostile:true,damage:e.damage,speed:240,angle:(i-(count-1)/2)*spread,color:type==='cold'?'#a7dfff':type==='fire'?'#ff9563':type==='lightning'?'#cdb2ff':'#d9bdaa',context:context(e,skill,type,extra)});
}
function action(run,e,kind,duration,target,extra={}){
  e.action={kind,phase:'windup',startedAt:run.time,until:run.time+duration,targetX:target.x,targetY:target.y,targetId:target===run.player?null:target.id,angle:Math.atan2(target.y-e.y,target.x-e.x),...extra};return e.action;
}
function recover(run,e,seconds){e.action={...e.action,phase:'recover',startedAt:run.time,until:run.time+seconds};}
function ringPosition(run,api,min=650,max=850){const a=rng(run,api)*TAU,r=min+rng(run,api)*(max-min);return {x:run.player.x+Math.cos(a)*r,y:run.player.y+Math.sin(a)*r};}
function waves(run,dt,api){
  const s=run.encounters;
  for(const b of BOSS_SCHEDULE)if(run.time>=b.at&&!s.scheduled.includes(b.id)){s.scheduled.push(b.id);s.queue.push(b.id);}
  if(!s.activeBossId&&s.queue.length){const next=s.queue[0];startBossEncounter(run,next,ringPosition(run,api,270,350));}
  if(run.time>=480)return;
  if(run.time>=(run._nextElite??35)){
    run._nextElite=(run._nextElite??35)+60;
    const e=regularCount(run)<NORMAL_CAP?spawnPoeEnemy(run,'drowned',ringPosition(run,api)):run.enemies.find(e=>e.hp>0&&e.kind!=='boss'&&e.kind!=='heart'&&!e.elite);
    if(e){e.elite=true;e.hp*=4;e.maxHp=e.hp;e.radius*=1.3;e.xp*=4;e.damage*=1.3;api.assignRareModifiers?.(e,()=>rng(run,api));}
  }
  run._spawnTimer=(run._spawnTimer??.3)-dt;if(run._spawnTimer>0)return;
  run._spawnTimer+=Math.max(.18,1.1-run.time*.0019);
  const roster=Object.values(MONSTERS).filter(d=>run.time>=d.unlockAt).sort((a,b)=>a.unlockAt-b.unlockAt).map(d=>d.id),count=Math.min(4,1+Math.floor(run.time/80));
  for(let i=0;i<count&&regularCount(run)<NORMAL_CAP;i++)spawnPoeEnemy(run,roster[Math.floor(rng(run,api)*roster.length)%roster.length],ringPosition(run,api));
}
function moveToward(e,target,step){const d=distance(e,target);if(d>0&&step>0){e.x+=(target.x-e.x)/d*Math.min(d,step);e.y+=(target.y-e.y)/d*Math.min(d,step);e.moving=true;}}
function nearbyAdds(run,e,count,api,field='parentId',kind='carrionMinion',cap=4){
  const existing=run.enemies.filter(a=>a.hp>0&&a[field]===e.id).length;
  for(let i=0;i<Math.min(count,cap-existing);i++){const a=rng(run,api)*TAU,r=35+rng(run,api)*30,add=spawnPoeEnemy(run,kind,{x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r});if(add){add[field]=e.id;add.shotTimer=1;}}
}
function normalStart(run,e,d,api){
  const target=attackTarget(run,e),cool=Math.max(.2,api.enemyCooldown?.(e)??1);
  if(e.poeKind==='evangelist'&&!(e.shieldUntil>run.time)&&run.time>=(e.nextShieldAt||0)){e.shieldRadius=110;e.shieldUntil=run.time+4;e.nextShieldAt=run.time+9;}
  const durations={meleeWindup:.55,rhoaCharge:.75,leapSlam:.6,bowDraw:.65,fireFan:.8,physicalRune:.8,broodSpawn:.9,spineVolley:.8};
  let kind=d.action;if(kind==='broodSpawn'&&e.attackCycle%2)kind='carrionSpit';
  const a=action(run,e,kind,(durations[kind]||.8)*cool,target);
  a.geometry=['bowDraw','carrionSpit','rhoaCharge'].includes(kind)?'line':['fireFan','spineVolley'].includes(kind)?'cone':'circle';
  a.radius=kind==='meleeWindup'?e.radius+38:kind==='physicalRune'?72:kind==='leapSlam'?70:kind==='broodSpawn'?65:d.range;
  a.x=e.x;a.y=e.y;
  if(a.geometry==='line'){a.x2=target.x;a.y2=target.y;a.width=12;}
  if(a.geometry==='cone')a.arc=kind==='fireFan'?.7:.3;
  if(kind==='rhoaCharge'){a.originX=e.x;a.originY=e.y;a.distance=360;a.width=38;a.hitIds=[];a.x2=e.x+Math.cos(a.angle)*360;a.y2=e.y+Math.sin(a.angle)*360;}
  if(kind==='physicalRune'){a.x=a.targetX;a.y=a.targetY;}
  if(kind==='leapSlam'){const fraction=Math.min(1,320/(distance(e,target)||1));a.targetX=e.x+(target.x-e.x)*fraction;a.targetY=e.y+(target.y-e.y)*fraction;a.originX=e.x;a.originY=e.y;a.radius=70;a.x=a.targetX;a.y=a.targetY;}
  e.attackCycle++;
}
function updateNormalAction(run,e,dt,api,speed){
  const a=e.action,target={x:a.targetX,y:a.targetY,id:a.targetId};
  if(a.phase==='charge'){
    const x=e.x,y=e.y,left=Math.max(0,a.distance-(a.travel||0)),step=Math.min(left,720*dt*speed);e.x+=Math.cos(a.angle)*step;e.y+=Math.sin(a.angle)*step;a.travel=(a.travel||0)+step;
    for(const t of targets(run)){const key=t===run.player?'player':t.id;if(!a.hitIds.includes(key)&&segmentDistance(t,x,y,e.x,e.y)<=e.radius+(t.radius||12)){a.hitIds.push(key);damage(run,api,t,e.damage,context(e,'rhoaCharge','physical',{melee:true}));}}
    if(a.travel>=a.distance-1e-8)recover(run,e,1);return;
  }
  if(a.phase==='airborne'){
    const t=Math.min(1,(run.time-a.startedAt)/.65);e.x=a.originX+(a.targetX-a.originX)*t;e.y=a.originY+(a.targetY-a.originY)*t;e.jumpHeight=Math.sin(t*Math.PI)*65;
    if(t>=1){e.jumpHeight=0;hazard(run,e,'leapSlam','circle',0,e.damage,context(e,'leapSlam','physical',{area:true,melee:true}),{x:a.targetX,y:a.targetY,radius:70});recover(run,e,1.4);}return;
  }
  if(run.time+1e-8<a.until)return;
  if(a.phase==='recover'){e.action=null;e.shotTimer=1.3*(api.enemyCooldown?.(e)??1);return;}
  if(a.phase==='volley'){shoot(api,e,target,'spineVolley','physical',3,.1,{components:{physical:e.damage/2,fire:e.damage/2}});recover(run,e,1.7);return;}
  switch(a.kind){
    case 'meleeWindup':hazard(run,e,'meleeWindup','circle',0,e.damage,context(e,'meleeWindup','physical',{melee:true}),{radius:e.radius+38});recover(run,e,.7);break;
    case 'rhoaCharge':Object.assign(a,{phase:'charge',startedAt:run.time,until:run.time+.5,travel:0});break;
    case 'leapSlam':Object.assign(a,{phase:'airborne',startedAt:run.time,until:run.time+.65});break;
    case 'bowDraw':shoot(api,e,target,'ancientArrow','physical');recover(run,e,.65);break;
    case 'fireFan':shoot(api,e,target,'fireFan','fire',3,.25,{spell:true,isAttack:false});recover(run,e,1.1);break;
    case 'physicalRune':hazard(run,e,'evangelistBlast','circle',.7,e.damage,context(e,'evangelistBlast','physical',{spell:true,isAttack:false,area:true}),{x:a.targetX,y:a.targetY,radius:72});recover(run,e,.9);break;
    case 'broodSpawn':nearbyAdds(run,e,3,api);recover(run,e,.8);break;
    case 'carrionSpit':shoot(api,e,target,'carrionSpit','physical');recover(run,e,.8);break;
    case 'spineVolley':shoot(api,e,target,'spineVolley','physical',3,.1,{components:{physical:e.damage/2,fire:e.damage/2}});a.phase='volley';a.until=run.time+.25;break;
  }
}
function phaseTransition(run,e,api){
  if(e.hp>e.maxHp*.5||e.phase!==1)return;
  if(e.bossId==='merveil'){e.phase=2;e.name='Merveil, the Twisted';e.phaseLabel='The Twisted';e.artKey='merveilTwisted';e.action=null;e.attackCycle=0;e.shotTimer=0;removeOwnerHazards(run,e);}
  if(e.bossId==='dominus'){e.phase=2;e.name='Dominus, Ascendant';e.phaseLabel='Ascendant';e.artKey='dominusAscendant';e.action=null;e.attackCycle=0;e.shotTimer=0;removeOwnerHazards(run,e);}
  if(e.bossId==='kitava'&&!e.heartCompleted){
    e.phase='heart';e.phaseLabel='Heart exposed';e.invulnerable=true;e.action=null;removeOwnerHazards(run,e);
    const heart={id:id(run),kind:'heart',poeKind:'kitavaHeart',bossId:'kitava',bodyId:e.id,name:"Kitava's Heart",artKey:'kitavaHeart',x:e.x,y:e.y+105,hp:1500,maxHp:1500,radius:32,speed:0,xp:0,damage:0,hit:0,shotTimer:2,telegraph:0,phase:1,phaseLabel:'Exposed Heart',cannotBeSlowed:true,action:null};
    run.enemies.push(heart);nearbyAdds(run,e,4,api,'summonedBy','drowned',6);
  }
}
function bossStart(run,e,api){
  const target=attackTarget(run,e),cycle=e.attackCycle++,rawCooldown=api.enemyCooldown?.(e)??1;
  const cool=Number.isFinite(rawCooldown)?Math.max(.2,e.cannotBeSlowed?Math.min(1,rawCooldown):rawCooldown):1;
  let kind,duration;
  if(e.bossId==='brutus'){kind=cycle%2?'brutusSlams':'chainPull';duration=kind==='chainPull'?.85:.65;}
  if(e.bossId==='merveil'){kind=e.phase===1?(cycle%2?'iceStorm':'iceFan'):'coldGeysers';duration=.75;}
  if(e.bossId==='dominus'){kind=e.phase===1?(cycle%2?'touchOfGod':'lightningSouls'):'bloodRain';duration=kind==='touchOfGod'?1:.7;}
  if(e.bossId==='kitava'){kind=cycle%2?'fireBreath':'kitavaSwipe';duration=1;}
  const a=action(run,e,kind,duration*cool,target);a.x=e.x;a.y=e.y;
  if(kind==='chainPull'){a.geometry='line';a.x=e.x;a.y=e.y;a.x2=e.x+Math.cos(a.angle)*430;a.y2=e.y+Math.sin(a.angle)*430;a.width=32;}
  else if(kind==='iceFan'||kind==='lightningSouls'){a.geometry='cone';a.radius=600;a.arc=kind==='iceFan'?1:.45;}
  else if(kind==='kitavaSwipe'||kind==='fireBreath'){a.geometry='cone';a.radius=kind==='kitavaSwipe'?240:400;a.arc=kind==='kitavaSwipe'?2.4:1;}
  else {a.geometry='circle';a.radius=kind==='touchOfGod'?135:kind==='brutusSlams'?90:85;if(kind==='iceStorm'||kind==='coldGeysers'){a.x=a.targetX;a.y=a.targetY;}}
}
function bossAttack(run,e,api){
  const a=e.action;if(run.time+1e-8<a.until)return;
  if(a.phase==='recover'){e.action=null;e.shotTimer=.8;return;}
  const target={x:a.targetX,y:a.targetY,id:a.targetId};
  switch(a.kind){
    case 'chainPull':hazard(run,e,'chainPull','line',0,e.damage,context(e,'chainPull','physical',{melee:true}),{x:a.x,y:a.y,x2:a.x2,y2:a.y2,width:a.width,pull:true,radius:430});break;
    case 'brutusSlams':
      for(let i=0;i<3;i++)hazard(run,e,'brutusSlam','circle',i*.6,e.damage,context(e,'brutusSlam','physical',{area:true,melee:true}),{x:a.x,y:a.y,radius:90});
      hazard(run,e,'brutusWave','ring',2,e.damage*1.2,context(e,'brutusWave','physical',{area:true}),{x:e.x,y:e.y,radius:80,innerRadius:30,baseRadius:80,ringWidth:50,growSpeed:260,maxRadius:470,pulse:.1,singleHit:true,expiresAt:run.time+3.7});break;
    case 'iceFan':shoot(api,e,target,'iceFan','cold',5,.2,{spell:true,isAttack:false});break;
    case 'iceStorm':hazard(run,e,'iceStorm','circle',.65,e.damage*.6,context(e,'iceStorm','cold',{spell:true,isAttack:false,area:true}),{x:a.targetX,y:a.targetY,radius:105,pulse:.6,expiresAt:run.time+3.2,chill:true});break;
    case 'coldGeysers':
      for(let i=-1;i<=1;i++)hazard(run,e,'coldGeyser','circle',.4+Math.abs(i)*.2,e.damage,context(e,'coldGeyser','cold',{spell:true,isAttack:false,area:true}),{x:a.targetX+i*100,y:a.targetY,radius:48});
      nearbyAdds(run,e,3,api,'summonedBy','carrionMinion',6);break;
    case 'lightningSouls':shoot(api,e,target,'lightningSouls','lightning',5,.075,{spell:true,isAttack:false});break;
    case 'touchOfGod':hazard(run,e,'touchOfGod','circle',0,e.damage*2,context(e,'touchOfGod','physical',{area:true,melee:true,components:{physical:e.damage,lightning:e.damage}}),{x:a.x,y:a.y,radius:135});break;
    case 'bloodRain':
      if(!run.hazards.some(h=>h.ownerId===e.id&&h.kind==='bloodRain'))hazard(run,e,'bloodRain','safeZone',.6,0,context(e,'bloodRain','physical',{hit:false,isDot:true,isAttack:false,area:true}),{safeRadius:140,radius:140,pulse:.5,followOwner:true,expiresAt:run.time+7});break;
    case 'kitavaSwipe':hazard(run,e,'kitavaSwipe','cone',0,e.damage,context(e,'kitavaSwipe','physical',{area:true,melee:true}),{radius:a.radius,arc:a.arc,angle:a.angle});break;
    case 'fireBreath':hazard(run,e,'fireBreath','cone',.3,e.damage*.7,context(e,'fireBreath','fire',{spell:true,isAttack:false,area:true}),{radius:a.radius,arc:a.arc,angle:a.angle,pulse:.5,expiresAt:run.time+2.4});break;
  }
  recover(run,e,a.kind==='brutusSlams'?2.4:1.2);
}
export function tickEncounters(run,dt,api={}){
  if(run.phase&&run.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  initialized(run);waves(run,dt,api);
  for(const e of [...run.enemies]){
    if(!e.poeKind)continue;
    if(e.hp<=0){removeOwnerHazards(run,e);continue;}
    e.moving=false;e.hit=Math.max(0,(e.hit||0)-dt);e._orbitWait=Math.max(0,(e._orbitWait||0)-dt);e.chill=api.enemyChill?api.enemyChill(e,dt):Math.max(0,(e.chill||0)-dt);
    if(e.kind!=='boss'&&e.kind!=='heart'&&distance(e,run.player)>1800){
      removeOwnerHazards(run,e);Object.assign(e,ringPosition(run,api));e.jumpHeight=0;e.shotTimer=.8;
      // Preserve identity/parent links so recycled daughters still count against their mother's brood cap.
      continue;
    }
    if(e.telegraph>0){e.telegraph=Math.max(0,e.telegraph-dt);continue;}
    if(e.kind==='heart')continue;
    if(e.kind==='boss')phaseTransition(run,e,api);
    if(e.invulnerable)continue;
    const speedFactor=e.cannotBeSlowed?Math.max(1,api.enemySpeed?.(e)??1):(api.enemySpeed?.(e)??(e.chill>0?.75:1));
    if(!e.cannotBeSlowed&&(e.freezeUntil>run.time||speedFactor<=0)){
      if(e.action){e.action.until+=dt;e.action.startedAt+=dt;}continue;
    }
    if(e.action){if(e.kind==='boss')bossAttack(run,e,api);else updateNormalAction(run,e,dt,api,speedFactor);continue;}
    e.shotTimer=Math.max(0,(e.shotTimer||0)-dt);
    const d=MONSTERS[e.poeKind]||(e.poeKind==='carrionMinion'?DAUGHTER:null);
    const target=attackTarget(run,e);
    if(e.kind==='boss'){
      // Keep the encounter anchored: pursuit is limited to the arena near its stored centre.
      if(e.speed&&distance(e,target)>210&&distance(target,e.encounterCenter)<=380)moveToward(e,target,e.speed*speedFactor*dt);
      if(e.shotTimer<=0)bossStart(run,e,api);
    }else if(d){
      if(distance(e,target)>d.range)moveToward(e,target,e.speed*speedFactor*dt);
      else if(e.shotTimer<=0)normalStart(run,e,d,api);
    }
  }
  updateHazards(run,api);updateDebuffs(run,api);
}
