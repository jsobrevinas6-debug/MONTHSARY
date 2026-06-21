const R   = (a,b) => Math.random()*(b-a)+a;
const TAU = Math.PI*2;

/* ── renderer ─────────────────────────── */
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x000000,1);
renderer.setSize(innerWidth,innerHeight);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 3000);
camera.position.set(0, 110, 120);
camera.lookAt(0, 0, 0);

window.addEventListener('resize',()=>{
  renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});

/* ── glow textures ────────────────────── */
function glowTex(col, sz=64){
  const cv=document.createElement('canvas'); cv.width=cv.height=sz;
  const cx=cv.getContext('2d');
  const g=cx.createRadialGradient(sz/2,sz/2,0, sz/2,sz/2,sz/2);
  g.addColorStop(0,'#fff');
  g.addColorStop(.18,col);
  g.addColorStop(.55,col+'55');
  g.addColorStop(1,'transparent');
  cx.fillStyle=g; cx.beginPath(); cx.arc(sz/2,sz/2,sz/2,0,TAU); cx.fill();
  return new THREE.CanvasTexture(cv);
}
const tPink  = glowTex('#ff4d9e',64);
const tSoft  = glowTex('#ffaadd',64);
const tWhite = glowTex('#ffffff',32);

/* ── shader: galaxy disk ──────────────── */
function makeGalaxyMat(tex){
  return new THREE.ShaderMaterial({
    vertexColors:true, transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending,
    uniforms:{uTex:{value:tex},uTime:{value:0}},
    vertexShader:`
      attribute float size;
      attribute float phase;
      varying vec3 vCol; varying float vA;
      uniform float uTime;
      void main(){
        vCol=color;
        float shimmer=0.65+0.35*sin(uTime*2.0+phase);
        vA=shimmer;
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*shimmer*(300.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform sampler2D uTex;
      varying vec3 vCol; varying float vA;
      void main(){
        vec4 t=texture2D(uTex,gl_PointCoord);
        if(t.a<.02) discard;
        gl_FragColor=vec4(vCol,vA)*t;
      }`
  });
}

/* ── shader: heart ────────────────────── */
function makeHeartMat(tex){
  return new THREE.ShaderMaterial({
    vertexColors:true, transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending,
    uniforms:{uTex:{value:tex},uTime:{value:0}},
    vertexShader:`
      attribute float size;
      varying vec3 vCol;
      uniform float uTime;
      void main(){
        vCol=color;
        float b=1.0+0.045*sin(uTime*1.5);
        vec4 mv=modelViewMatrix*vec4(position*b,1.);
        gl_PointSize=size*(1.0+0.06*sin(uTime*1.5))*(260.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform sampler2D uTex;
      varying vec3 vCol;
      void main(){
        vec4 t=texture2D(uTex,gl_PointCoord);
        if(t.a<.02) discard;
        gl_FragColor=vec4(vCol,t.a)*t;
      }`
  });
}

/* ── shader: sparkles ─────────────────── */
function makeSparkMat(tex){
  return new THREE.ShaderMaterial({
    vertexColors:true, transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending,
    uniforms:{uTex:{value:tex},uTime:{value:0}},
    vertexShader:`
      attribute float size; attribute float phase;
      varying vec3 vCol; varying float vA;
      uniform float uTime;
      void main(){
        vCol=color;
        float s=0.3+0.7*abs(sin(uTime*3.5+phase));
        vA=s;
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*s*(280.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform sampler2D uTex;
      varying vec3 vCol; varying float vA;
      void main(){
        vec4 t=texture2D(uTex,gl_PointCoord);
        if(t.a<.02) discard;
        gl_FragColor=vec4(vCol,vA)*t;
      }`
  });
}

/* ── shader: stars ────────────────────── */
function makeStarMat(tex){
  return new THREE.ShaderMaterial({
    vertexColors:true, transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending,
    uniforms:{uTex:{value:tex},uTime:{value:0}},
    vertexShader:`
      attribute float size; attribute float phase;
      varying vec3 vCol; varying float vA;
      uniform float uTime;
      void main(){
        vCol=color;
        float tw=0.5+0.5*sin(uTime*2.2+phase);
        vA=0.2+0.8*tw;
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*(1.0+0.4*tw)*(240.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform sampler2D uTex;
      varying vec3 vCol; varying float vA;
      void main(){
        vec4 t=texture2D(uTex,gl_PointCoord);
        if(t.a<.02) discard;
        gl_FragColor=vec4(vCol,vA)*t;
      }`
  });
}

