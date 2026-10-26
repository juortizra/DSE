import {CONFIG as C} from './config.js';
export const focalPixels=(width=C.camera.width,hfov=C.camera.hfovDeg)=>(width/2)/Math.tan(hfov*Math.PI/360);
export function scaleMmPerPixel(distanceMm,angleDeg=0){return distanceMm*Math.cos(angleDeg*Math.PI/180)/focalPixels();}
export function measureCrack({pixels,laser,angleDeg=0,pixelError=C.measurement.pixelError,angleErrorDeg=C.imu.attitudeErrorDeg}){
 if(!laser.valid||!Number.isFinite(laser.mm))return {measurable:false,reason:'Láser inválido; no se estima ancho.'};
 if(!Number.isFinite(pixels)||pixels<C.measurement.minPixels)return {measurable:false,reason:`Menos de ${C.measurement.minPixels} píxeles: no medible.`,minWidthMm:C.measurement.minPixels*scaleMmPerPixel(laser.mm,angleDeg)};
 if(Math.abs(angleDeg)>=90)return {measurable:false,reason:'Ángulo no válido.'};
 const a=angleDeg*Math.PI/180,fx=focalPixels(),mmPerPixel=scaleMmPerPixel(laser.mm,angleDeg),widthMm=pixels*mmPerPixel;
 const laserError=laser.errorMm??(C.laser.relativeError*laser.mm+C.laser.absoluteErrorMm);
 const errorLaser=pixels*Math.cos(a)/fx*laserError,errorPixels=mmPerPixel*pixelError,errorAngle=pixels*laser.mm*Math.sin(a)/fx*angleErrorDeg*Math.PI/180;
 return {measurable:true,pixels,fx,perpendicularMm:laser.mm*Math.cos(a),mmPerPixel,widthMm,uncertaintyMm:Math.hypot(errorLaser,errorPixels,errorAngle),components:{laser:errorLaser,pixels:errorPixels,angle:errorAngle},minWidthMm:C.measurement.minPixels*mmPerPixel};
}
// Solo el detector sintético usa esta proyección de la verdad; nunca se usa el ancho real en measureCrack.
export function oraclePixels(truth){return truth.widthMm/scaleMmPerPixel(truth.distanceMm,truth.angleDeg);}
