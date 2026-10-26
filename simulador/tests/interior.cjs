const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    headless: true,
  });
  const p = await b.newPage({
    serviceWorkers: "block",
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/app.js", async (r) => {
    const res = await r.fetch();
    await r.fulfill({
      response: res,
      body:
        (await res.text()) +
        `\nwindow.it={start,state:()=>({active,reason:finishReason,points:points.length}),tour(){paused=true;clearKeys();const {W,fz,bz}=environment.dimensions,door=-W/2+((level===2?1:Math.floor((level===0?3:4)/2))+.5)*W/(level===0?3:4);const paths=[[door,1.3,2],[door,1.3,fz-1.5],[.65,1.5,fz-2],[.65,1.5,bz+1],[.65,1.5,fz-1.7],[W/2-1.7,1.5,fz-1.7],[W/2-1.7,4.5,fz-1.7],[W/2-1.7,4.5,bz+1],[.65,4.5,bz+1]];const results=[];for(const target of paths){for(let i=0;i<2400;i++){const diff=new T.Vector3(...target).sub(rig.position);if(diff.length()<.1){velocity.set(0,0,0);break;}const step=diff.normalize().multiplyScalar(.035);const next=rig.position.clone().add(step);if(bounds.some(b=>b.containsPoint(next)))throw Error('Ruta bloqueada en '+JSON.stringify(next)+' hacia '+JSON.stringify(target));rig.position.copy(next);}results.push(rig.position.toArray());}return results;},dark(){const i=points.findIndex(p=>p.inside);chosen=i;const pt=points[i];rig.position.copy(pt.position).addScaledVector(pt.normal,.85);yaw=0;pitch=bank=tilt=0;camera.rotation.set(0,0,0);rig.rotation.set(0,0,0);velocity.set(0,0,0);lightOn=false;scene.updateMatrixWorld(true);const dark=quality();lightOn=true;return {dark,lit:quality()};},hit(strong){active=true;paused=false;clearKeys();const y=1.3;rig.position.set(-environment.dimensions.W/2+.25,y,environment.dimensions.fz+1);rig.rotation.set(0,0,0);velocity.set(0,0,strong?-2.4:-.6);keys.KeyW=true;for(let i=0;i<80&&active;i++)move(.02);clearKeys();return {active,reason:finishReason};},physicalEntrance(){start(level);paused=true;const {W,fz}=environment.dimensions;const bays=level===0?3:4,door=-W/2+((level===2?1:Math.floor(bays/2))+.5)*W/bays;rig.position.set(door,1.3,fz+1);velocity.set(0,0,0);keys.KeyW=true;for(let i=0;i<90&&active;i++)move(.02);clearKeys();velocity.set(0,0,0);return {inside:environment.indoor(rig.position),active,pos:rig.position.toArray()};}};`,
    });
  });
  for (let l = 0; l < 3; l++) {
    await p.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
    await p.evaluate((l) => it.start(l), l);
    assert.equal((await p.evaluate(() => it.state())).points, 7);
    console.log(
      "Route",
      l,
      (await p.evaluate(() => it.tour())).length,
      "waypoints",
    );
    const q = await p.evaluate(() => it.dark());
    assert.equal(q.dark.accepted, false);
    assert.ok(q.dark.reasons.some((r) => r.includes("oscuro")));
    assert.equal(q.lit.accepted, true, JSON.stringify(q.lit));
    const entrance = await p.evaluate(() => it.physicalEntrance());
    assert.equal(entrance.inside, true, JSON.stringify(entrance));
    assert.equal(entrance.active, true);
    console.log(
      "PASS interior",
      l,
      "entrada física + ruta al piso 2 + rechazo oscuridad + aceptación con luz",
    );
  }
  await p.evaluate(() => it.start(0));
  const crash = await p.evaluate(() => it.hit(true));
  assert.equal(crash.active, false, JSON.stringify(crash));
  assert.match(crash.reason, /Choque fuerte/);
  console.log("PASS choque fuerte");
  assert.deepEqual(errors, []);
  await b.close();
})();