/* ══════════════════════════════════════════
   SAMPLE "Happy Birthday" TEXT → XZ DISK
   Pixels from canvas are laid flat on XZ
   plane so the galaxy disk spells the text.
══════════════════════════════════════════ */
function sampleText(lines, fontPx, cW, cH){
  const cv=document.createElement('canvas'); cv.width=cW; cv.height=cH;
  const cx=cv.getContext('2d');
  cx.fillStyle='#fff'; cx.textAlign='center'; cx.textBaseline='middle';
  const lh=fontPx*1.3, startY=cH/2-(lines.length-1)*lh/2;
  lines.forEach((ln,i)=>{
    cx.font=`900 ${fontPx}px Georgia,serif`;
    cx.fillText(ln, cW/2, startY+i*lh);
  });
  const data=cx.getImageData(0,0,cW,cH).data;
  const pts=[];
  const stride=3;
  for(let y=0;y<cH;y+=stride)
    for(let x=0;x<cW;x+=stride)
      if(data[(y*cW+x)*4+3]>50) pts.push(x,y);
  return pts;
}

const CW=700, CH=240;
const rawPts=sampleText(['Happy','Birthday'], 88, CW, CH);
const N=rawPts.length/2;

const DISK_W=150, DISK_H=58;

const gPos=new Float32Array(N*3);
const gCol=new Float32Array(N*3);
const gSiz=new Float32Array(N);
const gPh =new Float32Array(N);

const cA=new THREE.Color('#ff0066'); // brighter hot pink
const cB=new THREE.Color('#ff66aa');
const cC=new THREE.Color('#ffaadd');
const cD=new THREE.Color('#ff1493');

for(let i=0;i<N;i++){
  const i3=i*3;
  const px=rawPts[i*2], py=rawPts[i*2+1];

  // canvas XY → world XZ (disk is flat, Y=up)
  const wx=(px/CW-0.5)*DISK_W;
  const wz=(py/CH-0.5)*DISK_H;
  const wy=R(-1.2,1.2); // thin disk scatter

  gPos[i3]  =wx+R(-.2,.2);
  gPos[i3+1]=wy;
  gPos[i3+2]=wz+R(-.2,.2);

  // colour: very bright pink throughout
  const dist=Math.sqrt(wx*wx+wz*wz);
  const dn=Math.min(dist/80,1);
  const col=dn<.33 ? cA.clone().lerp(cB,dn*3)
           :dn<.66 ? cB.clone().lerp(cC,(dn-.33)*3)
           :          cC.clone().lerp(cD,(dn-.66)*3);
  const br=R(1.0,1.4); // much brighter
  gCol[i3]=col.r*br; gCol[i3+1]=col.g*br; gCol[i3+2]=col.b*br;

  gSiz[i]=R(3,7); // even larger particles
  gPh[i] =R(0,TAU);
}

const diskGeo=new THREE.BufferGeometry();
diskGeo.setAttribute('position',new THREE.BufferAttribute(gPos,3));
diskGeo.setAttribute('color',   new THREE.BufferAttribute(gCol,3));
diskGeo.setAttribute('size',    new THREE.BufferAttribute(gSiz,1));
diskGeo.setAttribute('phase',   new THREE.BufferAttribute(gPh,1));
const diskMat=makeGalaxyMat(tPink);
const diskMesh=new THREE.Points(diskGeo,diskMat);
scene.add(diskMesh);

// soft dust halo around the text letters - MUCH BRIGHTER
const HALO_N=15000;
const haloP=new Float32Array(HALO_N*3);
const haloC=new Float32Array(HALO_N*3);
const haloS=new Float32Array(HALO_N);
const haloPh=new Float32Array(HALO_N);
for(let i=0;i<HALO_N;i++){
  const i3=i*3;
  const a=R(0,TAU), r=R(5,88);
  haloP[i3]  =Math.cos(a)*r+R(-6,6);
  haloP[i3+1]=R(-3.5,3.5);
  haloP[i3+2]=Math.sin(a)*r*(DISK_H/DISK_W)+R(-4,4);
  const br=R(.35,.7); // much brighter
  haloC[i3]=1*br; haloC[i3+1]=0.4*br; haloC[i3+2]=0.8*br; // brighter pink
  haloS[i]=R(1.5,4); // larger particles
  haloPh[i]=R(0,TAU);
}
const haloGeo=new THREE.BufferGeometry();
haloGeo.setAttribute('position',new THREE.BufferAttribute(haloP,3));
haloGeo.setAttribute('color',   new THREE.BufferAttribute(haloC,3));
haloGeo.setAttribute('size',    new THREE.BufferAttribute(haloS,1));
haloGeo.setAttribute('phase',   new THREE.BufferAttribute(haloPh,1));
const haloMat=makeGalaxyMat(tSoft);
const haloMesh=new THREE.Points(haloGeo,haloMat);
scene.add(haloMesh);

