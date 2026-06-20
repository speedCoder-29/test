const fs=require('fs');const {JSDOM}=require('jsdom');
let html=fs.readFileSync('among-us copy.html','utf8');
html=html.replace('let dropshipCountdownFrames = 0;','let dropshipCountdownFrames = 0;\n window.__setMap=function(m){selectedMap=m;};window.__startCountdown=function(){dropshipCountdown=1;dropshipCountdownFrames=1;};window.__forceRole=function(r){gameSettings.forcedPlayerRole=r;};');
html=html.replace('function findSafeSpawn(x, y, w, h, avoid) {',
 'window.__gaps=function(){return npcs.filter(n=>n.alive).map(n=>{for(var m=0;m<=8;m++){if(isBlockedAt(n.x-m,n.y-m,n.w+2*m,n.h+2*m))return m;}return 9;});};'+
 'window.__over=function(){return gameOver;};'+
 ' function findSafeSpawn(x, y, w, h, avoid) {');
function ctx(){return new Proxy({},{get(t,p){if(p==='canvas')return{width:1280,height:720};if(p==='measureText')return()=>({width:10});if(p==='createRadialGradient'||p==='createLinearGradient')return()=>({addColorStop(){}});if(p==='createPattern')return()=>({});if(p==='getImageData')return()=>({data:new Uint8ClampedArray(4)});if(typeof p==='string')return()=>{};return undefined;},set(){return true;}});}
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
w.HTMLCanvasElement.prototype.getContext=function(){return ctx();};w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1280,height:720,right:1280,bottom:720};};
w.__rafQ=[];w.requestAnimationFrame=cb=>{w.__rafQ.push(cb);return 1;};w.cancelAnimationFrame=()=>{};
const s=(k,v)=>{try{w[k]=v;}catch(e){try{Object.defineProperty(w,k,{value:v,configurable:true});}catch(e2){}}};
s('AudioContext',function(){return new Proxy({},{get:()=>()=>({connect(){},start(){},stop(){},gain:{},frequency:{setValueAtTime(){}}})});});s('webkitAudioContext',w.AudioContext);s('fetch',()=>Promise.reject(0));s('alert',()=>{});s('scrollTo',()=>{});
w.console.error=(...a)=>errs.push(a.join(' '));w.onerror=(m)=>errs.push('e:'+m);}});
const w=dom.window,d=w.document;
function flush(n){for(let i=0;i<n;i++){const q=w.__rafQ;w.__rafQ=[];for(const cb of q){try{cb(i*16);}catch(e){errs.push('raf:'+(e.message||'').slice(0,80));}}}}
setTimeout(()=>{
  d.getElementById('startBtn').click();
  const hist={};let samples=0,touch=0,close=0;
  for(const mp of ['skeld','polus','airship']){
    w.__setMap(mp);w.__forceRole('crewmate');try{d.getElementById('restartBtn').click();}catch(e){}flush(3);w.__startCountdown();flush(3);
    for(let c=0;c<30;c++){ flush(40); if(w.__over())break; const g=w.__gaps(); g.forEach(v=>{hist[v]=(hist[v]||0)+1;samples++;if(v===0)touch++;if(v<3)close++;}); }
  }
  console.log('samples:',samples);
  console.log('NPC-frames TOUCHING wall (gap=0):',touch,'('+(100*touch/samples).toFixed(1)+'%)');
  console.log('NPC-frames within <3px of wall:',close,'('+(100*close/samples).toFixed(1)+'%)');
  console.log('gap histogram (px->count):',JSON.stringify(hist));
  console.log('errors:',errs.length);
  process.exit(0);
},500);
