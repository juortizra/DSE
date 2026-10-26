// WebXR progresivo. Las escenas del operador y del dron son independientes.
export function createXR(T, renderer, flight, droneCamera, api) {
 let session=null,mode=null,root=null,view=null,screen=null,target=null,hit=null,table=null,model=null,mini=null,unit=null,sd=null,grabbing=null,scaleStart=null,visible=true,immersive=false,elapsed=0,flash=0,carrier=null,mask=null,unitCanvas=null,unitTexture=null,hadController=false,lastFocus=true;
 let owned=[],listeners=[],pressed=new Map(),grips=[];
 const own=o=>{owned.push(o);return o;};
 const bind=(o,e,f)=>{o.addEventListener(e,f);listeners.push(()=>o.removeEventListener(e,f));};
 const box=(w,h,d,color)=>new T.Mesh(own(new T.BoxGeometry(w,h,d)),own(new T.MeshStandardMaterial({color})));
 const requestOptions=[{optionalFeatures:['local-floor','hit-test','anchors','hand-tracking','dom-overlay'],domOverlay:{root:document.body}},{optionalFeatures:['local-floor']},{}];
 async function supported(){for(const [id,m] of [['xr','immersive-vr'],['mr','immersive-ar']]){const b=document.getElementById(id);b.hidden=true;try{b.hidden=!(await navigator.xr?.isSessionSupported(m));}catch{} } if(!navigator.xr)document.getElementById('xrStatus').textContent='WebXR no disponible: juega normalmente en pantalla.';}
 function dispose(){hit?.cancel();hit=null;listeners.splice(0).forEach(f=>f());grips.forEach(g=>g.removeFromParent());grips=[];root?.clear();view?.parent?.remove(view);carrier?.removeFromParent();mask?.removeFromParent();target?.dispose();owned.splice(0).forEach(o=>o.dispose());owned=[];pressed.clear();grabbing=null;scaleStart=null;session=null;mode=null;api.mode(null);api.input({});api.clear();api.message('Sesión XR finalizada. Continúa en pantalla.');document.getElementById('exitXR').hidden=true;document.getElementById('insertSD').hidden=true;}
 async function enter(m){if(session)return;let created=null;try{
 for(const options of requestOptions){try{created=await navigator.xr.requestSession(m,options);break;}catch(e){if(e.name==='NotAllowedError'||e.name==='SecurityError')throw e;}}
 if(!created)throw Error('No se pudo iniciar ni con características mínimas.');
 session=created;mode=m;document.exitPointerLock?.();api.clear();api.mode(m);root=new T.Scene();root.background=m==='immersive-ar'?null:new T.Color('#18232b');root.add(new T.HemisphereLight(0xffffff,0x555555,3));view=new T.PerspectiveCamera(60,1,.02,200);root.add(view);
 target=new T.WebGLRenderTarget(960,540);screen=new T.Mesh(own(new T.PlaneGeometry(1.2,.675)),own(new T.MeshBasicMaterial({map:target.texture})));screen.position.set(0,-.05,-1.5);root.add(screen);
 if(m==='immersive-ar'){
 table=new T.Group();table.position.set(0,-.8,-1.2);root.add(table);model=api.world().clone(true);model.scale.setScalar(1/60);table.add(model);mini=box(.5,.18,.5,0xffd350);model.add(mini);
 unit=box(.22,.12,.13,0x276e65);unit.position.set(.48,.06,0);table.add(unit);sd=box(.05,.004,.035,0xffd350);sd.position.set(.65,.03,0);table.add(sd);
 unitCanvas=document.createElement('canvas');unitCanvas.width=320;unitCanvas.height=240;unitTexture=own(new T.CanvasTexture(unitCanvas));const display=new T.Mesh(own(new T.PlaneGeometry(.18,.1)),own(new T.MeshBasicMaterial({map:unitTexture})));display.rotation.x=-Math.PI/2;display.position.set(.48,.122,0);table.add(display);
 screen.scale.setScalar(.35);screen.position.set(.48,.22,-1.2);
 }
 carrier=new T.Group();flight.add(carrier);mask=new T.Mesh(own(new T.PlaneGeometry(2,2)),own(new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{amount:{value:0},black:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 v;uniform float amount;uniform float black;void main(){float a=max(black,smoothstep(.35,.95,length(v-.5)*2.)*amount);gl_FragColor=vec4(0.,0.,0.,a);}'})));mask.frustumCulled=false;mask.renderOrder=10000;
 renderer.xr.setReferenceSpaceType('local');bind(session,'end',dispose);bind(session,'visibilitychange',()=>{visible=session.visibilityState==='visible';api.clear();});
 await renderer.xr.setSession(session);
 if(m==='immersive-ar'&&session.requestHitTestSource){try{hit=await session.requestHitTestSource({space:await session.requestReferenceSpace('viewer')});}catch{api.message('Sin detección de mesa: maqueta delante, a altura estimada de 80 cm.');}}
 for(let i=0;i<2;i++){const g=renderer.xr.getControllerGrip(i),c=renderer.xr.getController(i);root.add(g,c);grips.push(g,c);const handle=box(.035,.035,.1,0xf2d16b);g.add(handle);
 bind(c,'selectstart',()=>{if(mode==='immersive-ar'&&api.awaitingSD()){api.insert();return;}api.photo();});
 bind(c,'squeezestart',()=>{if(mode!=='immersive-ar')return;const pos=g.getWorldPosition(new T.Vector3());if(pos.distanceTo(sd.getWorldPosition(new T.Vector3()))<.18){grabbing={type:'sd',g};g.attach(sd);}else if(pos.distanceTo(table.position)<1.5){grabbing={type:'table',g,offset:table.position.clone().sub(pos)};}});
 bind(c,'squeezeend',()=>{if(grabbing?.g!==g)return;if(grabbing.type==='sd'){const near=sd.getWorldPosition(new T.Vector3()).distanceTo(unit.getWorldPosition(new T.Vector3()))<.2;table.attach(sd);sd.position.set(.65,.03,0);if(near)api.insert();}grabbing=null;scaleStart=null;});}
 document.getElementById('exitXR').hidden=false;api.message(m==='immersive-ar'?'MR: apunta al plano y pulsa A para colocar; agarre mueve la maqueta, dos agarres escalan.':'VR: monitor FPV estable. Controles de mando remoto.');
 }catch(e){if(created){await created.end().catch(()=>{});if(session)dispose();}api.mode(null);api.message('No se pudo iniciar XR: '+e.message+'. El juego normal sigue disponible.');}}
 function edge(key,value,fn){if(value&&!pressed.get(key))fn();pressed.set(key,value);}
 function frame(dt,frame){if(!session)return false;elapsed+=dt;const input={x:0,z:0,alt:0,yaw:0};let connected=0;
 for(const s of session.inputSources){const gp=s.gamepad;if(!gp)continue;connected++;const a=gp.axes,ax=a.length>=4?2:0,dead=v=>Math.abs(v||0)>.15?v:0;if(s.handedness==='left'){input.alt=-dead(a[ax+1]);input.yaw=-dead(a[ax]);}else{input.x=dead(a[ax]);input.z=dead(a[ax+1]);}
 edge(s.handedness+'home',gp.buttons[4]?.pressed,()=>api.home());edge(s.handedness+'view',gp.buttons[5]?.pressed,()=>{if(mode==='immersive-ar'){if(hit&&frame){const r=frame.getHitTestResults(hit)[0]?.getPose(renderer.xr.getReferenceSpace());if(r)table.position.set(r.transform.position.x,r.transform.position.y,r.transform.position.z);}}else setImmersive(!immersive);});}
 if(connected)hadController=true;const focused=visible&&(!hadController||connected>0);if(focused!==lastFocus){api.focus(focused);lastFocus=focused;if(!focused)api.message("Gafas sin foco o mandos desconectados: vuelo en pausa.");}
 if(!connected){api.clear();api.input({});}else api.input(visible?{...input,slow:immersive}:{});
 if(grabbing?.type==='table')table.position.copy(grabbing.g.getWorldPosition(new T.Vector3())).add(grabbing.offset);
 const both=grips.filter((g,i)=>i%2===0&&session.inputSources[i/2]?.gamepad?.buttons[1]?.pressed);
 if(model&&both.length===2){const distance=both[0].getWorldPosition(new T.Vector3()).distanceTo(both[1].getWorldPosition(new T.Vector3()));scaleStart??={distance,scale:model.scale.x};if(scaleStart.distance>.01)model.scale.setScalar(T.MathUtils.clamp(scaleStart.scale*distance/scaleStart.distance,1/150,1/20));}else scaleStart=null;
 if(mini)mini.position.copy(api.position());
 if(unitCanvas){const ctx=unitCanvas.getContext('2d'),tft=document.getElementById('tft');ctx.fillStyle='#10201c';ctx.fillRect(0,0,320,240);if(tft)ctx.drawImage(tft,0,0,320,240);else{ctx.fillStyle='#baffba';ctx.font='20px sans-serif';ctx.fillText(api.awaitingSD()?'INSERTAR SD':'UNIDAD DE TIERRA',12,70);ctx.fillText('Sin enlace de datos',12,110);}unitTexture.needsUpdate=true;}
 const rt=renderer.getRenderTarget(),enabled=renderer.xr.enabled;
 try{renderer.xr.enabled=false;renderer.setRenderTarget(target);renderer.render(flight,droneCamera);}finally{renderer.setRenderTarget(rt);renderer.xr.enabled=enabled;}
 if(mode==='immersive-vr'&&immersive){ // la pose XR nunca se escribe sobre droneCamera
 const desired=droneCamera.getWorldPosition(new T.Vector3());carrier.position.lerp(desired,1-Math.exp(-dt*3));carrier.quaternion.slerp(droneCamera.getWorldQuaternion(new T.Quaternion()),1-Math.exp(-dt*2));
 const oldParent=view.parent;carrier.add(view);flight.add(mask);mask.material.uniforms.amount.value=Math.min(.85,Math.abs(input.yaw)+Math.abs(input.x)*.4+.3);if(api.crashed())flash=1;flash=Math.max(0,flash-dt*.5);mask.material.uniforms.black.value=flash;
 try{renderer.render(flight,view);}finally{mask.removeFromParent();oldParent.add(view);}
 }else{view.position.set(0,0,0);view.quaternion.identity();renderer.render(root,view);}
 return true;
 }
 function setImmersive(v){if(v&&!immersive){flash=1;carrier?.position.copy(droneCamera.getWorldPosition(new T.Vector3()));}immersive=v;}
 return {supported,enter,frame,get active(){return !!session;},setImmersive,exit(){return session?.end();}};
}