/* ══════════════════════════════════════════
   COSMIC GALAXY RING — beneath the text
   Swirling stardust, nebula particles, stars
   Purple, blue, pink, gold rotating orbit
══════════════════════════════════════════ */
const ringGroup = new THREE.Group();
ringGroup.position.y = -65; // moved far down from text for better visibility
scene.add(ringGroup);

const RING_RADIUS = 72;
const RING_N = 15000;
const ringP = new Float32Array(RING_N*3);
const ringC = new Float32Array(RING_N*3);
const ringS = new Float32Array(RING_N);
const ringPh = new Float32Array(RING_N);

for(let i=0; i<RING_N; i++){
  const i3 = i*3;
  const a = R(0, TAU);
  const radBase = RING_RADIUS + R(-10, 10); // wider radius variation
  const swirl = Math.sin(a * 5) * 6;
  const r = radBase + swirl;
  
  ringP[i3]   = Math.cos(a) * r + R(-6, 6); // more horizontal spread
  ringP[i3+1] = R(-8, 8); // more vertical spread
  ringP[i3+2] = Math.sin(a) * r + R(-6, 6); // more depth spread
  
  // ALL PINK colors
  const br = R(0.5, 1.0);
  ringC[i3]   = br; // full red
  ringC[i3+1] = R(0.2, 0.5)*br; // low-medium green
  ringC[i3+2] = R(0.6, 0.95)*br; // medium-high blue
  
  ringS[i] = R(1.5, 5);
  ringPh[i] = R(0, TAU);
}

const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.BufferAttribute(ringP, 3));
ringGeo.setAttribute('color', new THREE.BufferAttribute(ringC, 3));
ringGeo.setAttribute('size', new THREE.BufferAttribute(ringS, 1));
ringGeo.setAttribute('phase', new THREE.BufferAttribute(ringPh, 1));
const ringMat = makeGalaxyMat(tSoft);
ringGroup.add(new THREE.Points(ringGeo, ringMat));

// Nebula cloud layer - ALL PINK AND SPREAD WIDER
const NEBULA_N = 8000;
const nebRingP = new Float32Array(NEBULA_N*3);
const nebRingC = new Float32Array(NEBULA_N*3);
const nebRingS = new Float32Array(NEBULA_N);
const nebRingPh = new Float32Array(NEBULA_N);

for(let i=0; i<NEBULA_N; i++){
  const i3 = i*3;
  const a = R(0, TAU);
  const r = RING_RADIUS + R(-30, 30); // much wider spread
  
  nebRingP[i3]   = Math.cos(a) * r + R(-15, 15);
  nebRingP[i3+1] = R(-12, 12); // even more vertical spread
  nebRingP[i3+2] = Math.sin(a) * r + R(-15, 15);
  
  // ALL PINK shades
  const br = R(0.3, 0.6);
  nebRingC[i3]   = 1*br; // full red
  nebRingC[i3+1] = R(0.15, 0.4)*br; // low green
  nebRingC[i3+2] = R(0.55, 0.85)*br; // medium-high blue
  
  nebRingS[i] = R(8, 22); // large soft particles
  nebRingPh[i] = R(0, TAU);
}

const nebRingGeo = new THREE.BufferGeometry();
nebRingGeo.setAttribute('position', new THREE.BufferAttribute(nebRingP, 3));
nebRingGeo.setAttribute('color', new THREE.BufferAttribute(nebRingC, 3));
nebRingGeo.setAttribute('size', new THREE.BufferAttribute(nebRingS, 1));
nebRingGeo.setAttribute('phase', new THREE.BufferAttribute(nebRingPh, 1));
const nebRingMat = makeGalaxyMat(tSoft);
ringGroup.add(new THREE.Points(nebRingGeo, nebRingMat));

// Sparkling stars in the ring - ALL PINK AND SPREAD WIDE
const RING_STARS_N = 5000;
const rsP = new Float32Array(RING_STARS_N*3);
const rsC = new Float32Array(RING_STARS_N*3);
const rsS = new Float32Array(RING_STARS_N);
const rsPh = new Float32Array(RING_STARS_N);

for(let i=0; i<RING_STARS_N; i++){
  const i3 = i*3;
  const a = R(0, TAU);
  const r = RING_RADIUS + R(-25, 25); // spread much wider
  
  rsP[i3]   = Math.cos(a) * r + R(-12, 12);
  rsP[i3+1] = R(-10, 10); // more vertical spread
  rsP[i3+2] = Math.sin(a) * r + R(-12, 12);
  
  // ALL PINK sparkles
  const pinkBr = R(0.7, 1.0);
  rsC[i3]   = pinkBr; // red channel full
  rsC[i3+1] = pinkBr * R(0.2, 0.5); // green low
  rsC[i3+2] = pinkBr * R(0.6, 0.9); // blue medium-high
  
  rsS[i] = R(2, 8);
  rsPh[i] = R(0, TAU);
}

