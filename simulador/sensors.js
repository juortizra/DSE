import {CONFIG as C} from './config.js';
const radians=x=>x*Math.PI/180;
export function laserReading(hits,{sun=false,random=Math.random}={}){
 const sorted=hits.filter(h=>Number.isFinite(h.distanceMm)).sort((a,b)=>a.distanceMm-b.distanceMm),h=sorted[0];
 let reason=!h?'Sin retorno':h.glass?'Vidrio':h.reflectance<C.laser.darkThreshold?'Superficie muy oscura':h.reflectance>C.laser.brightThreshold?'Superficie brillante':h.distanceMm<C.laser.minMm||h.distanceMm>C.laser.maxMm?'Fuera de rango':sun&&random()<C.laser.sunInvalidChance?'Interferencia de pleno sol':'';
 if(reason)return {valid:false,mm:null,errorMm:null,reason};
 const errorMm=(h.distanceMm*C.laser.relativeError+C.laser.absoluteErrorMm)*(sun?C.laser.sunErrorMultiplier:1);
 return {valid:true,mm:h.distanceMm+(random()*2-1)*errorMm,errorMm,reason:''};
}
export function samplePacket({timeMs,elapsedSeconds,calibrated,pitchDeg,rollDeg,yawDeg,battery,hits,sun=false,random=Math.random}){
 const n=()=> (random()*2-1)*C.imu.attitudeErrorDeg;
 return {timeMs,laser:{...laserReading(hits,{sun,random}),timeMs},imu:{timeMs,pitchDeg:pitchDeg+n(),rollDeg:rollDeg+n(),yawDeg:yawDeg+elapsedSeconds/60*(calibrated?C.imu.calibratedDriftDegMinute:C.imu.uncalibratedDriftDegMinute),calibrated},battery:{timeMs,percent:battery}};
}
export function batteryDrain(dt,speed,light,factor=1){return dt*100/(C.battery.flightSeconds*factor)*(1+C.battery.speedConsumption*(speed/C.flight.maxSpeed)**2+(light?C.battery.lampConsumption:0));}
