import {test} from 'node:test';import assert from 'node:assert/strict';import {CONFIG as C} from '../config.js';import {SimulatedDetector} from '../detector.js';import {evaluateAgent} from '../agent.js';import {samplePacket} from '../sensors.js';
for(let level=0;level<C.scenarios.length;level++)test(`Nivel ${level}: buenas fotos -> veredicto esperado; malas -> INDETERMINADO`,async()=>{
 const scenario=C.scenarios[level],detector=new SimulatedDetector(()=>.5),results=[],bad=[];
 for(let i=0;i<scenario.widths.length;i++){
  const sensors=samplePacket({timeMs:100+i,elapsedSeconds:0,calibrated:true,pitchDeg:0,rollDeg:0,yawDeg:0,battery:90,hits:[{distanceMm:70,reflectance:.4}],random:()=>.5});sensors.imu.wallAngleDeg=0;
  const photo={id:i+1,point:i,quality:{accepted:true,score:95},sensors,inside:i>=4};const gt={widthMm:scenario.widths[i],distanceMm:70,angleDeg:0};results.push(await detector.detect(photo,gt,scenario));bad.push(await detector.detect({...photo,quality:{accepted:false,score:30}},gt,scenario));
 }
 const required=scenario.widths.map((_,i)=>i);assert.equal(evaluateAgent({required,results}).verdict,scenario.expected);assert.equal(evaluateAgent({required,results:bad}).label,'INDETERMINADO');
});