const rsGeo = new THREE.BufferGeometry();
rsGeo.setAttribute('position', new THREE.BufferAttribute(rsP, 3));
rsGeo.setAttribute('color', new THREE.BufferAttribute(rsC, 3));
rsGeo.setAttribute('size', new THREE.BufferAttribute(rsS, 1));
rsGeo.setAttribute('phase', new THREE.BufferAttribute(rsPh, 1));
const rsMat = makeSparkMat(tPink);
ringGroup.add(new THREE.Points(rsGeo, rsMat));

// Glowing energy trails
const TRAIL_N = 600;
const trailP = new Float32Array(TRAIL_N*3);
const trailC = new Float32Array(TRAIL_N*3);
const trailS = new Float32Array(TRAIL_N);
const trailPh = new Float32Array(TRAIL_N);

for(let i=0; i<TRAIL_N; i++){
  const i3 = i*3;
  const a = R(0, TAU);
  const r = RING_RADIUS + R(-2, 2);
  
  trailP[i3]   = Math.cos(a) * r;
  trailP[i3+1] = R(-1.5, 1.5);
  trailP[i3+2] = Math.sin(a) * r;
  
  // Golden energy glow
  const br = R(0.6, 1.0);
  trailC[i3]   = br; // gold/white energy
  trailC[i3+1] = br * R(0.8, 0.95);
  trailC[i3+2] = br * R(0.3, 0.6);
  
  trailS[i] = R(3, 8);
  trailPh[i] = R(0, TAU);
}

const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailP, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailC, 3));
trailGeo.setAttribute('size', new THREE.BufferAttribute(trailS, 1));
trailGeo.setAttribute('phase', new THREE.BufferAttribute(trailPh, 1));
const trailMat = makeGalaxyMat(glowTex('#ffd700', 64));
ringGroup.add(new THREE.Points(trailGeo, trailMat));

/* ══════════════════════════════════════════
   HEART GROUP — floats above the disk
══════════════════════════════════════════ */
const heartGroup=new THREE.Group();
heartGroup.position.y=52;
scene.add(heartGroup);

function heartXY(t){
  const a=t*TAU;
  return[16*Math.pow(Math.sin(a),3),
         13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)];
}
const H_SCALE=2.0;

// outer heart particles
const H_N=20000;
const hP=new Float32Array(H_N*3),hC=new Float32Array(H_N*3),hS=new Float32Array(H_N);
for(let i=0;i<H_N;i++){
  const i3=i*3,t=Math.random(),[hx,hy]=heartXY(t);
  hP[i3]  =(hx+R(-.45,.45))*H_SCALE;
  hP[i3+1]=(hy+R(-.45,.45))*H_SCALE;
  hP[i3+2]=R(-2,2);
  const d=Math.min(Math.sqrt(hx*hx+hy*hy)/20,1);
  hC[i3]=R(.85,1); hC[i3+1]=R(.1,.4)*(1-d*.5); hC[i3+2]=R(.5,.75);
  hS[i]=R(2.5,5.5);
}
const hGeo=new THREE.BufferGeometry();
hGeo.setAttribute('position',new THREE.BufferAttribute(hP,3));
hGeo.setAttribute('color',   new THREE.BufferAttribute(hC,3));
hGeo.setAttribute('size',    new THREE.BufferAttribute(hS,1));
const hMat=makeHeartMat(tSoft);
heartGroup.add(new THREE.Points(hGeo,hMat));

// bright glow core
const CORE_N=3000;
const cP2=new Float32Array(CORE_N*3),cC2=new Float32Array(CORE_N*3),cS2=new Float32Array(CORE_N);
for(let i=0;i<CORE_N;i++){
  const i3=i*3,t=Math.random(),[hx,hy]=heartXY(t);
  cP2[i3]=hx*H_SCALE*R(.85,1); cP2[i3+1]=hy*H_SCALE*R(.85,1); cP2[i3+2]=R(-.5,.5);
  cC2[i3]=1; cC2[i3+1]=R(.55,.85); cC2[i3+2]=R(.8,1);
  cS2[i]=R(5,13);
}
const cGeo2=new THREE.BufferGeometry();
cGeo2.setAttribute('position',new THREE.BufferAttribute(cP2,3));
cGeo2.setAttribute('color',   new THREE.BufferAttribute(cC2,3));
cGeo2.setAttribute('size',    new THREE.BufferAttribute(cS2,1));
const coreMat=makeHeartMat(tSoft);
heartGroup.add(new THREE.Points(cGeo2,coreMat));

