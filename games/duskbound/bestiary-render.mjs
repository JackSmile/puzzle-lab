const TAU=Math.PI*2;
const frames={drowned:0,rhoa:1,goatman:2,ancientArcher:3,flameSentinel:4,evangelist:5,carrionQueen:6,tentacleMiscreation:7,brutus:8,merveil:9,merveilTwisted:10,dominus:11,dominusAscendant:12,kitava:13,kitavaHeart:14,carrionMinion:15};
const sizes={drowned:[86,104],rhoa:[116,108],goatman:[102,116],ancientArcher:[88,108],flameSentinel:[100,120],evangelist:[96,116],carrionQueen:[142,126],tentacleMiscreation:[142,122],brutus:[195,205],merveil:[160,185],merveilTwisted:[192,180],dominus:[164,194],dominusAscendant:[214,190],kitava:[300,300],kitavaHeart:[116,132],carrionMinion:[58,58]};
const clamp=v=>Math.max(0,Math.min(1,v));
const palette=type=>type==='fire'?['#ffac6e','#e46b38']:type==='cold'?['#b9edff','#6bb5e1']:type==='lightning'?['#e6dcff','#a18edb']:['#f6c2ab','#d57467'];

export class BestiaryRenderer{
  constructor(context){this.c=context;this.atlas=new Image();this.atlas.src=new URL('./assets/poe-creatures-atlas-v2.png',import.meta.url).href;}
  frame(key,x,y,width,height){
    const frame=frames[key];if(frame===undefined||!this.atlas.complete||!this.atlas.naturalWidth)return false;
    const cell=this.atlas.naturalWidth/4;
    this.c.drawImage(this.atlas,frame%4*cell,Math.floor(frame/4)*cell,cell,cell,x,y,width,height);return true;
  }
  unit(unit,player,time,low=false){
    const key=unit.artKey||unit.poeKind;if(!(key in frames)||!this.atlas.complete||!this.atlas.naturalWidth)return false;
    const c=this.c,[w,h]=sizes[key],a=unit.action,boss=unit.kind==='boss',facing=['kitava','kitavaHeart'].includes(key)?1:unit.x>player.x?-1:1;
    const frozen=unit.freezeUntil>time,bob=frozen||low?0:Math.sin(time*4+(unit.id||0))*(key==='flameSentinel'?3:1);
    const progress=a?clamp((time-a.startedAt)/Math.max(.01,a.until-a.startedAt)):0,windup=a?.phase==='windup';
    c.save();
    c.fillStyle='#0308069e';c.beginPath();c.ellipse(unit.x,unit.y+5,Math.min(100,w*.28),Math.max(5,h*.055),0,0,TAU);c.fill();
    if(unit.elite){c.strokeStyle='#e4c579bd';c.lineWidth=1.5;c.beginPath();c.arc(unit.x,unit.y+2,unit.radius+8,0,TAU);c.stroke();}
    if(a?.phase==='charge'&&!low){
      for(let i=3;i>0;i--){c.save();c.globalAlpha=.08*(4-i);c.translate(unit.x-Math.cos(a.angle)*i*12,unit.y-Math.sin(a.angle)*i*12);c.scale(facing,1);this.frame(key,-w/2,-h*.84,w,h);c.restore();}
    }
    c.translate(unit.x,unit.y+bob-(unit.jumpHeight||0));c.scale(facing,1);
    if(windup){
      if(key==='rhoa')c.rotate(-progress*.11*facing);
      if(key==='goatman')c.scale(1+progress*.04,1-progress*.08);
      if(key==='tentacleMiscreation')c.scale(1+progress*.08,1);
      if(boss)c.translate(0,Math.sin(progress*Math.PI)*-3);
    }
    if(unit.telegraph>0)c.globalAlpha=.35;
    if(unit.invulnerable)c.globalAlpha*=.3;
    this.frame(key,-w/2,-h*.84,w,h);
    if(unit.hit>0){c.globalCompositeOperation='screen';c.globalAlpha*=.32;this.frame(key,-w/2,-h*.84,w,h);}
    c.restore();
    if(unit.freezeUntil>time){c.save();c.strokeStyle='#bfefff9c';c.lineWidth=1.2;c.beginPath();c.ellipse(unit.x,unit.y-h*.29,w*.27,h*.37,0,0,TAU);c.stroke();c.restore();}
    if(key==='kitavaHeart'){
      c.save();c.strokeStyle='#f5cc98b0';c.lineWidth=1.5;c.setLineDash([5,7]);c.lineDashOffset=-time*9;c.beginPath();c.arc(unit.x,unit.y,unit.radius+11,0,TAU);c.stroke();c.restore();
    }
    if(!boss&&unit.hp<unit.maxHp){
      const width=Math.min(66,w*.5),y=unit.y-h*.72-(unit.jumpHeight||0);
      c.fillStyle='#102013';c.fillRect(unit.x-width/2,y,width,4);c.fillStyle=unit.kind==='heart'?'#e7b985':unit.elite?'#e1bd74':'#b9c895';c.fillRect(unit.x-width/2,y,Math.max(0,unit.hp/unit.maxHp)*width,2);
    }
    return true;
  }
  shape(h){
    const c=this.c;c.beginPath();
    if(h.geometry==='line'){
      const angle=Math.atan2(h.y2-h.y,h.x2-h.x),radius=(h.width??12)/2,dx=Math.sin(angle)*radius,dy=-Math.cos(angle)*radius;
      c.moveTo(h.x+dx,h.y+dy);c.lineTo(h.x2+dx,h.y2+dy);c.arc(h.x2,h.y2,radius,angle-Math.PI/2,angle+Math.PI/2);c.lineTo(h.x-dx,h.y-dy);c.arc(h.x,h.y,radius,angle+Math.PI/2,angle+Math.PI*1.5);c.closePath();
    }else if(h.geometry==='cone'){
      c.moveTo(h.x,h.y);c.arc(h.x,h.y,h.radius,h.angle-h.arc/2,h.angle+h.arc/2);c.closePath();
    }else if(h.geometry==='ring'){
      c.arc(h.x,h.y,h.radius,0,TAU);c.arc(h.x,h.y,Math.max(0,h.innerRadius||0),0,TAU,true);
    }else c.arc(h.x,h.y,h.radius||50,0,TAU);
  }
  warning(h,time,low=false){
    const c=this.c,active=time>=(h.warningUntil??Infinity),colors=palette(h.context?.type);
    c.save();c.lineJoin='round';c.lineWidth=active?2.4:1.5;
    c.fillStyle=active?`${colors[1]}4c`:`${colors[1]}20`;c.strokeStyle=active?colors[0]:`${colors[0]}b3`;
    if(!active)c.setLineDash([5,5]);
    this.shape(h);c.fill('evenodd');c.stroke();c.setLineDash([]);
    if(!active&&!low){
      c.strokeStyle=`${colors[0]}70`;c.lineWidth=1;
      if(h.geometry==='circle'){c.beginPath();c.arc(h.x,h.y,(h.radius||50)*(.5+.5*((time*1.4)%1)),0,TAU);c.stroke();}
    }
    if(active&&!low&&h.geometry==='circle'){
      for(let i=0;i<8;i++){const angle=i*TAU/8+time*.6,r=(h.radius||50)*.68;c.strokeStyle=`${colors[0]}a0`;c.beginPath();c.moveTo(h.x+Math.cos(angle)*r,h.y+Math.sin(angle)*r);c.lineTo(h.x+Math.cos(angle)*(r+8),h.y+Math.sin(angle)*(r+8)-7);c.stroke();}
    }
    c.restore();
  }
  ground(run,time,low,bounds){
    const c=this.c;
    for(const e of run.enemies){
      if(e.hp<=0||!e.poeKind)continue;
      if(e.poeKind==='evangelist'&&e.shieldUntil>run.time){
        c.save();c.fillStyle='#e6c26b12';c.strokeStyle='#ebce8799';c.lineWidth=1.5;c.beginPath();c.arc(e.x,e.y,e.shieldRadius,0,TAU);c.fill();c.stroke();c.restore();
      }
      const a=e.action;
      if(a?.phase==='windup'&&a.geometry&&a.kind!=='bloodRain'){
        const marker={...a,x:a.x??e.x,y:a.y??e.y,warningUntil:a.until,context:{type:['fireFan','fireBreath'].includes(a.kind)?'fire':['iceStorm','iceFan','coldGeysers'].includes(a.kind)?'cold':['lightningSouls','touchOfGod'].includes(a.kind)?'lightning':'physical'}};
        // Charge collision sweeps the actual body; the target's radius is accounted for separately by the model.
        if(a.kind==='rhoaCharge')marker.width=e.radius*2;
        this.warning(marker,time,low);
      }
      if(a?.phase==='airborne')this.warning({geometry:'circle',x:a.targetX,y:a.targetY,radius:a.radius||70,warningUntil:a.until,context:{type:'physical'}},time,low);
    }
    for(const h of run.hazards||[]){
      if(h.geometry==='safeZone'){
        c.save();const active=time>=h.warningUntil;c.fillStyle=active?'#8d25352e':'#6e27321a';c.beginPath();c.rect(bounds.x,bounds.y,bounds.width,bounds.height);c.arc(h.x,h.y,h.safeRadius,0,TAU,true);c.fill('evenodd');
        c.strokeStyle=active?'#edc890':'#edc89099';c.lineWidth=2;c.setLineDash(active?[]:[6,6]);c.beginPath();c.arc(h.x,h.y,h.safeRadius,0,TAU);c.stroke();c.restore();
        if(active&&!low){c.save();c.strokeStyle='#e2a3a83d';c.lineWidth=1;for(let i=0;i<36;i++){const x=bounds.x+(i*.618%1)*bounds.width,y=bounds.y+((time*.35+i*.371)%1)*bounds.height;if(Math.hypot(x-h.x,y-h.y)<h.safeRadius)continue;c.beginPath();c.moveTo(x,y);c.lineTo(x-4,y+12);c.stroke();}c.restore();}
      }else this.warning(h,time,low);
    }
  }
  overhead(run,time,low){
    const c=this.c;
    for(const e of run.enemies){
      if(e.hp<=0||e.poeKind!=='evangelist'||!(e.shieldUntil>run.time))continue;
      c.save();c.strokeStyle='#ebd18a55';c.fillStyle='#edc8780c';c.lineWidth=1.5;c.beginPath();c.ellipse(e.x,e.y-e.shieldRadius*.35,e.shieldRadius,e.shieldRadius*.85,0,Math.PI,TAU);c.fill();c.stroke();
      if(!low){c.strokeStyle='#edd79922';c.beginPath();c.ellipse(e.x,e.y-e.shieldRadius*.35,e.shieldRadius*.55,e.shieldRadius*.85,0,Math.PI,TAU);c.stroke();}c.restore();
    }
  }
  projectile(shot){
    if(!shot.hostile||!shot.context?.skill)return false;
    const c=this.c,skill=shot.context.skill,angle=Math.atan2(shot.vy,shot.vx);c.save();c.translate(shot.x,shot.y);c.rotate(angle);c.lineCap='round';
    if(['ancientArrow','spineVolley'].includes(skill)){
      c.strokeStyle=skill==='spineVolley'?'#f2bca4':'#dfd4b4';c.lineWidth=2;c.beginPath();c.moveTo(-14,0);c.lineTo(5,0);c.stroke();c.fillStyle='#fff0c9';c.beginPath();c.moveTo(8,0);c.lineTo(1,-3);c.lineTo(1,3);c.closePath();c.fill();
    }else{
      const colors=palette(shot.context.type);c.strokeStyle=`${colors[1]}99`;c.lineWidth=6;c.beginPath();c.moveTo(-18,0);c.lineTo(0,0);c.stroke();c.fillStyle=colors[0];c.beginPath();c.ellipse(1,0,skill==='lightningSouls'?9:6,4,0,0,TAU);c.fill();c.fillStyle='#fff0dc';c.beginPath();c.arc(3,0,2,0,TAU);c.fill();
    }
    c.restore();return true;
  }
}
