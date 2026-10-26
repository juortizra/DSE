// ÚNICA fuente de parámetros de diseño nuevos. No son especificaciones certificadas.
// [VERIFICAR] = contrastar en el prototipo y/o con el evaluador responsable.
export const CONFIG = {
  camera: { width:1280,height:720,hfovDeg:82,shutterMs:150,jpegQuality:.78,noiseAmplitude:5,exposureVariation:.08,blurPxPerMps:3,offsetM:.15, note:'[VERIFICAR] resolución, HFOV, desfase cámara-láser, obturador, ruido, exposición y compresión' },
  laser: { minMm:50,maxMm:1200,relativeError:.03,absoluteErrorMm:3,hz:25,coneDeg:25,coneRings:2,raysPerRing:12,darkThreshold:.08,brightThreshold:.92,sunInvalidChance:.12,sunErrorMultiplier:2,note:'[VERIFICAR] rango, error, tasa, cono, respuesta a vidrio/reflectancia y sol; cono discretizado, no óptica real' },
  imu: { attitudeErrorDeg:.5,calibratedDriftDegMinute:.5,uncalibratedDriftDegMinute:2,calibrationSeconds:3,note:'[VERIFICAR] errores y deriva MPU6050 sin magnetómetro' },
  battery: { flightSeconds:480,speedConsumption:.35,lampConsumption:.08,warnings:[25,15],descentMps:.45,note:'[VERIFICAR] autonomía, consumo y comportamiento ante agotamiento' },
  sd: {capacity:60,note:'[VERIFICAR] límite didáctico de fotos, no capacidad física de la tarjeta'},
  flight: {maxSpeed:2.4,collisionRadius:.18,crashSpeed:1.7,stabilizeRate:3.5,impactMs:1500,landRadius:1.7,landHeight:.75,landSpeed:.3,dtMax:.05,zone:{minX:-28,maxX:28,minZ:-28,maxZ:30},note:'[VERIFICAR] dinámica y límites simplificados'},
  quality: {minDistanceM:.05,maxDistanceM:1.2,angleDeg:25,maxSpeed:.35,minLight:.25,accepted:60,roiHalfWidthM:.012,roiHalfHeightM:.014,markerRadiusM:.025,note:'[VERIFICAR] calidad orientativa sobre un segmento de grieta, no grieta completa'},
  measurement:{minPixels:2,pixelError:.5,note:'[VERIFICAR] umbral de resolución y error de segmentación; incertidumbres como cotas RSS, no intervalo de confianza calibrado'},
  ground:{width:320,height:240,minProcessMs:500,maxProcessMs:2000,note:'[VERIFICAR] tiempos ilustrativos Pi Zero 2 W, no benchmark'},
  detector:{falsePositiveRate:.08,falseNegativePoorRate:.25,pixelPerturbation:.15,note:'[VERIFICAR] tasas ficticias, no precisión de un modelo validado'},
  agent:{tiltYellowDeg:.5,tiltRedDeg:1,crackYellowMm:1,crackSevereMm:5,severeElementsRed:3,note:'[VERIFICAR] umbrales de ejemplo NO oficiales; validar con evaluador certificado'},
  disagreementReasons:['La evidencia fotográfica es insuficiente','La amenaza externa exige mayor precaución','El daño parece localizado, no extendido','Posible falso positivo: sombra o mancha','Otro juicio educativo; requiere revisión profesional'],
  score:{decision:45,photo:25,efficiency:15,safety:15,overOne:30,overTwo:20,underOne:10,contactPenalty:.2,boundaryPenalty:.25,note:'[VERIFICAR] rúbrica educativa'},
  difficulties:{aprendiz:{label:'Aprendiz',batteryFactor:1.5,windMps:0},normal:{label:'Normal',batteryFactor:1,windMps:.08},experto:{label:'Experto',batteryFactor:.75,windMps:.3}},
  tutorial:{seconds:120,stepSeconds:30,note:'[VERIFICAR] duración objetivo, no evaluación de aprendizaje'},
  quake:{atSeconds:45,durationSeconds:4,shakeRad:.025,debrisCount:8,note:'[VERIFICAR] evento didáctico, no modelo sísmico'},
  audio:{humHz:95,speedHz:35,gain:.018,alertHz:620,note:'[VERIFICAR] sonido ilustrativo'},
  scenarios:[{expected:0,tiltDeg:.1,collapse:false,softCollapse:false,threat:'ninguna',widths:[.2,.35,.5,.3,.3,.4,.25]}, {expected:1,tiltDeg:.6,collapse:false,softCollapse:false,threat:'externa',widths:[2.1,2.7,3,2.4,2.6,2.3,2.9]}, {expected:2,tiltDeg:1.5,collapse:true,softCollapse:true,threat:'inminente',widths:[14,18,11,22,12,16,21]}],
  scenariosNote:'[VERIFICAR] verdades de terreno ficticias y observaciones estructurales sintéticas; no diagnósticos reales',
};
export const VFOV = 2*Math.atan(Math.tan(CONFIG.camera.hfovDeg*Math.PI/360)*CONFIG.camera.height/CONFIG.camera.width)*180/Math.PI;