// sparkle ring
const SP_N=900;
const spP=new Float32Array(SP_N*3),spC=new Float32Array(SP_N*3);
const spS=new Float32Array(SP_N),spPh=new Float32Array(SP_N);
for(let i=0;i<SP_N;i++){
  const i3=i*3,a=R(0,TAU),rad=R(22,44);
  spP[i3]=Math.cos(a)*rad; spP[i3+1]=Math.sin(a)*rad*.55; spP[i3+2]=R(-3,3);
  spC[i3]=1; spC[i3+1]=R(.6,.9); spC[i3+2]=R(.8,1);
  spS[i]=R(3,9); spPh[i]=R(0,TAU);
}
const spGeo=new THREE.BufferGeometry();
spGeo.setAttribute('position',new THREE.BufferAttribute(spP,3));
spGeo.setAttribute('color',   new THREE.BufferAttribute(spC,3));
spGeo.setAttribute('size',    new THREE.BufferAttribute(spS,1));
spGeo.setAttribute('phase',   new THREE.BufferAttribute(spPh,1));
const spMat=makeSparkMat(tSoft);
heartGroup.add(new THREE.Points(spGeo,spMat));

/* ══════════════════════════════════════════
   REALISTIC BACKGROUND GALAXY (Milky Way style)
   Lives at r=1200..2000 — far behind scene.
   Layers: deep stars · spiral arms · core · nebula clouds · distant galaxies
══════════════════════════════════════════ */

// ── deep field stars (dense, tiny, all colours) ──
const BG_N = 18000;
const bgP=new Float32Array(BG_N*3),bgC=new Float32Array(BG_N*3),bgS=new Float32Array(BG_N),bgPh=new Float32Array(BG_N);
// realistic star colours: hot blue-white, sun-yellow, cool red-orange
const STAR_COLS=['#b0c8ff','#ffffff','#fff4e0','#ffd090','#ff9060','#cce0ff','#e0f0ff'];
for(let i=0;i<BG_N;i++){
  const i3=i*3;
  const phi=Math.acos(R(-1,1)), th=R(0,TAU), r=R(600,2200);
  bgP[i3]  =r*Math.sin(phi)*Math.cos(th);
  bgP[i3+1]=r*Math.sin(phi)*Math.sin(th)*0.28; // flatten into a band = Milky Way plane
  bgP[i3+2]=r*Math.cos(phi);
  const sc=new THREE.Color(STAR_COLS[Math.floor(R(0,STAR_COLS.length))]);
  const br=R(.3,.9);
  bgC[i3]=sc.r*br; bgC[i3+1]=sc.g*br; bgC[i3+2]=sc.b*br;
  bgS[i]=R(.5,2.2);
  bgPh[i]=R(0,TAU);
}
const bgGeo=new THREE.BufferGeometry();
bgGeo.setAttribute('position',new THREE.BufferAttribute(bgP,3));
bgGeo.setAttribute('color',   new THREE.BufferAttribute(bgC,3));
bgGeo.setAttribute('size',    new THREE.BufferAttribute(bgS,1));
bgGeo.setAttribute('phase',   new THREE.BufferAttribute(bgPh,1));
const bgMat=makeStarMat(tWhite);
const bgStars=new THREE.Points(bgGeo,bgMat);
scene.add(bgStars);

// ── spiral arm stars (4 arms, realistic Milky Way colours) ──
const ARM_N = 22000;
const armP=new Float32Array(ARM_N*3),armC=new Float32Array(ARM_N*3),armS=new Float32Array(ARM_N),armPh=new Float32Array(ARM_N);
const ARM_COLS_INNER=['#ffe8c0','#ffd0a0','#ffeecc']; // warm core
const ARM_COLS_MID  =['#c8e0ff','#b0ccff','#ddeeff']; // blue-white arms
const ARM_COLS_OUTER=['#8ab4ff','#aaccff','#ffffff']; // blue OB stars at tips
for(let i=0;i<ARM_N;i++){
  const i3=i*3;
  const arm=Math.floor(R(0,4));
  const baseAngle=arm*(TAU/4);
  const t=Math.pow(Math.random(),0.7); // bias toward centre
  const r=R(180,900);
  const spin=r*0.0055; // logarithmic spiral
  const spread=R(-0.18,0.18)*Math.pow(r/200,0.6);
  const a=baseAngle+spin+spread;
  armP[i3]  =Math.cos(a)*r+R(-8,8);
  armP[i3+1]=R(-12,12)*Math.exp(-r/600); // thin disk
  armP[i3+2]=Math.sin(a)*r+R(-8,8);

  const dn=r/900;
  let sc;
  if(dn<0.3)      sc=new THREE.Color(ARM_COLS_INNER[Math.floor(R(0,3))]);
  else if(dn<0.65)sc=new THREE.Color(ARM_COLS_MID[Math.floor(R(0,3))]);
  else             sc=new THREE.Color(ARM_COLS_OUTER[Math.floor(R(0,3))]);
  const br=R(.25,.85)*(1-dn*0.4);
  armC[i3]=sc.r*br; armC[i3+1]=sc.g*br; armC[i3+2]=sc.b*br;
  armS[i]=R(.6,2.8)*(1-dn*0.3);
  armPh[i]=R(0,TAU);
}
const armGeo=new THREE.BufferGeometry();
armGeo.setAttribute('position',new THREE.BufferAttribute(armP,3));
armGeo.setAttribute('color',   new THREE.BufferAttribute(armC,3));
armGeo.setAttribute('size',    new THREE.BufferAttribute(armS,1));
armGeo.setAttribute('phase',   new THREE.BufferAttribute(armPh,1));
const armMat=makeStarMat(tWhite);
const bgArms=new THREE.Points(armGeo,armMat);
scene.add(bgArms);

