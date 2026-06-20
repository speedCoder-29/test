const fs=require('fs');const {JSDOM}=require('jsdom');
let html=fs.readFileSync('among-us copy.html','utf8');
html=html.replace('let dropshipCountdownFrames = 0;','let dropshipCountdownFrames = 0;\n window.__setMap=function(m){selectedMap=m;};');
html=html.replace('function isBlockedAt(nx, ny, ew, eh) {',
 'window.__bruteBlocked=function(nx,ny,ew,eh){for(const w of walls){if(nx<w.x+w.w&&nx+ew>w.x&&ny<w.y+w.h&&ny+eh>w.y)return true;}for(const d of doors){if(d.closed&&nx<d.x+d.w&&nx+ew>d.x&&ny<d.y+d.h&&ny+eh>d.y)return true;}return false;};'+
 'window.__fastBlocked=function(nx,ny,ew,eh){return isBlockedAt(nx,ny,ew,eh);};'+
 'window.__mapInfo=function(){return {W:MAP_W,H:MAP_H,walls:walls.length,wallCells:_wallCells?_wallCells.length:0};};'+
 ' function isBlockedAt(nx, ny, ew, eh) {');
function ctx(){return new Proxy({},{get(t,p){if(p==='canvas')return{width:1280,height:720};if(p==='measureText')return()=>({width:10});if(p==='createRadialGradient'||p==='createLinearGradient')return()=>({addColorStop(){}});if(p==='createPattern')return()=>({});if(p==='getImageData')return()=>({data:new Uint8ClampedArray(4)});if(typeof p==='string')return()=>{};return undefined;},set(){return true;}});}
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
w.HTMLCanvasElement.prototype.getContext=function(){return ctx();};w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1280,height:720,right:1280,bottom:720};};
w.__rafQ=[];w.requestAnimationFrame=cb=>{w.__rafQ.push(cb);return 1;};w.cancelAnimationFrame=()=>{};
const s=(k,v)=>{try{w[k]=v;}catch(e){try{Object.defineProperty(w,k,{value:v,configurable:true});}catch(e2){}}};
s('AudioContext',function(){return new Proxy({},{get:()=>()=>({connect(){},start(){},stop(){},gain:{},frequency:{setValueAtTime(){}}})});});s('webkitAudioContext',w.AudioContext);s('fetch',()=>Promise.reject(0));s('alert',()=>{});s('scrollTo',()=>{});
w.console.error=()=>{};w.onerror=()=>{};}});
const w=dom.window,d=w.document;
function flush(n){for(let i=0;i<n;i++){const q=w.__rafQ;w.__rafQ=[];for(const cb of q){try{cb(i*16);}catch(e){}}}}
setTimeout(()=>{
  d.getElementById('startBtn').click();
  let totalMismatch=0;
  for(const mp of ['skeld','polus','airship','fungle','mira']){
    w.__setMap(mp);try{d.getElementById('restartBtn').click();}catch(e){}flush(2);
    const info=w.__mapInfo();
    let mism=0,N=40000;
    for(let i=0;i<N;i++){
      const nx=Math.random()*info.W-40, ny=Math.random()*info.H-40;
      const ew=20+Math.random()*40, eh=20+Math.random()*50;
      if(w.__fastBlocked(nx,ny,ew,eh)!==w.__bruteBlocked(nx,ny,ew,eh)) mism++;
    }
    totalMismatch+=mism;
    console.log(mp+': walls='+info.walls+' cells='+info.wallCells+'  mismatches over '+N+' random queries: '+mism);
  }
  console.log('\nTOTAL isBlockedAt mismatches:',totalMismatch,totalMismatch===0?'(PERFECT — identical behavior)':'(BUG!)');
  process.exit(0);
},500);
