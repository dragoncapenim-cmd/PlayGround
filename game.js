(() => {
  const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d');
  const $=s=>document.querySelector(s);
  const people=[
    {id:'mara',name:'Mara Bell',role:'INNKEEPER',initial:'M',x:205,y:447,color:'#b66b59',talked:false,trust:0,line:'You have the look of someone who has travelled too far to find a bed. The Bell & Briar has one room left, if you can pay in coin.'},
    {id:'elias',name:'Elias Wren',role:'APOTHECARY',initial:'E',x:445,y:430,color:'#748c7a',talked:false,trust:0,line:'A curious pallor. Forgive me—I make a study of such things. The old chapel road is quiet after the bells. A shepherd walks it alone.'},
    {id:'constable',name:'Constable Vale',role:'TOWN WATCH',initial:'V',x:684,y:448,color:'#66718d',talked:false,trust:0,line:'New faces are noticed here. Keep to the lamplight, stranger. We have had livestock go missing on the north road.'}
  ];
  const state={phase:'day',day:1,hunger:62,suspicion:8,feedings:0,clues:0,hidden:false,player:{x:490,y:423,tx:490,ty:423},nightCount:0,caught:false,toastTimer:0,dialoguePerson:null,quiet:false,approach:null,guard:{x:700,y:310,dir:1},lastTime:0};
  let W=900,H=550,scale=1,ox=0,oy=0,keys={},touch={},lastInteract=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;ctx.setTransform(scale,0,0,scale,ox,oy)}
  new ResizeObserver(resize).observe(canvas); resize();
  const rand=(a,b)=>a+Math.random()*(b-a);
  function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function drawBuilding(x,y,w,h,wall,roof,label,lit=false){
    ctx.fillStyle='#11111655';ctx.fillRect(x+8,y+12,w,h);
    ctx.fillStyle=wall;ctx.fillRect(x,y,w,h);
    ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-12,y+5);ctx.lineTo(x+w*.48,y-h*.28);ctx.lineTo(x+w+12,y+5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#17171c';ctx.fillRect(x+6,y+8,w-12,8);
    for(let i=0;i<Math.floor(w/52);i++){let wx=x+16+i*49,wy=y+28+(i%2)*13;ctx.fillStyle=lit?'#d8a76a':'#24232a';ctx.fillRect(wx,wy,21,31);ctx.fillStyle=lit?'#e6b874':'#464049';ctx.fillRect(wx+9,wy,2,31);ctx.fillRect(wx,wy+14,21,2);ctx.fillStyle='#17171c';ctx.fillRect(wx-3,wy-3,27,3)}
    ctx.fillStyle='#29262a';ctx.fillRect(x+w*.43,y+h-52,w*.16,52);
    if(label){ctx.fillStyle='#c9ac83';ctx.font='10px Georgia';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+20)}
  }
  function drawLamp(x,y,lit){
    ctx.fillStyle='#29272b';ctx.fillRect(x-2,y-56,4,58);ctx.beginPath();ctx.moveTo(x-10,y-56);ctx.lineTo(x,y-67);ctx.lineTo(x+10,y-56);ctx.closePath();ctx.fill();ctx.fillRect(x-10,y-55,20,3);
    if(lit){let g=ctx.createRadialGradient(x,y-48,2,x,y-48,75);g.addColorStop(0,'#e5ad5c57');g.addColorStop(1,'#e5ad5c00');ctx.fillStyle=g;ctx.fillRect(x-75,y-123,150,150);ctx.fillStyle='#e7b66c';ctx.fillRect(x-3,y-53,6,9)}
  }
  function drawWorld(){
    const night=state.phase==='night', t=performance.now()/1000;
    ctx.fillStyle=night?'#252630':'#afa18e';ctx.fillRect(0,0,W,H);
    // layered skyline
    ctx.fillStyle=night?'#24232a':'#797370';ctx.fillRect(0,75,W,180);
    for(let i=0;i<18;i++){let x=i*59-10,h=rand?0:0;h=72+(i*37%75);ctx.fillStyle=night?'#292831':'#888079';ctx.fillRect(x,175-h,49,h);ctx.fillStyle=night?'#35323a':'#968779';ctx.beginPath();ctx.moveTo(x-5,176-h);ctx.lineTo(x+23,151-h);ctx.lineTo(x+53,176-h);ctx.fill();if(i%3===0){ctx.fillStyle=night?'#d2a261':'#d5a55f';ctx.fillRect(x+20,191-h,7,12)}}
    // twilight/moon
    ctx.fillStyle=night?'#c9bb9a':'#d8b27f';ctx.beginPath();ctx.arc(740,92,night?23:31,0,Math.PI*2);ctx.fill();
    if(night){ctx.fillStyle='#252630';ctx.beginPath();ctx.arc(751,82,22,0,Math.PI*2);ctx.fill();for(let i=0;i<24;i++){let x=(i*173+43)%880,y=32+(i*67)%127;ctx.fillStyle=`rgba(240,222,188,${.35+(i%3)*.2})`;ctx.fillRect(x,y,2,2)}}
    // far houses
    drawBuilding(-17,224,251,232,night?'#514448':'#796958',night?'#353138':'#514c4c','THE BELL & BRIAR',night);
    drawBuilding(267,202,240,254,night?'#56504c':'#887664',night?'#39353a':'#5b514d','WREN APOTHECARY',night);
    drawBuilding(604,221,316,235,night?'#484650':'#766d66',night?'#302e37':'#504c50','OLD MARKET',night);
    // street depth
    ctx.fillStyle=night?'#353239':'#82786e';ctx.fillRect(0,399,W,151);
    ctx.fillStyle=night?'#5c5453':'#a39788';ctx.beginPath();ctx.moveTo(368,399);ctx.lineTo(571,399);ctx.lineTo(845,550);ctx.lineTo(72,550);ctx.closePath();ctx.fill();
    // perspective cobbles
    for(let row=0;row<8;row++){let y=411+row*21;ctx.strokeStyle=night?'#756c68':'#b4a797';ctx.globalAlpha=.34;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();let gap=54+row*12,shift=row%2?gap/2:0;for(let x=-gap;x<W+gap;x+=gap){ctx.beginPath();ctx.moveTo(x+shift,y);ctx.lineTo(x+shift-10,y+20);ctx.stroke()}}ctx.globalAlpha=1;
    // curb, puddles, barrel
    ctx.fillStyle=night?'#29282d':'#6d665f';ctx.fillRect(0,393,W,8);ctx.fillStyle=night?'#423e45':'#92887e';ctx.fillRect(0,401,W,3);
    for(let i=0;i<5;i++){let x=100+i*173,y=450+(i%2)*44;ctx.fillStyle=night?'#53535d55':'#d5c7b65c';ctx.beginPath();ctx.ellipse(x,y,20+(i%3)*8,3,0,0,Math.PI*2);ctx.fill()}
    // awning
    ctx.fillStyle=night?'#603b3e':'#8c4f4b';ctx.fillRect(255,296,105,14);for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#b18c70':'#814c49';ctx.fillRect(255+i*15,296,15,14)}
    drawLamp(122,410,night);drawLamp(516,401,night);drawLamp(824,411,night);
    // market crates
    ctx.fillStyle='#49403c';ctx.fillRect(570,371,39,26);ctx.strokeStyle='#927a5b';ctx.strokeRect(570,371,39,26);ctx.fillStyle='#4b3b32';ctx.fillRect(615,379,28,18);
    if(night)drawNightFigures(t);
    else people.forEach(p=>drawPerson(p.x,p.y,p.color,p.initial,p.id==='constable',false));
    drawPerson(state.player.x,state.player.y,'#292a36','',false,true);
    if(state.hidden){ctx.fillStyle='#1b1a1fcc';ctx.beginPath();ctx.ellipse(state.player.x,state.player.y-19,25,34,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bca17780';ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([])}
  }
  function drawPerson(x,y,color,initial,uniform,isPlayer){
    const t=performance.now()/260+(x*.03);ctx.fillStyle='#16151966';ctx.beginPath();ctx.ellipse(x,y-1,18,6,0,0,Math.PI*2);ctx.fill();
    if(isPlayer){ctx.fillStyle='#17171d';ctx.beginPath();ctx.moveTo(x-14,y-35);ctx.quadraticCurveTo(x,y-48,x+13,y-35);ctx.lineTo(x+20,y-5);ctx.quadraticCurveTo(x,y+3,x-19,y-5);ctx.closePath();ctx.fill();ctx.fillStyle='#d2bda5';ctx.beginPath();ctx.arc(x,y-42,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1f1d24';ctx.beginPath();ctx.moveTo(x-9,y-42);ctx.lineTo(x,y-57);ctx.lineTo(x+9,y-42);ctx.fill();ctx.strokeStyle='#514454';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-8,y-7);ctx.lineTo(x-10+Math.sin(t)*2,y);ctx.moveTo(x+7,y-7);ctx.lineTo(x+9-Math.sin(t)*2,y);ctx.stroke();return}
    ctx.fillStyle=uniform?'#333746':color;ctx.beginPath();ctx.moveTo(x-10,y-28);ctx.quadraticCurveTo(x,y-36,x+10,y-28);ctx.lineTo(x+14,y-5);ctx.quadraticCurveTo(x,y+1,x-14,y-5);ctx.closePath();ctx.fill();ctx.fillStyle='#c5a98b';ctx.beginPath();ctx.arc(x,y-34,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=uniform?'#282a35':'#4a3835';ctx.beginPath();ctx.arc(x,y-36,7,Math.PI,0);ctx.fill();if(uniform){ctx.fillStyle='#bd9b5b';ctx.fillRect(x-3,y-16,6,5)}
  }
  function drawNightFigures(t){
    // watchman's slow patrol, and a solitary traveler
    const gx=state.guard.x; if(!state.caught){ctx.save();ctx.globalAlpha=.055;ctx.fillStyle='#e8ca91';ctx.beginPath();ctx.moveTo(gx,326);ctx.lineTo(gx+(state.guard.dir>0?1:-1)*145,255);ctx.lineTo(gx+(state.guard.dir>0?1:-1)*175,414);ctx.closePath();ctx.fill();ctx.restore();drawPerson(gx,360,'#66718d','V',true,false)}
    if(state.feedings===0||state.phase==='night')drawPerson(755+Math.sin(t*.25)*10,390,'#9b715f','J',false,false);
  }
  function frame(now){let dt=Math.min(.04,(now-state.lastTime)/1000||0);state.lastTime=now;update(dt);drawWorld();requestAnimationFrame(frame)}requestAnimationFrame(frame);
  function update(dt){
    let p=state.player,speed=state.hidden?82:145;let dx=(keys.ArrowRight||keys.d||touch.right?1:0)-(keys.ArrowLeft||keys.a||touch.left?1:0),dy=(keys.ArrowDown||keys.s||touch.down?1:0)-(keys.ArrowUp||keys.w||touch.up?1:0);
    if(dx||dy){let len=Math.hypot(dx,dy);p.tx=clamp(p.x+dx/len*speed*dt,35,865);p.ty=clamp(p.y+dy/len*speed*dt,270,500)}
    const dd=Math.hypot(p.tx-p.x,p.ty-p.y),step=speed*dt;if(dd>1){p.x+=((p.tx-p.x)/dd)*Math.min(step,dd);p.y+=((p.ty-p.y)/dd)*Math.min(step,dd)}
    if(state.phase==='day'&&state.approach&&!state.dialoguePerson&&Math.hypot(p.x-state.approach.x,p.y-state.approach.y)<72)openDialogue(state.approach);
    if(state.phase==='night'&&!state.caught){state.guard.x+=state.guard.dir*30*dt;if(state.guard.x>746)state.guard.dir=-1;if(state.guard.x<610)state.guard.dir=1;let dist=Math.hypot(p.x-state.guard.x,p.y-360);if(dist<36&&!state.hidden){state.suspicion=clamp(state.suspicion+dt*2,0,100);if(state.suspicion>92){state.caught=true;state.suspicion=100;toast('The watch has seen too much. Find the shadows.')}}}
    if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)$('#toast').classList.remove('show')}
    updateUI();
  }
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');state.toastTimer=2.7}
  function updateUI(){
    $('#hungerFill').style.width=state.hunger+'%';$('#hungerValue').textContent=String(Math.round(state.hunger)).padStart(2,'0')+'%';$('#suspicionFill').style.width=state.suspicion+'%';$('#suspicionValue').textContent=String(Math.round(state.suspicion)).padStart(2,'0')+'%';
    $('#dayNum').textContent=String(state.day).padStart(2,'0');const night=state.phase==='night';$('#phaseEyebrow').textContent=night?'THE HUNGER STIRS':'A FRAGILE DISGUISE';$('#phaseTitle').innerHTML=night?'The dark<br>is listening.':'A face among<br>the living.';$('#storyCopy').textContent=night?'Keep to the shadows. Find a solitary soul, and leave no witness with a reason to remember.':'Keep your old hunger quiet. Vesper remembers every strange thing—and the sun is not yet gone.';$('#skyText').textContent=night?'MOONRISE':'LATE AFTERNOON';$('#skyIcon').textContent=night?'☾':'☼';$('#sceneCaption').textContent=night?'THE LAMPLIGHT ENDS WHERE THE OLD ROAD BEGINS.':'THE TOWN IS FULL OF EYES. AND STORIES.';$('#objectiveText').textContent=night?'Find the lone traveler. Stay beyond the watchman’s gaze.':state.clues?'You know the quiet road. Let night fall.':'Learn who walks alone after dusk.';$('#objectiveStatus').textContent=night?'A MOMENT IN THE SHADOWS':'DAYLIGHT HOURS';$('#progressDots').innerHTML=`<i class="${state.clues?'active':''}"></i><i class="${state.feedings?'active':''}"></i><i class="${state.feedings>1?'active':''}"></i>`;$('#locationName').textContent=night?'THE OLD QUARTER · AFTER DARK':'THE OLD QUARTER';$('#actionLabel').textContent=night?(nearTraveler()?'LURE & FEED':'RETURN BEFORE DAWN'):'WAIT FOR NIGHT';$('#actionIcon').textContent=night?'✦':'☾';$('#hideBtn').innerHTML=`<span>${state.hidden?'◉':'◒'}</span> <b>${state.hidden?'UNHIDE':'HIDE'}</b>`;people.forEach(p=>{const role=$(`[data-person="${p.id}"] .person-role`);if(role)role.textContent=p.role+(p.talked?' · MET':'')});
    $('#mobileHint').textContent=night?'AVOID THE WATCH · FIND THE LONE TRAVELER':'TAP A NEIGHBOR TO APPROACH';
  }
  function renderPeople(){$('#peopleList').innerHTML=people.map(p=>`<button class="person-row" data-person="${p.id}"><span class="person-avatar" style="border-color:${p.color}">${p.initial}</span><span class="person-info"><span class="person-name">${p.name}</span><span class="person-role">${p.role}${p.talked?' · MET':''}</span></span><span class="person-arrow">↗</span></button>`).join('')}
  $('#peopleList').addEventListener('click',e=>{const row=e.target.closest('.person-row');if(row)approachPerson(people.find(p=>p.id===row.dataset.person))});
  function nearestPerson(){return people.map(p=>({p,d:Math.hypot(p.x-state.player.x,p.y-state.player.y)})).sort((a,b)=>a.d-b.d)[0]}
  function nearTraveler(){return Math.hypot(state.player.x-(755+Math.sin(performance.now()/1000*.25)*10),state.player.y-390)<57}
  function approachPerson(p){if(state.phase==='night'){toast('Best not to be seen speaking after dark.');return}if(!p)return;state.approach=p;state.player.tx=clamp(p.x-45,35,865);state.player.ty=clamp(p.y+38,270,500)}
  function interact(){if(state.phase==='day'){let q=nearestPerson();if(q.d<75){openDialogue(q.p)}else if(state.approach&&Math.hypot(state.player.x-state.approach.x,state.player.y-state.approach.y)<95)openDialogue(state.approach);else toast('Move closer to someone in town.');return}if(state.phase==='night'){if(nearTraveler()){const guardDist=Math.hypot(state.player.x-state.guard.x,state.player.y-360);if(guardDist<115&&!state.hidden){state.suspicion=clamp(state.suspicion+24,0,100);toast('The watchman catches your movement! Hide, or wait for him to pass.');return}feed();return}toast('No one is alone nearby. Find the traveler near the market.')}}
  function openDialogue(p){state.dialoguePerson=p;$('#dialogueName').textContent=p.name;$('#dialogueRole').textContent=p.role;$('#portrait').textContent=p.initial;$('#dialogueLine').textContent=p.line;const options=p.id==='mara'?[['Ask about the town','I am new here. What should a stranger know?'],['Offer a courteous compliment','Your inn has a most welcoming sign.'],['Ask who walks alone at night','Are the roads safe after the bells?']]:p.id==='elias'?[['Ask about his work','You keep a fascinating shop. What do you study?'],['Ask about the shepherd','A shepherd takes the chapel road alone?'],['Change the subject','I am simply passing through.']]:[['Ask about the missing livestock','What has been happening on the north road?'],['Praise his service','You keep the peace admirably, Constable.'],['Ask about the night watch','Do you patrol the chapel road as well?']];$('#choiceList').innerHTML=options.map((o,i)=>`<button class="choice-button" data-choice="${i}"><span>0${i+1}</span>${o[0]}</button>`).join('');document.querySelectorAll('.choice-button').forEach((b,i)=>b.onclick=()=>choose(p,i));$('#dialogue').classList.add('open');$('#dialogue').setAttribute('aria-hidden','false')}
  function closeDialogue(){ $('#dialogue').classList.remove('open');$('#dialogue').setAttribute('aria-hidden','true');state.dialoguePerson=null;state.approach=null;updateUI() }
  function choose(p,i){p.talked=true;p.trust++;let line='',delta=0;
    if(p.id==='mara'){if(i===0){line='“Mind the church bells, and mind the watch. The north road is a lonely place after dark.”';state.clues++}else if(i===1){line='“Flattery buys no room, dear guest—but kindness may yet buy a cup of tea.”';delta=-2}else{line='“The shepherd takes the old chapel road. Never returns before dawn, that one.”';state.clues++}}
    if(p.id==='elias'){if(i===0){line='“I study the curious maladies of the blood. You look quite well, all things considered.”';delta=3}else if(i===1){line='“Jonas. A decent soul. He minds his flock by the ruined chapel, far from the village.”';state.clues++}else{line='“Of course. Forgive my impertinence. The late light does not suit you, does it?”';delta=1}}
    if(p.id==='constable'){if(i===0){line='“A fox, most likely. Though the tracks were not those of any fox I know.”';state.clues++}else if(i===1){line='“Duty is its own reward. Though a kind word is a rare enough thing here.”';delta=-2}else{line='“I keep the market and the inn. The north lane is beyond my usual rounds.”';state.clues++}}
    state.suspicion=clamp(state.suspicion+delta,0,100);$('#dialogueLine').textContent=line;$('#choiceList').innerHTML='<button class="choice-button" id="leaveDialogue"><span>↗</span>Take your leave</button>';$('#leaveDialogue').onclick=closeDialogue;toast(p.trust>1?'They seem at ease with you.':'A little more of Vesper revealed.');updateUI();
  }
  function startNight(){state.phase='night';state.hidden=false;state.caught=false;state.player.x=490;state.player.y=423;state.player.tx=490;state.player.ty=423;state.guard.x=700;state.guard.dir=1;state.hunger=clamp(state.hunger+10,0,100);if(state.hunger>85)state.suspicion=clamp(state.suspicion+6,0,100);toast(state.clues?'The chapel road is quiet. The watchman is not.':'The moon rises. Find a solitary traveler.');updateUI()}
  function feed(){if(state.feedings>=3){endGame(true);return}state.feedings++;state.hunger=clamp(state.hunger-48,0,100);state.suspicion=clamp(state.suspicion+(state.hidden?-1:4),0,100);state.hidden=false;toast('Your hunger quiets. The night keeps its secret.');setTimeout(()=>{if(state.phase==='night'){if(state.feedings>=3){endGame(true)}else endNight()}},950);updateUI()}
  function endNight(){state.phase='day';state.day++;state.nightCount++;state.hunger=clamp(state.hunger+9,0,100);state.suspicion=clamp(state.suspicion-5,0,100);state.player.x=490;state.player.y=423;state.player.tx=490;state.player.ty=423;toast('Dawn returns. No one has seen you.');if(state.day>5)endGame(false);updateUI()}
  function endGame(won){$('#endingTitle').textContent=won?'A quiet dawn.':'The veil is torn.';$('#endingCopy').textContent=won?'Three nights, three quiet feedings, and not a soul the wiser. You have learned that a monster may yet choose mercy—and that Vesper has room for one more secret.':'The town has begun to ask questions. Your old life in Vesper is over, but another night will always come.';$('#ending').classList.add('open');$('#ending').setAttribute('aria-hidden','false')}
  $('#actionBtn').onclick=()=>state.phase==='day'?startNight():nearTraveler()?interact():endNight();$('#hideBtn').onclick=()=>{state.hidden=!state.hidden;toast(state.hidden?'You slip into the deeper shadows.':'You step back into the lamplight.');updateUI()};$('#touchInteract').onclick=interact;$('#dialogueClose').onclick=closeDialogue;$('#dialogue').addEventListener('click',e=>{if(e.target.id==='dialogue')closeDialogue()});$('#restartBtn').onclick=()=>location.reload();$('#soundBtn').onclick=()=>{state.quiet=!state.quiet;$('#soundBtn').style.color=state.quiet?'#777':'#c5b49e';toast(state.quiet?'Ambience muted.':'Ambience restored.')};
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key.toLowerCase()==='e'||e.key===' '){if(!state.dialoguePerson)interact()}else if(e.key.toLowerCase()==='h')$('#hideBtn').click();else keys[e.key]=true},{passive:false});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};touch={}});
  document.querySelectorAll('.dpad button').forEach(b=>{let dir=b.dataset.dir;const on=e=>{e.preventDefault();touch[dir]=true},off=e=>{e.preventDefault();touch[dir]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
  function canvasPoint(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;return{x:(x-ox)/scale,y:(y-oy)/scale}}
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')e.preventDefault();const p=canvasPoint(e);if(state.phase==='day'){const target=people.find(n=>Math.hypot(p.x-n.x,p.y-(n.y-19))<40);if(target){approachPerson(target);return}}state.player.tx=clamp(p.x,35,865);state.player.ty=clamp(p.y,270,500);if(state.phase==='night'&&nearTraveler())state.approach='traveler'});
  canvas.addEventListener('dblclick',e=>{e.preventDefault();interact()});$('#touchInteract').addEventListener('contextmenu',e=>e.preventDefault());
  renderPeople();
  updateUI();
})();