// ── galactic core — bright yellow/orange bulge ──
const CORE2_N=6000;
const coreP2=new Float32Array(CORE2_N*3),coreC2=new Float32Array(CORE2_N*3),coreS2=new Float32Array(CORE2_N),corePh2=new Float32Array(CORE2_N);
for(let i=0;i<CORE2_N;i++){
  const i3=i*3;
  const phi=Math.acos(R(-1,1)), th=R(0,TAU);
  const r=Math.pow(Math.random(),2)*160; // very concentrated
  coreP2[i3]  =r*Math.sin(phi)*Math.cos(th);
  coreP2[i3+1]=r*Math.sin(phi)*Math.sin(th)*0.45;
  coreP2[i3+2]=r*Math.cos(phi);
  const warmIdx=Math.floor(R(0,3));
  const warmCols=['#ffe0a0','#ffd080','#fff0c0'];
  const sc=new THREE.Color(warmCols[warmIdx]);
  const br=R(.4,1.0)*(1-r/200);
  coreC2[i3]=Math.min(sc.r*br,1); coreC2[i3+1]=Math.min(sc.g*br,1); coreC2[i3+2]=Math.min(sc.b*br,1);
  coreS2[i]=R(1.5,5)*(1-r/180);
  corePh2[i]=R(0,TAU);
}
const coreGeo2=new THREE.BufferGeometry();
coreGeo2.setAttribute('position',new THREE.BufferAttribute(coreP2,3));
coreGeo2.setAttribute('color',   new THREE.BufferAttribute(coreC2,3));
coreGeo2.setAttribute('size',    new THREE.BufferAttribute(coreS2,1));
coreGeo2.setAttribute('phase',   new THREE.BufferAttribute(corePh2,1));
const coreMat2=makeGalaxyMat(glowTex('#ffdd88',64));
const bgCore=new THREE.Points(coreGeo2,coreMat2);
scene.add(bgCore);

// ── nebula dust clouds (blue + purple + faint red) ──
const NEB_N=5000;
const nebP=new Float32Array(NEB_N*3),nebC=new Float32Array(NEB_N*3),nebS=new Float32Array(NEB_N),nebPh=new Float32Array(NEB_N);
const NEB_COLS=['#1a2a6c','#2244aa','#6622aa','#aa2266','#224488','#113355','#330055'];
for(let i=0;i<NEB_N;i++){
  const i3=i*3;
  const arm=Math.floor(R(0,4));
  const baseA=arm*(TAU/4)+R(0.1,0.5); // offset from arm centre = inter-arm nebulae
  const r=R(100,700);
  const a=baseA+r*0.005+R(-0.4,0.4);
  nebP[i3]  =Math.cos(a)*r+R(-40,40);
  nebP[i3+1]=R(-20,20);
  nebP[i3+2]=Math.sin(a)*r+R(-40,40);
  const sc=new THREE.Color(NEB_COLS[Math.floor(R(0,NEB_COLS.length))]);
  const br=R(.05,.25);
  nebC[i3]=sc.r*br; nebC[i3+1]=sc.g*br; nebC[i3+2]=sc.b*br;
  nebS[i]=R(6,22); // large blobs = nebula feel
  nebPh[i]=R(0,TAU);
}
const nebGeo=new THREE.BufferGeometry();
nebGeo.setAttribute('position',new THREE.BufferAttribute(nebP,3));
nebGeo.setAttribute('color',   new THREE.BufferAttribute(nebC,3));
nebGeo.setAttribute('size',    new THREE.BufferAttribute(nebS,1));
nebGeo.setAttribute('phase',   new THREE.BufferAttribute(nebPh,1));
const nebMat=makeGalaxyMat(glowTex('#8855ff',128));
const bgNebula=new THREE.Points(nebGeo,nebMat);
scene.add(bgNebula);

