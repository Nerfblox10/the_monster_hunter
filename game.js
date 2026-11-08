import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#11171a');
scene.fog = new THREE.FogExp2('#11171a', 0.016);
const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 20, 23);
const hemi = new THREE.HemisphereLight('#aab9ba', '#241d19', 1.45); scene.add(hemi);
const keyLight = new THREE.DirectionalLight('#ffe3b4', 2.5); keyLight.position.set(-7, 13, 6); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.camera.left = -17; keyLight.shadow.camera.right = 17; keyLight.shadow.camera.top = 17; keyLight.shadow.camera.bottom = -17; keyLight.shadow.bias = -0.0005; scene.add(keyLight);
const orangeLight = new THREE.PointLight('#d96326', 34, 24, 2); orangeLight.position.set(0, 4.2, -8); scene.add(orangeLight);
const blueLight = new THREE.PointLight('#4d8990', 24, 20, 2); blueLight.position.set(-9, 3.8, 3); scene.add(blueLight);
const world = new THREE.Group(); scene.add(world);
const mats = {
  floor: new THREE.MeshStandardMaterial({ color: '#34393a', roughness: .88, metalness: .2 }),
  wall: new THREE.MeshStandardMaterial({ color: '#20292b', roughness: .8, metalness: .38 }),
  metal: new THREE.MeshStandardMaterial({ color: '#59605e', roughness: .42, metalness: .75 }),
  dark: new THREE.MeshStandardMaterial({ color: '#141a1c', roughness: .56, metalness: .62 }),
  gold: new THREE.MeshStandardMaterial({ color: '#d39643', emissive: '#713d17', emissiveIntensity: .65, metalness: .42, roughness: .38 }),
  glow: new THREE.MeshStandardMaterial({ color: '#ffb452', emissive: '#f27920', emissiveIntensity: 2.4 }),
  blood: new THREE.MeshStandardMaterial({ color: '#822d25', roughness: .74 }),
  hunter: new THREE.MeshStandardMaterial({ color: '#b28a54', roughness: .72 }),
  cloth: new THREE.MeshStandardMaterial({ color: '#303a3c', roughness: .92 }),
  skin: new THREE.MeshStandardMaterial({ color: '#c2a277', roughness: .82 }),
};
const box = (parent, w,h,d,mat,x,y,z, opts={}) => { const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; if(opts.rx)m.rotation.x=opts.rx; if(opts.ry)m.rotation.y=opts.ry; parent.add(m); return m; };
const sphere = (parent, r, mat, x,y,z, scale=1) => {const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat);m.position.set(x,y,z);m.scale.setScalar(scale);m.castShadow=true;parent.add(m);return m;};
function buildRoom(){
  const floor=new THREE.Mesh(new THREE.BoxGeometry(28,.45,28),mats.floor);floor.position.y=-.28;floor.receiveShadow=true;world.add(floor);
  const grid=new THREE.GridHelper(28,28,'#6c5942','#485252');grid.position.y=-.045;grid.material.transparent=true;grid.material.opacity=.26;world.add(grid);
  // Heavy perimeter walls frame the arena while keeping the action visible.
  box(world,28,5,.65,mats.wall,0,2.25,-14); box(world,28,5,.65,mats.wall,0,2.25,14);
  box(world,.65,5,28,mats.wall,-14,2.25,0); box(world,.65,5,28,mats.wall,14,2.25,0);
  box(world,9,3.8,.72,mats.dark,0,2.05,-13.55);
  box(world,3.5,2.8,.2,mats.metal,0,1.52,-13.1);
  for(const x of [-4.6,4.6]){box(world,.13,3.1,.16,mats.glow,x,1.65,-13);box(world,.45,.17,.22,mats.gold,x,3.3,-13.08);}
  // Wall ribs, hazard rails, structural columns, and warm floor fixtures.
  for(let i=-5;i<=5;i++){
    const p=i*2.35;
    if(Math.abs(p)>6) {box(world,.24,4.4,.34,mats.metal,p,2.05,-13.56);box(world,.24,4.4,.34,mats.metal,p,2.05,13.56);}
    box(world,.18,4.3,.28,mats.metal,-13.55,2.05,p);box(world,.18,4.3,.28,mats.metal,13.55,2.05,p);
  }
  for(const [x,z] of [[-10,-9],[10,-9],[-10,9],[10,9]]){
    box(world,1.1,4.9,1.1,mats.dark,x,2.25,z);box(world,1.26,.15,1.26,mats.gold,x,4.25,z);box(world,1.35,.2,1.35,mats.metal,x,.06,z);
  }
  for(const x of [-11.6,11.6]){box(world,.28,.18,18,mats.gold,x,.02,0);for(const z of [-8,-4,0,4,8])box(world,.5,.24,.8,mats.glow,x,.04,z);}
  // Debris and low cover pieces make dodging and sightlines feel physical.
  for(const [x,z,r] of [[-6,-3,.85],[7,4,.72],[-9,5,.55],[5,-7,.6]]){
    box(world,1.5,.4,1.1,mats.dark,x,.02,z,{ry:.42});box(world,1.58,.08,1.14,mats.metal,x,.25,z,{ry:.42});
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,.9,8),mats.wall);barrel.position.set(x+1.15,.42,z-.35);barrel.castShadow=true;world.add(barrel);
  }
}
buildRoom();
const player = new THREE.Group();world.add(player);player.position.set(0,0,7);
// Procedural field hunter silhouette.
const body= new THREE.Group();player.add(body);
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.43,.58,4,8),mats.cloth);torso.position.y=1.03;torso.castShadow=true;body.add(torso);
const chest=new THREE.Mesh(new THREE.BoxGeometry(.78,.45,.32),mats.hunter);chest.position.set(0,1.12,-.07);chest.castShadow=true;body.add(chest);
const head=sphere(body,.27,mats.skin,0,1.75,0,.92);head.scale.set(.85,1,.85);
const hood=new THREE.Mesh(new THREE.SphereGeometry(.31,10,7,0,Math.PI*2,0,Math.PI*.57),mats.dark);hood.position.set(0,1.8,0);hood.castShadow=true;body.add(hood);
const pack=box(body,.43,.65,.3,mats.dark,0,1.18,.34);pack.rotation.x=-.05;
for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.5,3,6),mats.hunter);arm.position.set(side*.5,1.1,-.03);arm.rotation.z=side*-.19;arm.castShadow=true;body.add(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.45,3,6),mats.dark);leg.position.set(side*.2,.35,0);leg.castShadow=true;body.add(leg);}
const gun=box(body,.19,.18,.95,mats.metal,.18,1.08,-.64);gun.rotation.x=.06;const gunBarrel=box(body,.09,.09,.48,mats.dark,.18,1.09,-1.28);const gunGlow=box(body,.08,.04,.16,mats.glow,.18,1.17,-.96);
const shadowRing=new THREE.Mesh(new THREE.CircleGeometry(.65,20),new THREE.MeshBasicMaterial({color:'#d28f41',transparent:true,opacity:.18,side:THREE.DoubleSide}));shadowRing.rotation.x=-Math.PI/2;shadowRing.position.y=.008;player.add(shadowRing);
const enemies=[];const projectiles=[];const particles=[];const pickups=[];
let floorIndex=1, kills=0, health=100, running=false, ended=false, mouseDown=false, shotCooldown=0, spawnTimer=0, damageFlash=0, lastTime=0, bossRef=null, toastTimer=0, soundOn=true, audioCtx=null;
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2(0,0);const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);const aimPoint=new THREE.Vector3(0,0,0);
const floorNames=['THE SERVICE DECK','THE SUMP','THE FURNACE','THE SLEEPING WARD','THE OLD TRANSIT','THE FLESHWORKS','THE SIGNAL ROOM','THE BLACK VAULT','THE ROOT CHAMBER','THE ABYSSAL HEART'];
function updateAim(ev){const rect=canvas.getBoundingClientRect();mouse.x=((ev.clientX-rect.left)/rect.width)*2-1;mouse.y=-((ev.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(mouse,camera);raycaster.ray.intersectPlane(groundPlane,aimPoint);aimPoint.x=THREE.MathUtils.clamp(aimPoint.x,-13,13);aimPoint.z=THREE.MathUtils.clamp(aimPoint.z,-13,13);document.querySelector('#crosshair').style.left=`${ev.clientX}px`;document.querySelector('#crosshair').style.top=`${ev.clientY}px`;}
window.addEventListener('pointermove', updateAim);canvas.addEventListener('pointerdown',e=>{if(e.button===0){mouseDown=true;updateAim(e);if(!running&&!ended&&document.querySelector('#screen-cover').classList.contains('hidden'))startGame();}});window.addEventListener('pointerup',()=>mouseDown=false);window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();keys[key]=true;if(key==='shift')dash();if(key===' '&&running)fire();});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const keys={};
const startBtn=document.querySelector('#start-button');startBtn.addEventListener('click',startGame);
document.querySelector('#restart-button').addEventListener('click',()=>location.reload());
document.querySelector('#sound-control').addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('#sound-control').classList.toggle('muted',!soundOn);document.querySelector('#sound-control span').textContent=soundOn?'SOUND ON':'SOUND OFF';});
function startGame(){if(running||ended)return;document.querySelector('#screen-cover').classList.add('hidden');running=true;showToast('HOSTILE SIGNATURES DETECTED');spawnFloor();}
function showToast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1650);}
let dashTime=0,dashVector=new THREE.Vector3();function dash(){if(!running||dashTime>0)return;const x=(keys.d?1:0)-(keys.a?1:0),z=(keys.s?1:0)-(keys.w?1:0);dashVector.set(x,0,z);if(!dashVector.length())dashVector.set(player.position.x-aimPoint.x,0,player.position.z-aimPoint.z);dashVector.normalize();dashTime=.5;for(let i=0;i<8;i++)spawnSpark(player.position.clone().add(new THREE.Vector3(0,.1,0)),'#d7a24f');}
function createEnemy(boss=false){const g=new THREE.Group();world.add(g);const isBoss=boss;const scale=boss?2.45:1+Math.random()*.23;
 const hide=new THREE.MeshStandardMaterial({color:boss?'#321b20':(Math.random()>.5?'#4b2928':'#35403b'),roughness:.8,metalness:.08});const bone=new THREE.MeshStandardMaterial({color:boss?'#8f533a':'#826047',roughness:.87});const eye=new THREE.MeshStandardMaterial({color:'#ff6137',emissive:'#ff2c13',emissiveIntensity:3});
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),hide);core.position.y=.95;core.scale.set(.78,1.25,.62);core.castShadow=true;g.add(core);
 const skull=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),bone);skull.position.set(0,1.75,-.08);skull.scale.set(1.15,.85,.85);skull.castShadow=true;g.add(skull);
 for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(boss?.11:.065,8,6),eye);e.position.set(sx*(boss?.16:.105),1.79,-.31);g.add(e);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(boss?.14:.11,boss?.75:.52,3,6),hide);arm.position.set(sx*(boss?.57:.42),.91,-.02);arm.rotation.z=sx*-.5;arm.castShadow=true;g.add(arm);const claw=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,5),bone);claw.position.set(sx*(boss?.86:.67),.39,-.07);claw.rotation.z=Math.PI;g.add(claw);}
 const spine=new THREE.Mesh(new THREE.ConeGeometry(.12,boss?.75:.48,5),bone);spine.position.set(0,1.42,.43);spine.rotation.x=-.6;spine.castShadow=true;g.add(spine);
 const ring=new THREE.Mesh(new THREE.RingGeometry(isBoss?1.15:.57,isBoss?1.38:.69,24),new THREE.MeshBasicMaterial({color:isBoss?'#ef5137':'#ce7440',transparent:true,opacity:.55,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);
 let x,z;const side=Math.floor(Math.random()*4);if(side===0){x=-11+Math.random()*22;z=-11;}else if(side===1){x=-11+Math.random()*22;z=11;}else if(side===2){x=-11;z=-9+Math.random()*18;}else{x=11;z=-9+Math.random()*18;}g.position.set(x,0,z);g.scale.setScalar(scale);g.userData={boss,hp:boss?24:2+(floorIndex>6?1:0),maxHp:boss?24:2+(floorIndex>6?1:0),speed:boss?1.05:1.35+Math.random()*.35,damage:boss?20:8,attack:0,stagger:0,phase:Math.random()*6};enemies.push(g);return g;}
function spawnFloor(){if(ended)return;bossRef=null;const boss=floorIndex===10;const count=boss?1:2+Math.min(2,Math.floor((floorIndex-1)/4));document.querySelector('#floor-number').innerHTML=`−${String(floorIndex).padStart(2,'0')}<span>/10</span>`;document.querySelector('#floor-name').textContent=floorNames[floorIndex-1];document.querySelector('#progress-label').textContent=`${String(floorIndex).padStart(2,'0')} / 10`;document.querySelector('#level-progress-fill').style.width=`${floorIndex*10}%`;document.querySelector('#threat-value').textContent=boss?'EXTREME':floorIndex>6?'CRITICAL':'ELEVATED';const bars=document.querySelectorAll('.threat-bars i');bars.forEach((b,i)=>{b.style.background=i<(boss?5:Math.min(4,2+Math.floor(floorIndex/3)))?'#df9c3d':'rgba(255,255,255,.16)';});document.querySelector('#objective').innerHTML=boss?'BANISH THE ABYSSAL ONE <span id="enemy-count">01</span>':`ELIMINATE HOSTILES <span id="enemy-count">${String(count).padStart(2,'0')}</span>`;for(let i=0;i<count;i++){const e=createEnemy(boss);if(boss)bossRef=e;}if(boss){showToast('THE ABYSSAL ONE HAS AWAKENED');}updateUI();}
function createShot(){if(!running||shotCooldown>0)return;shotCooldown=.22;const origin=player.position.clone().add(new THREE.Vector3(0,1.08,0));const aim=new THREE.Vector3(aimPoint.x,0,aimPoint.z);let dir=aim.sub(origin);dir.y=-.08;dir.normalize();body.rotation.y=Math.atan2(-dir.x,-dir.z);const muzzle=origin.clone().add(dir.clone().multiplyScalar(.95));for(let i=0;i<5;i++)spawnSpark(muzzle,'#ffb451');playTone(110,.055,'sawtooth',.045);
 let target=null,best=100;for(const e of enemies){const center=e.position.clone().add(new THREE.Vector3(0,1.1,0));const to=center.clone().sub(origin);const along=to.dot(dir);if(along<0||along>25)continue;const near=origin.clone().add(dir.clone().multiplyScalar(along));const distance=center.distanceTo(near);const radius=e.userData.boss?1.55:.72;if(distance<radius&&along<best){best=along;target=e;}}
 const end=target?target.position.clone().add(new THREE.Vector3(0,1,0)):origin.clone().add(dir.multiplyScalar(20));const lineGeo=new THREE.BufferGeometry().setFromPoints([muzzle,end]);const line=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:'#ffbd65',transparent:true,opacity:.95}));world.add(line);setTimeout(()=>{world.remove(line);line.geometry.dispose();line.material.dispose();},70);
 if(target){target.userData.hp--;target.userData.stagger=.13;target.rotation.y+=.16;for(let i=0;i<7;i++)spawnSpark(target.position.clone().add(new THREE.Vector3((Math.random()-.5)*.8,1+Math.random(),(Math.random()-.5)*.8)),'#f77a42');const mark=document.querySelector('#hit-marker');mark.classList.remove('show');void mark.offsetWidth;mark.classList.add('show');if(target.userData.hp<=0)killEnemy(target);else if(target.userData.boss)showToast(`ABYSSAL ONE // ${Math.ceil(target.userData.hp/target.userData.maxHp*100)}%`);}
}
function fire(){createShot();}
function killEnemy(enemy){const i=enemies.indexOf(enemy);if(i<0)return;enemies.splice(i,1);const boss=enemy.userData.boss;for(let j=0;j<20;j++)spawnSpark(enemy.position.clone().add(new THREE.Vector3((Math.random()-.5)*1.6,Math.random()*2,(Math.random()-.5)*1.6)),boss?'#f05c38':'#dc8b49');world.remove(enemy);kills++;playTone(boss?48:72,.3,'triangle',.11);if(!boss&&Math.random()<.35){const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),new THREE.MeshStandardMaterial({color:'#f4bb64',emissive:'#dc7a22',emissiveIntensity:1.5}));orb.position.set(enemy.position.x,.48,enemy.position.z);orb.userData.spin=2;world.add(orb);pickups.push(orb);}
 if(boss){finish(true);return;}updateUI();if(enemies.length===0){document.querySelector('#objective').innerHTML='LEVEL CLEARED <span>✓</span>';showToast('ALL HOSTILES ELIMINATED');setTimeout(advanceFloor,1000);}}
