const assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const {CARS,RaceSimulation,effectiveCar}=await import('../dist/racing-model.js');
 const {drawRaceCar,drawRaceScene,drawFrontCar,carFaceFamily,roadSceneFeatures}=await import('../dist/racing-art.js');
 const {CAR_SPRITES,SPEED_ASSETS}=await import('../dist/racing-sprites.js');assert.equal(CAR_SPRITES.length,18);for(const [key,data]of Object.entries(SPEED_ASSETS))assert(data.startsWith('data:image/webp;base64,'),key);
 const shapes=new Set();for(const car of CARS){const c=createCanvas(130,200),x=c.getContext('2d');drawRaceCar(x,65,100,50,95,.1,car,{boost:true,jump:3,time:1});assert.equal(x.getTransform().a,1);assert.equal(x.globalAlpha,1);assert(x.getImageData(0,0,130,200).data.some((v,i)=>i%4===3&&v));shapes.add(c.toBuffer('image/png').toString('base64'));}assert.equal(shapes.size,18);
 const poster=createCanvas(900,1080),p=poster.getContext('2d');
 for(const [i,difficulty]of ['easy','hard','hell'].entries()){
  const r=new RaceSimulation({car:effectiveCar(CARS[17]),difficulty,random:()=>.4});r.phase='racing';r.distance=3500;r.speed=15;r.x=0;r.boosting=true;r.rivals.forEach((v,j)=>{v.distance=r.distance+110+j*75;});r.traffic=[{lane:.68,y:440,speed:5,color:'#0ea5e9'}];r.coins=[{lane:-.68,y:300,value:12}];r.ramps=[{lane:0,y:230}];r.zones=[{lane:.23,y:110}];r.police=[{lane:-.4,y:590}];
  const c=createCanvas(600,720),x=c.getContext('2d');drawRaceScene(x,r,1.4);assert.equal(x.getTransform().a,1);assert.equal(x.globalAlpha,1);p.drawImage(c,i*300,0,300,360);
  drawRaceCar(p,i*300+150,570,95,180,0,CARS[i*6],{boost:true,time:1});p.fillStyle='#1e293b';p.font='bold 17px sans-serif';p.textAlign='center';p.fillText(difficulty,i*300+150,760);
 }
 require('node:fs').writeFileSync('/tmp/garden-racing-preview.png',poster.toBuffer('image/png'));
 const fronts=new Set();for(const car of CARS){const c=createCanvas(1000,560),x=c.getContext('2d');drawFrontCar(x,car);assert.equal(x.getTransform().a,1);assert.equal(x.getTransform().e,0);fronts.add(c.toBuffer('image/png').toString('base64'));
 // The showroom illustration includes the side and a rear wheel, and has
 // transparent padding so a narrow mobile preview does not crop the car.
 assert(x.getImageData(778,316,1,1).data[3]>0,'rear wheel is present in three-quarter view');
 for(const [edgeX,edgeY] of [[0,0],[999,0],[0,280],[999,280],[0,559],[999,559]])assert.equal(x.getImageData(edgeX,edgeY,1,1).data[3],0,'car does not touch canvas edges');
 }assert.equal(fronts.size,18);const hero=createCanvas(1000,560);drawFrontCar(hero.getContext('2d'),CARS[0]);require('node:fs').writeFileSync('/tmp/garden-front-car.png',hero.toBuffer('image/png'));
 for(const height of [500,720,1300]){const c=createCanvas(600,height),x=c.getContext('2d');drawRaceScene(x,new RaceSimulation({mode:'drive'}),0,{},height);assert.equal(x.getTransform().f,0);assert(x.getImageData(300,0,1,1).data[3]>0);assert(x.getImageData(300,height-1,1,1).data[3]>0);}
 // A roadside object has one fixed world location and moves by exactly the
 // same screen distance as road objects as the vehicle advances. The feature
 // remains fixed if the viewport changes rather than snapping to the top edge.
 const a=roadSceneFeatures(1000,-200,850),b=roadSceneFeatures(1004,-200,850),taller=roadSceneFeatures(1000,-700,850);
 for(const feature of a){const next=b.find(x=>x.id===feature.id),wide=taller.find(x=>x.id===feature.id);if(next)assert(Math.abs(next.y-feature.y-4*1.45)<1e-9);if(wide)assert.equal(wide.y,feature.y);assert.equal(feature.world,feature.id*220);}
 assert.equal(carFaceFamily(CARS.find(c=>c.id==='xm')),'bmw');assert.equal(carFaceFamily(CARS.find(c=>c.id==='a7')),'audi');
 const tall=new RaceSimulation();tall.rivals=[];const blank=createCanvas(600,1400);drawRaceScene(blank.getContext('2d'),tall,0,{},1400,300);const before=blank.getContext('2d').getImageData(0,0,600,300).data;
 tall.rivals=[{id:'a5',lane:0,distance:650}];const visible=createCanvas(600,1400);drawRaceScene(visible.getContext('2d'),tall,0,{},1400,300);assert.notDeepEqual(visible.getContext('2d').getImageData(0,0,600,300).data,before,'rivals entering the upper part of a tall road cannot be culled at the old screen boundary');
 // Use the same atlases and rendering branches as a browser once images decode.
 const images=[];
 global.Image=class{
  constructor(){images.push(this);}
  set src(value){
   this.url=value;
   this.decoding=loadImage(value.startsWith('file:')?new URL(value):value).then(image=>{
    this.image=image;
    this.complete=true;
    this.naturalWidth=image.width;
    this.naturalHeight=image.height;
   });
  }
 };
 const textured=await import('../dist/racing-art.js?atlas-test');
 assert.equal(images.length,8);
 await Promise.all(images.map(image=>image.decoding));
 assert(images.every(image=>image.complete&&image.naturalWidth>0),'all eight site atlases decode');
 const canvasContext=(canvas,onDraw=()=>{})=>{
  const context=canvas.getContext('2d'),draw=context.drawImage.bind(context);
  context.drawImage=(image,...args)=>{onDraw(image,args);draw(image.image||image,...args);};
  return context;
 };
 const loaded=createCanvas(1000,560);textured.drawFrontCar(canvasContext(loaded),CARS[0]);
 assert.notDeepEqual(loaded.toBuffer('image/png'),hero.toBuffer('image/png'),'loaded car photo replaces fallback');
 const loadedRoad=createCanvas(600,900),roadContext=canvasContext(loadedRoad);
 textured.drawRaceScene(roadContext,new RaceSimulation({difficulty:'hell'}),2,{},900,240);
 assert(roadContext.getImageData(300,700,1,1).data[3]>0,'textured road and cars render');
 const {referenceCars}=await import('../dist/racing-reference.js');
 const {vehicleDimensions}=await import('../dist/racing-model.js');
 const atlases={
  base:images.find(image=>image.url.endsWith('/racing-reference.webp')),
  series:images.find(image=>image.url.endsWith('/racing-reference-series.webp')),
  touring:images.find(image=>image.url.endsWith('/racing-reference-touring.webp'))
 };
 assert.deepEqual([atlases.touring.naturalWidth,atlases.touring.naturalHeight],[1086,1448]);
 for(const sheet of ['series','touring']){
  const atlas=atlases[sheet];
  const canvas=createCanvas(atlas.naturalWidth,atlas.naturalHeight);
  const context=canvas.getContext('2d');
  context.drawImage(atlas.image,0,0);
  for(const [id,sprites] of Object.entries(referenceCars).filter(([,value])=>value.sheet===sheet)){
   for(const [view,[x,y,w,h]] of [['portrait',sprites.portrait],['top',sprites.top]]){
    const edges=[[x,y,w,1],[x,y+h-1,w,1],[x,y,1,h],[x+w-1,y,1,h]];
    for(const edge of edges){
     assert(!context.getImageData(...edge).data.some((value,index)=>index%4===3&&value>=128),id+' '+view+' outline has padding on each edge');
    }
   }
  }
 }
 const drive=new RaceSimulation({mode:'drive',random:()=>.7});
 drive.distance=1700;
 drive.spawnTraffic(360,0);
 assert.equal(drive.traffic[0].spriteIndex,8,'the ambulance appears in ordinary traffic');
 const roadside=images.find(image=>image.url.endsWith('/racing-roadside.webp'));
 const decorationCalls=[];
 textured.drawRaceScene(canvasContext(createCanvas(600,900),(image,args)=>{
  if(image===roadside)decorationCalls.push(args);
 }),drive,1,{},900,240);
 assert(decorationCalls.some(([x,y])=>x===520&&y===15),'junction signal uses the atlas');
 assert(decorationCalls.some(([x,y])=>(x===78&&y===11)||(x===286&&y===7)),'streetlamps are rendered in the scene');
 assert(decorationCalls.filter(([x,y])=>(x===520&&y===15)||(x===78&&y===11)||(x===286&&y===7))
  .every((args)=>args[4]+args[6]<=80||args[4]>=520),'street fixtures stay outside the driving lanes');
 const pairs=new Set();
 for(const [id,sprites] of Object.entries(referenceCars)){
  const car=CARS.find(model=>model.id===id);
  assert(car);
  const sceneCanvas=createCanvas(110,160),portraitCanvas=createCanvas(1000,560);
  const calls=[],capture=(image,args)=>calls.push({image,args});
  const scene=canvasContext(sceneCanvas,capture),portrait=canvasContext(portraitCanvas,capture);
  textured.drawRaceCar(scene,55,80,40,75,0,car);
  textured.drawFrontCar(portrait,car);
  assert.equal(calls.length,2);
  const atlas=atlases[sprites.sheet||'base'];
  assert.equal(calls[0].image,atlas);
  assert.equal(calls[1].image,atlas);
  assert.deepEqual(calls[0].args.slice(0,4),sprites.top);
  assert.deepEqual(calls[1].args.slice(0,4),sprites.portrait);
  const footprint = vehicleDimensions(car,40,75);
  assert.equal(calls[0].args[6],footprint.width);
  assert.equal(calls[0].args[7],footprint.length);
  assert(sceneCanvas.getContext('2d').getImageData(40,45,30,75).data.some((value,index)=>index%4===3&&value>128),id+' overhead image paints nontransparent pixels');
  assert(portraitCanvas.getContext('2d').getImageData(270,180,460,180).data.some((value,index)=>index%4===3&&value>128),id+' portrait paints nontransparent pixels');
  pairs.add(atlas.url+calls.map(call=>call.args.slice(0,4).join(',')).join(';'));
 }
 assert.equal(pairs.size,12,'twelve separate portraits and overhead images');
 console.log('PASS racing art:18 distinct vehicle drawings, three complete road scenes, boost/jump/police, nonempty pixels and balanced Canvas state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
