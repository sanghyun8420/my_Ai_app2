const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const fs=require('node:fs');
for(const name of ['Regular','Bold'])GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-'+name+'.ttc','Noto Sans KR');
(async()=>{
 const {FruitExpedition,AppleOrchard}=await import('../dist/growth-models.js');
 const {drawExpeditionScene,drawOrchardScene,drawHero,drawGear}=await import('../dist/growth-art.js');
 const records=new Map(),store={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
 const quest=new FruitExpedition({storage:store});quest.start();quest.enemies=Array.from({length:4},()=>quest.makeEnemy());quest.enemies.forEach((e,i)=>{e.x=315+i*62;e.y=235+(i%2)*98;});
 const scene=createCanvas(1200,1020),c=scene.getContext('2d');c.scale(2,2);drawExpeditionScene(c,quest,3,[{type:'shot',hero:1,x:350,y:280,age:.12,life:.45}]);fs.writeFileSync('/tmp/fruit-expedition-scene.png',scene.toBuffer('image/png'));
 quest.data.waveKills=10;quest.challenge();quest.enemies[0].x=365;drawExpeditionScene(c,quest,5,[]);fs.writeFileSync('/tmp/fruit-expedition-boss.png',scene.toBuffer('image/png'));
 const motion=createCanvas(1200,710),motionContext=motion.getContext('2d');motionContext.fillStyle='#f5efd9';motionContext.fillRect(0,0,1200,710);
 quest.enemies[0].hp*=.3;quest.enemies[0].maxHp=299;
 for(let frame=0;frame<6;frame++){
  const age=frame*.085,enemy=quest.enemies[0];enemy.hit=Math.max(0,.16-age);
  const fx=[...Array.from({length:3},(_,hero)=>({type:'shot',hero,x:enemy.x,y:enemy.y,age,life:.6})),{type:'hit',hero:0,x:enemy.x,y:enemy.y,amount:26,boss:true,age,life:.8}];
  const tile=createCanvas(400,340),tc=tile.getContext('2d');tc.scale(2/3,2/3);drawExpeditionScene(tc,quest,6+age,fx);
  const x=(frame%3)*400,y=Math.floor(frame/3)*355;motionContext.drawImage(tile,x,y);motionContext.fillStyle='#3b5746';motionContext.font='12px sans-serif';motionContext.fillText('Attack '+age.toFixed(2)+'s',x+10,y+352);
 }
 fs.writeFileSync('/tmp/expedition-animation-sheet.png',motion.toBuffer('image/png'));
 quest.phase='waves';quest.enemies=[];drawExpeditionScene(c,quest,7,[{type:'coin',enemyId:3,kind:1,x:365,y:280,amount:12,age:.15,life:1},{type:'tap',x:365,y:280,age:.1,life:.8}]);fs.writeFileSync('/tmp/expedition-defeat-effect.png',scene.toBuffer('image/png'));
 const {ExpeditionJourney}=await import('../dist/growth-journey.js');
 const walkers=new FruitExpedition({storage:store}),journey=new ExpeditionJourney();walkers.start();
 let travelEffects=[],travelTime=0,cell=0;const captures=[.3,.6,1,1.6,2.4,3.2],travelSheet=createCanvas(1200,720),travelContext=travelSheet.getContext('2d');travelContext.fillStyle='#f5efd9';travelContext.fillRect(0,0,1200,720);
 for(let step=0;step<33;step++){
  travelEffects=travelEffects.map(f=>({...f,age:f.age+.1})).filter(f=>f.age<f.life);journey.track(walkers.enemies);const events=walkers.tick(.1);journey.track(walkers.enemies);
  for(const event of events){if(['hit','shot','coin'].includes(event.type))travelEffects.push({...journey.effect(event),age:0,life:event.type==='shot'?.6:1});if(event.type==='coin')journey.advance();}
  journey.trim(walkers.enemies);journey.tick(.1,walkers.phase);travelTime+=.1;
  if(cell<captures.length&&travelTime+.001>=captures[cell]){
   const tile=createCanvas(400,340),tc=tile.getContext('2d');tc.scale(2/3,2/3);drawExpeditionScene(tc,walkers,travelTime,travelEffects,true,{journey});const x=(cell%3)*400,y=Math.floor(cell/3)*360;travelContext.drawImage(tile,x,y);travelContext.fillStyle='#3b5746';travelContext.font='12px sans-serif';travelContext.fillText(travelTime.toFixed(1)+'s / kills '+walkers.data.stats.kills+' / camera '+journey.distance.toFixed(0)+'px',x+8,y+355);cell++;
  }
 }
 fs.writeFileSync('/tmp/expedition-journey-sheet.png',travelSheet.toBuffer('image/png'));
 const grow=new AppleOrchard({storage:store,now:()=>100000});grow.data.growth=100;drawOrchardScene(c,grow,2,[]);fs.writeFileSync('/tmp/apple-orchard-scene.png',scene.toBuffer('image/png'));
 const sheet=createCanvas(900,680),s=sheet.getContext('2d');s.fillStyle='#f7efda';s.fillRect(0,0,900,680);
 for(let i=0;i<3;i++){drawHero(s,i,150+i*300,130,1.6,2,['fork','staff','moon'][i],true);}
 const gears=['fork','shell','honey','hammer','dew','staff','leaf','sun','moon'];gears.forEach((id,i)=>{drawGear(s,id,60+i*97,330,66);});
 for(let stage=0;stage<6;stage++){const miniature=createCanvas(300,255),m=miniature.getContext('2d');m.scale(.5,.5);grow.data.growth=stage===5?100:stage*20+8;drawOrchardScene(m,grow,2,[]);s.drawImage(miniature,(stage%3)*300,390+Math.floor(stage/3)*145,300,255/1.8);}
 fs.writeFileSync('/tmp/new-games-art-sheet.png',sheet.toBuffer('image/png'));
 console.log('Rendered new original heroes,9tools, combat/boss scenes and6apple growth stages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