function advanceFloor(){if(ended)return;if(floorIndex>=10){finish(false);return;}running=false;floorIndex++;const flash=document.querySelector('#floor-flash');document.querySelector('#flash-floor').textContent=`−${String(floorIndex).padStart(2,'0')}`;flash.classList.add('active');playTone(72,.45,'sine',.07);setTimeout(()=>{for(const e of [...enemies])world.remove(e);enemies.length=0;for(const p of [...pickups])world.remove(p);pickups.length=0;player.position.set(0,0,7);health=Math.min(100,health+12);flash.classList.remove('active');spawnFloor();running=true;},1300);}
function finish(victory){ended=true;running=false;document.querySelector('#end-kicker').textContent=victory?'CONTAINMENT RESTORED':'MISSION FAILED';document.querySelector('#end-title').innerHTML=victory?'THE ABYSS<br><em>IS SILENT.</em>':'THE HUNT<br><em>IS OVER.</em>';document.querySelector('#end-copy').textContent=victory?'The breach is sealed. For now.':'The darkness has claimed another hunter.';document.querySelector('#final-kills').textContent=String(kills).padStart(2,'0');document.querySelector('#end-screen').classList.add('show');}
function updateUI(){const count=document.querySelector('#enemy-count');if(count)count.textContent=String(enemies.length).padStart(2,'0');document.querySelector('#health-value').textContent=Math.ceil(health);document.querySelector('#health-fill').style.width=`${health}%`;document.querySelector('#health-fill').style.background=health<30?'#df5140':'#e3a34a';document.querySelector('#tracker-count').textContent=enemies.length?`${String(enemies.length).padStart(2,'0')} CONTACT${enemies.length===1?'':'S'}`:'NO CONTACT';}
function spawnSpark(pos,color){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.055+Math.random()*.07,0),new THREE.MeshBasicMaterial({color}));mesh.position.copy(pos);mesh.userData.velocity=new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);mesh.userData.life=.25+Math.random()*.35;world.add(mesh);particles.push(mesh);}
function playTone(freq,duration,type='sine',volume=.035){if(!soundOn)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(28,freq*.55),audioCtx.currentTime+duration);gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}catch(e){}}
let lastDash=0;function update(dt){if(!running)return;shotCooldown=Math.max(0,shotCooldown-dt);if(mouseDown)createShot();
 let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),z=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);const move=new THREE.Vector3(x,0,z);if(move.lengthSq()>0){move.normalize();const speed=keys.shift?12:5.2;player.position.addScaledVector(move,speed*dt);body.rotation.y=Math.atan2(-move.x,-move.z);}if(dashTime>0){player.position.addScaledVector(dashVector,17*dt);dashTime-=dt;}
 player.position.x=THREE.MathUtils.clamp(player.position.x,-12.1,12.1);player.position.z=THREE.MathUtils.clamp(player.position.z,-12.1,12.1);player.position.y=Math.sin(performance.now()*.009)*.025;
 for(const enemy of [...enemies]){const u=enemy.userData;u.phase+=dt*4;const toward=player.position.clone().sub(enemy.position);toward.y=0;const dist=toward.length();if(u.stagger>0)u.stagger-=dt;else if(dist>1.45){toward.normalize();enemy.position.addScaledVector(toward,u.speed*dt);enemy.rotation.y=Math.atan2(-toward.x,-toward.z);}else{u.attack-=dt;if(u.attack<=0){u.attack=u.boss?1.15:1.3;health=Math.max(0,health-u.damage);damageFlash=.28;playTone(52,.18,'square',.07);for(let n=0;n<6;n++)spawnSpark(player.position.clone().add(new THREE.Vector3((Math.random()-.5)*.8,1,(Math.random()-.5)*.8)),'#e6583c');updateUI();if(health<=0)finish(false);}}enemy.position.y=Math.abs(Math.sin(u.phase))*.12;}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.rotation.y+=dt*2;p.position.y=.48+Math.sin(performance.now()*.004+i)*.12;if(p.position.distanceTo(player.position)<1.05){health=Math.min(100,health+22);updateUI();showToast('VITALS RESTORED +22');world.remove(p);pickups.splice(i,1);}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.velocity,dt);p.userData.velocity.y-=4*dt;p.material.opacity=Math.max(0,p.userData.life*2);if(p.userData.life<=0){world.remove(p);p.geometry.dispose();p.material.dispose();particles.splice(i,1);}}
 camera.position.x+=(player.position.x*.35-camera.position.x)*Math.min(1,dt*2);camera.position.z+=(23+player.position.z*.26-camera.position.z)*Math.min(1,dt*2);camera.lookAt(player.position.x*.18,0,0);
 if(damageFlash>0){damageFlash-=dt;document.querySelector('.vignette').style.background=`radial-gradient(ellipse at 50% 49%,transparent 35%,rgba(145,20,12,${Math.max(0,damageFlash)*.75}) 100%),linear-gradient(180deg,rgba(5,8,11,.57),transparent 19%,transparent 65%,rgba(4,7,10,.64))`;}else document.querySelector('.vignette').style.background='';
}
function animate(time){requestAnimationFrame(animate);const dt=Math.min(.04,(time-lastTime)/1000||0);lastTime=time;update(dt);renderer.render(scene,camera);}
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));});
