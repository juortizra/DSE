import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cases,estimate,suggest} from '../rules.js';
test('Los tres escenarios tienen cinco anchos y reglas coherentes',()=>{
 cases.forEach((c,i)=>{assert.equal(c.widths.length,5);assert.equal(suggest(c),i);});
});
test('El colapso prima sobre otros indicios',()=>{assert.equal(suggest({collapse:true,local:false}),2);});
test('La distancia limita la resolución de fisuras',()=>{
 assert.equal(estimate(.6,1.2).detected,true);
 assert.equal(estimate(.6,4).detected,false);
 assert.ok(estimate(.6,4).error>estimate(.6,1.2).error);
});
test('Las grietas anchas son resolubles y tienen margen no nulo',()=>{
 for(const w of cases[2].widths){const e=estimate(w,3);assert.ok(e.detected);assert.ok(e.error>0);assert.ok(Math.abs(e.estimated-w)<=e.error);}
});
