// Reglas didácticas inventadas para estos escenarios. NO son criterios oficiales.
export const cases=[
 {label:'Verde',use:'Uso permitido (escenario educativo)',widths:[.2,.35,.5,.3],local:false,collapse:false,explanation:'Fisuras superficiales sin daño estructural localizado ni pérdida de estabilidad modelada. Un ancho pequeño por sí solo no demuestra seguridad.'},
 {label:'Amarillo',use:'Uso restringido; requiere evaluación detallada',widths:[2.1,2.7,3,2.4],local:true,collapse:false,explanation:'Existe daño localizado en una columna. Aunque no hay colapso modelado, se necesita evaluación detallada. Los anchos no bastan para autorizar el uso.'},
 {label:'Rojo',use:'Peligro de colapso; no ingresar',widths:[14,18,11,22],local:true,collapse:true,explanation:'Hay colapso parcial e inclinación global. La inestabilidad tiene prioridad sobre cualquier medición individual de grietas.'}
];
export function estimate(width,distance){const pixelMM=2*distance*1000*Math.tan(65*Math.PI/360)/1080;const error=Math.max(.12,pixelMM*.6,width*.12);const detected=width/pixelMM>=.65;return {detected,error,estimated:detected?Math.max(0,width+Math.sin(distance*3)*error*.35):null,pixelMM};}
export function suggest(evidence){return evidence.collapse?2:evidence.local?1:0;}
