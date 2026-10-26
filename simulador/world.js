import * as T from './vendor/three.module.js';
export function createWorld(level=0,interiors=false){
 const group=new T.Group(),colliders=[],points=[];const base=new T.Vector3(0,.45,8);
 function box(w,h,d,x,y,z,color,solid=true){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);group.add(m);if(solid)colliders.push(m);return m;}
 box(80,.2,80,0,-.1,0,'#79836f');box(12,8,.4,0,4,-6,'#c4bdaa');box(.4,8,8,-6,4,-10,'#b3b09f');box(.4,8,8,6,4,-10,'#b3b09f');
 for(let i=0;i<3;i++){box(12,.2,8,0,i*3,-10,'#8c9992');for(const x of [-4,0,4])box(1.4,1.6,.05,x,i*2.5+1.4,-5.77,'#344d55',false);}
 const positions=[[-2.6,2,-5.79],[2,2,-5.79],[2,4.5,-5.79],[-2.6,6.6,-5.79],[5.4,6.5,-5.79]];
 positions.forEach((v,i)=>{const p={position:new T.Vector3(...v),normal:new T.Vector3(0,0,1),width:[.3,2.5,12][level],name:'Muro '+(i+1),inside:false,light:1};points.push(p);crack(p);});
 function crack(p){for(let j=0;j<8;j++){const a=new T.Vector3(p.position.x+(j%2?.06:-.04),p.position.y-.28+j*.08,p.position.z),b=new T.Vector3(p.position.x+((j+1)%2?.06:-.04),p.position.y-.28+(j+1)*.08,p.position.z);const delta=b.clone().sub(a),m=new T.Mesh(new T.PlaneGeometry(p.width/1000,delta.length()),new T.MeshBasicMaterial({color:0x292a24,side:T.DoubleSide}));m.position.copy(a).add(b).multiplyScalar(.5);m.rotation.z=-Math.atan2(delta.x,delta.y);group.add(m);}}
 const pad=box(4,.06,4,0,.04,8,'#c8e69a',false);const grid=new T.GridHelper(80,40,0x748675,0x859381);group.add(grid);
 return {group,colliders,points,base,height:8,indoor:()=>false,sky:'#9bb5bb',light:1,interiors};
}
