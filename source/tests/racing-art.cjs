const assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const {CARS,RaceSimulation,effectiveCar}=await import('../dist/racing-model.js');
 const {drawRaceCar,drawRaceScene,drawFrontCar,carFaceFamily}=await import('../dist/racing-art.js');
 const shapes=new Set();for(const car of CARS){const c=createCanvas(130,200),x=c.getContext('2d');drawRaceCar(x,65,100,50,95,.1,car,{boost:true,jump:3,time:1});assert.equal(x.getTransform().a,1);assert.equal(x.globalAlpha,1);assert(x.getImageData(0,0,130,200).data.some((v,i)=>i%4===3&&v));shapes.add(c.toBuffer('image/png').toString('base64'));}assert.equal(shapes.size,18);
 const poster=createCanvas(900,1080),p=poster.getContext('2d');
 for(const [i,difficulty]of ['easy','hard','hell'].entries()){
  const r=new RaceSimulation({car:effectiveCar(CARS[17]),difficulty,random:()=>.4});r.phase='racing';r.distance=3500;r.speed=15;r.x=0;r.boosting=true;r.rivals.forEach((v,j)=>{v.distance=r.distance+110+j*75;});r.traffic=[{lane:.68,y:440,speed:5,color:'#0ea5e9'}];r.coins=[{lane:-.68,y:300,value:12}];r.ramps=[{lane:0,y:230}];r.zones=[{lane:.23,y:110}];r.police=[{lane:-.4,y:590}];
  const c=createCanvas(600,720),x=c.getContext('2d');drawRaceScene(x,r,1.4);assert.equal(x.getTransform().a,1);assert.equal(x.globalAlpha,1);p.drawImage(c,i*300,0,300,360);
  drawRaceCar(p,i*300+150,570,95,180,0,CARS[i*6],{boost:true,time:1});p.fillStyle='#1e293b';p.font='bold 17px sans-serif';p.textAlign='center';p.fillText(difficulty,i*300+150,760);
 }
 require('node:fs').writeFileSync('/tmp/garden-racing-preview.png',poster.toBuffer('image/png'));
 const fronts=new Set();for(const car of CARS){const c=createCanvas(1000,560),x=c.getContext('2d');drawFrontCar(x,car);assert.equal(x.getTransform().a,1);assert.equal(x.getTransform().e,0);fronts.add(c.toBuffer('image/png').toString('base64'));}assert.equal(fronts.size,18);const hero=createCanvas(1000,560);drawFrontCar(hero.getContext('2d'),CARS[0]);require('node:fs').writeFileSync('/tmp/garden-front-car.png',hero.toBuffer('image/png'));
 for(const height of [500,720,1300]){const c=createCanvas(600,height),x=c.getContext('2d');drawRaceScene(x,new RaceSimulation({mode:'drive'}),0,{},height);assert.equal(x.getTransform().f,0);assert(x.getImageData(300,0,1,1).data[3]>0);assert(x.getImageData(300,height-1,1,1).data[3]>0);}
 assert.equal(carFaceFamily(CARS.find(c=>c.id==='xm')),'bmw');assert.equal(carFaceFamily(CARS.find(c=>c.id==='a7')),'audi');
 const tall=new RaceSimulation();tall.rivals=[];const blank=createCanvas(600,1400);drawRaceScene(blank.getContext('2d'),tall,0,{},1400,300);const before=blank.getContext('2d').getImageData(0,0,600,300).data;
 tall.rivals=[{id:'a5',lane:0,distance:650}];const visible=createCanvas(600,1400);drawRaceScene(visible.getContext('2d'),tall,0,{},1400,300);assert.notDeepEqual(visible.getContext('2d').getImageData(0,0,600,300).data,before,'rivals entering the upper part of a tall road cannot be culled at the old screen boundary');
 console.log('PASS racing art:18 distinct vehicle drawings, three complete road scenes, boost/jump/police, nonempty pixels and balanced Canvas state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