// ── distant background galaxies (tiny smudges) ──
const DG_N=120;
const dgP=new Float32Array(DG_N*3),dgC=new Float32Array(DG_N*3),dgS=new Float32Array(DG_N);
for(let i=0;i<DG_N;i++){
  const i3=i*3;
  const phi=Math.acos(R(-1,1)), th=R(0,TAU), r=R(1500,2200);
  dgP[i3]=r*Math.sin(phi)*Math.cos(th);
  dgP[i3+1]=r*Math.sin(phi)*Math.sin(th);
  dgP[i3+2]=r*Math.cos(phi);
  const t=R(0,1);
  // elliptical=yellow, spiral=blue-white
  if(t<0.5){ dgC[i3]=R(.7,.9); dgC[i3+1]=R(.5,.7); dgC[i3+2]=R(.3,.5); }
  else      { dgC[i3]=R(.4,.7); dgC[i3+1]=R(.5,.8); dgC[i3+2]=R(.7,1); }
  dgS[i]=R(4,14);
}
const dgGeo=new THREE.BufferGeometry();
dgGeo.setAttribute('position',new THREE.BufferAttribute(dgP,3));
dgGeo.setAttribute('color',   new THREE.BufferAttribute(dgC,3));
dgGeo.setAttribute('size',    new THREE.BufferAttribute(dgS,1));
const dgMat=new THREE.PointsMaterial({vertexColors:true,transparent:true,opacity:.55,
  map:glowTex('#aabbff',64),depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
scene.add(new THREE.Points(dgGeo,dgMat));

// group all bg layers for unified slow rotation
const bgGalaxy=new THREE.Group();
bgGalaxy.add(bgStars,bgArms,bgCore,bgNebula);
// re-parent — remove from scene, add to group, add group
[bgStars,bgArms,bgCore,bgNebula].forEach(m=>{ scene.remove(m); bgGalaxy.add(m); });
// tilt like a real edge-on galaxy view
bgGalaxy.rotation.x=0.28;
bgGalaxy.rotation.z=0.12;
scene.add(bgGalaxy);

// ── twinkling foreground stars ──
const ST_N=6000;
const sP=new Float32Array(ST_N*3),sC=new Float32Array(ST_N*3);
const sS=new Float32Array(ST_N),sPh=new Float32Array(ST_N);
for(let i=0;i<ST_N;i++){
  const i3=i*3,phi=Math.acos(R(-1,1)),th=R(0,TAU),r=R(300,1000);
  sP[i3]=r*Math.sin(phi)*Math.cos(th);
  sP[i3+1]=r*Math.sin(phi)*Math.sin(th);
  sP[i3+2]=r*Math.cos(phi);
  const w=R(0,1);
  sC[i3]=R(.8,1); sC[i3+1]=R(.6,1)*w; sC[i3+2]=R(.7,1);
  sS[i]=R(.8,2.8); sPh[i]=R(0,TAU);
}
const sGeo=new THREE.BufferGeometry();
sGeo.setAttribute('position',new THREE.BufferAttribute(sP,3));
sGeo.setAttribute('color',   new THREE.BufferAttribute(sC,3));
sGeo.setAttribute('size',    new THREE.BufferAttribute(sS,1));
sGeo.setAttribute('phase',   new THREE.BufferAttribute(sPh,1));
const sMat=makeStarMat(tWhite);
scene.add(new THREE.Points(sGeo,sMat));

/* ══════════════════════════════════════════
   DOM — small "Mi Amor" ring around heart
══════════════════════════════════════════ */
const labelsEl=document.getElementById('labels');
const RING_MSGS=['💖 Mi Amor','✨ Te Amo','🌸 Mi Amor','💫 Te Amo'];
const ringEls=RING_MSGS.map(txt=>{
  const d=document.createElement('div');
  d.className='lbl'; d.textContent=txt;
  labelsEl.appendChild(d);
  return d;
});

function updateLabels(t){
  const W=innerWidth, H=innerHeight;
  const cx=W/2, cy=H/2-H*0.20;
  const rx=Math.min(W*.18,95), ry=Math.min(H*.08,50);
  const n=ringEls.length;
  ringEls.forEach((el,i)=>{
    const a=t*0.00042+i*(TAU/n);
    const x=cx+Math.cos(a)*rx;
    const y=cy+Math.sin(a)*ry;
    const depth=Math.sin(a)*.5+.5;
    const fs=Math.max(9,Math.min(13,W*.015))*(0.82+depth*.22);
    el.style.cssText=`font-size:${fs}px;opacity:${.4+depth*.6};transform:translate(${x-W/2}px,${y-H/2}px);`;
  });
}

/* ══════════════════════════════════════════
   CONTROLS — drag to rotate, pinch/scroll to zoom
══════════════════════════════════════════ */

// camera spherical coords — user controls these
let camTheta  = 0;       // horizontal angle (auto-orbit base)
let camPhi    = 0.62;    // vertical angle from top (radians, 0=top π=bottom)
let camRadius = 155;     // distance from target
const CAM_TARGET = new THREE.Vector3(0,8,0);

// smooth current values (lerped each frame)
let sCamTheta  = 0;
let sCamPhi    = 0.62;
let sCamRadius = 155;

const PHI_MIN    = 0.18;   // max look-down
const PHI_MAX    = 1.35;   // max look-up
const RADIUS_MIN = 40;
const RADIUS_MAX = 420;

// drag state
let dragging   = false;
let lastX      = 0, lastY = 0;
let autoOrbit  = true;  // resumes when user releases
let autoTimer  = null;

function startDrag(x,y){
  dragging=true; lastX=x; lastY=y;
  autoOrbit=false;
  clearTimeout(autoTimer);
}
function moveDrag(x,y){
  if(!dragging) return;
  const dx=x-lastX, dy=y-lastY;
  lastX=x; lastY=y;
  camTheta -= dx*0.006;
  camPhi   = Math.max(PHI_MIN, Math.min(PHI_MAX, camPhi + dy*0.006));
}
function endDrag(){
  dragging=false;
  // resume auto-orbit after 2 s of inactivity
  autoTimer=setTimeout(()=>{ autoOrbit=true; },2000);
}

// pinch-to-zoom state
let lastPinchDist=0;
function pinchDist(touches){
  const dx=touches[0].clientX-touches[1].clientX;
  const dy=touches[0].clientY-touches[1].clientY;
  return Math.sqrt(dx*dx+dy*dy);
}

// ── mouse ──
canvas.addEventListener('mousedown', e=>{ startDrag(e.clientX,e.clientY); });
window.addEventListener('mousemove',  e=>{ moveDrag(e.clientX,e.clientY); });
window.addEventListener('mouseup',    ()=>endDrag());

// mouse wheel zoom
window.addEventListener('wheel', e=>{
  e.preventDefault();
  camRadius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, camRadius + e.deltaY*0.25));
  autoOrbit=false;
  clearTimeout(autoTimer);
  autoTimer=setTimeout(()=>{ autoOrbit=true; },2000);
},{passive:false});

