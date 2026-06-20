const fs=require('fs');const {JSDOM}=require('jsdom');
let html=fs.readFileSync('among-us copy.html','utf8');
html=html.replace('let dropshipCountdownFrames = 0;','let dropshipCountdownFrames = 0;\n window.__setMap=function(m){selectedMap=m;};window.__startCountdown=function(){dropshipCountdown=1;dropshipCountdownFrames=1;};');
// inject a test rebuild that uses a custom clearance hitbox, then flood-reach from player spawn
html=html.replace('function findSafeSpawn(x, y, w, h, avoid) {',
 'window.__reachAt=function(cw,ch){var g=new Uint8Array(gridW*gridH);var open=new Uint8Array(gridW*gridH);for(var gy=0;gy<gridH;gy++)for(var gx=0;gx<gridW;gx++){var cx=(gx+0.5)*GRID_SIZE,cy=(gy+0.5)*GRID_SIZE;if(cx<22||cy<22||cx>MAP_W-22||cy>MAP_H-22)continue;if(!isBlockedAt(cx-cw/2,cy-ch/2,cw,ch))open[gy*gridW+gx]=1;}'+
 'var flrs=mapTheme.floors,stack=[];if(flrs&&flrs.length){for(var gy2=0;gy2<gridH;gy2++)for(var gx2=0;gx2<gridW;gx2++){if(!open[gy2*gridW+gx2])continue;var cx2=(gx2+0.5)*GRID_SIZE,cy2=(gy2+0.5)*GRID_SIZE;for(var f of flrs){if(cx2>=f.x&&cx2<f.x+f.w&&cy2>=f.y&&cy2<f.y+f.h){g[gy2*gridW+gx2]=1;stack.push(gy2*gridW+gx2);break;}}}}'+
 'var DX=[0,0,-1,1],DY=[-1,1,0,0];while(stack.length){var c=stack.pop(),cx3=c%gridW,cy3=(c/gridW)|0;for(var dd=0;dd<4;dd++){var nx=cx3+DX[dd],ny=cy3+DY[dd];if(nx<0||nx>=gridW||ny<0||ny>=gridH)continue;var ni=ny*gridW+nx;if(g[ni]||!open[ni])continue;g[ni]=1;stack.push(ni);}}'+
 // flood reachable from spawn over g
 'var seen=new Uint8Array(gridW*gridH);var sgx=Math.floor((player.x+20)/GRID_SIZE),sgy=Math.floor((player.y+25)/GRID_SIZE);var start=-1;outer:for(var r=0;r<12;r++){for(var oy=-r;oy<=r;oy++)for(var ox=-r;ox<=r;ox++){var gx4=sgx+ox,gy4=sgy+oy;if(gx4<0||gx4>=gridW||gy4<0||gy4>=gridH)continue;if(g[gy4*gridW+gx4]){start=gy4*gridW+gx4;break outer;}}}'+
 'if(start<0)return{reachTasks:0,total:taskLocations.length};var st=[start];seen[start]=1;var DX2=[0,0,-1,1,-1,1,-1,1],DY2=[-1,1,0,0,-1,-1,1,1];while(st.length){var c2=st.pop(),cx5=c2%gridW,cy5=(c2/gridW)|0;for(var d2=0;d2<8;d2++){var nx2=cx5+DX2[d2],ny2=cy5+DY2[d2];if(nx2<0||nx2>=gridW||ny2<0||ny2>=gridH)continue;var ni2=ny2*gridW+nx2;if(seen[ni2]||!g[ni2])continue;if(d2>=4){if(!g[cy5*gridW+nx2]||!g[ny2*gridW+cx5])continue;}seen[ni2]=1;st.push(ni2);}}'+
 'function re(wx,wy){var gx6=Math.max(0,Math.min(gridW-1,Math.floor(wx/GRID_SIZE))),gy6=Math.max(0,Math.min(gridH-1,Math.floor(wy/GRID_SIZE)));for(var r=0;r<6;r++){for(var oy=-r;oy<=r;oy++)for(var ox=-r;ox<=r;ox++){var x=gx6+ox,y=gy6+oy;if(x<0||x>=gridW||y<0||y>=gridH)continue;if(seen[y*gridW+x])return true;}}return false;}'+
 'var bad=taskLocations.filter(t=>!re(t.x,t.y)).length;return{reachTasks:taskLocations.length-bad,total:taskLocations.length,unreachable:bad};};'+
 ' function findSafeSpawn(x, y, w, h, avoid) {');
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
  const sizes=[[26,34],[32,40],[36,44],[40,48],[44,52]];
  for(const mp of ['skeld','polus','airship','fungle','mira']){
    w.__setMap(mp);try{d.getElementById('restartBtn').click();}catch(e){}flush(3);w.__startCountdown();flush(3);
    let line=mp.padEnd(8)+': ';
    for(const [cw,ch] of sizes){const r=w.__reachAt(cw,ch);line+=cw+'x'+ch+'=>'+(r.total-r.unreachable)+'/'+r.total+'  ';}
    console.log(line);
  }
  process.exit(0);
},500);