// ── touch ──
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  if(e.touches.length===1){
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  } else if(e.touches.length===2){
    dragging=false;
    lastPinchDist=pinchDist(e.touches);
  }
},{passive:false});

canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(e.touches.length===1){
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  } else if(e.touches.length===2){
    const dist=pinchDist(e.touches);
    const delta=lastPinchDist-dist;
    camRadius=Math.max(RADIUS_MIN,Math.min(RADIUS_MAX, camRadius+delta*0.55));
    lastPinchDist=dist;
  }
},{passive:false});

canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  if(e.touches.length===0) endDrag();
  else if(e.touches.length===1){
    // went from pinch back to single finger
    startDrag(e.touches[0].clientX,e.touches[0].clientY);
  }
},{passive:false});

/* ══════════════════════════════════════════
   ANIMATION LOOP
══════════════════════════════════════════ */
const clock=new THREE.Clock();
const allMats=[diskMat,haloMat,hMat,coreMat,spMat,sMat,bgMat,armMat,coreMat2,nebMat];

function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  const LERP=0.08;

  // auto-orbit slowly advances theta when user isn't dragging
  if(autoOrbit) camTheta+=0.00042;

  // smooth lerp current → target
  sCamTheta  += (camTheta  - sCamTheta ) * LERP;
  sCamPhi    += (camPhi    - sCamPhi   ) * LERP;
  sCamRadius += (camRadius - sCamRadius) * LERP;

  // spherical → cartesian
  camera.position.x = sCamRadius * Math.sin(sCamPhi) * Math.sin(sCamTheta);
  camera.position.y = sCamRadius * Math.cos(sCamPhi);
  camera.position.z = sCamRadius * Math.sin(sCamPhi) * Math.cos(sCamTheta);
  camera.lookAt(CAM_TARGET);

  // disk spins
  diskMesh.rotation.y = t*0.028;
  haloMesh.rotation.y = t*0.022;

  // cosmic ring rotates slowly
  ringGroup.rotation.y = t*0.045;

  // background galaxy drifts very slowly
  bgGalaxy.rotation.y = t*0.004;

  // heart floats
  heartGroup.position.y = 52+Math.sin(t*0.72)*2.8;

  allMats.forEach(m=>m.uniforms.uTime.value=t);
  updateLabels(t*1000);
  renderer.render(scene,camera);
}

animate();
