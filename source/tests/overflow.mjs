import assert from 'node:assert/strict';
import { FruitWorld, OVERFLOW_SECONDS } from '../dist/physics.js';

const fruits=[{id:'cherry',radius:10,points:1},{id:'apple',radius:15,points:3},{id:'melon',radius:25,points:6}];
const advance=(world,seconds,before)=>{for(let i=0;i<Math.ceil(seconds*120)&&world.state==='playing';i++){before?.(world,i);world.update(1/120);}};

// A real chain of merges elsewhere must not grant a stranded fruit immunity.
let losses=0,merges=0;
const chain=new FruitWorld({height:140,fruits,onMerge:()=>merges++,onGameOver:()=>losses++});
chain.bodies=[chain.makeBody(2,100,107,{age:2})];
advance(chain,1, (world,i)=>{if(i%24===0)world.bodies.push(world.makeBody(0,480,122,{age:2}),world.makeBody(0,499,122,{age:2}));});
assert(merges>=3,'fixture must cause actual unrelated merges');
assert.equal(chain.state,'over','other merges cannot reset an overflowing pile');
assert(chain.time<.85,'an old stranded fruit loses promptly');
chain.update(1);assert.equal(losses,1,'loss callback runs once');

// A fruit that rolls sideways above MAX is still part of the overflowing pile.
const rolling=new FruitWorld({height:140,fruits});
const roller=rolling.makeBody(2,100,107,{age:2,vx:150});rolling.bodies=[roller];
advance(rolling,1,()=>{roller.vx=150;});
assert.equal(rolling.state,'over');assert(rolling.time<.85);assert(roller.vx>85);

// Every newly dropped apple starts above MAX; that flight alone is never a loss.
const falling=new FruitWorld({fruits});assert(falling.drop(1,100));
advance(falling,.3);
assert.equal(falling.state,'playing');assert.equal(falling.bodies[0].landed,false);
assert.equal(falling.bodies[0].overflowTime,0);

// A landed fruit may briefly bounce above MAX and fall back without ending play.
let bounceWarning=0;
const bounce=new FruitWorld({fruits,onDanger:value=>{bounceWarning=Math.max(bounceWarning,value);}});
bounce.bodies=[bounce.makeBody(2,100,100,{age:2,vy:-130})];
advance(bounce,1.2);
assert.equal(bounce.state,'playing');assert.equal(bounce.bodies[0].overflowTime,0);
assert(bounceWarning>0&&bounceWarning<1,'short bounce warns but does not lose');

// Shake protection remains complete, but an overflowing pile loses after it expires.
const shaken=new FruitWorld({height:140,fruits});
shaken.bodies=[shaken.makeBody(2,100,107,{age:2})];assert(shaken.shake());
const protectionEnd=shaken.protectedUntil;advance(shaken,3.9);
assert.equal(shaken.state,'playing');assert.equal(shaken.bodies[0].overflowTime,0);
advance(shaken,1.2);assert.equal(shaken.state,'over');
assert(shaken.time>=protectionEnd+OVERFLOW_SECONDS-1/120);

// A merge above MAX inherits the older warning rather than starting over.
const sizes=[{radius:25,points:1},{radius:30,points:3},{radius:35,points:6}];
const carry=new FruitWorld({height:140,fruits:sizes});
carry.bodies=[carry.makeBody(0,100,107,{age:2,overflowTime:.55}),carry.makeBody(0,149,107,{age:2,overflowTime:.3})];
carry.update(1/120);assert.equal(carry.bodies.length,1);assert.equal(carry.bodies[0].level,1);
assert(carry.bodies[0].overflowTime>=.55,'warning survives an above-line merge');
advance(carry,.2);assert.equal(carry.state,'over');

// If a merge actually brings the fruit below MAX, the old warning is cleared.
const saved=new FruitWorld({fruits:sizes});
saved.bodies=[saved.makeBody(0,100,101,{age:2,overflowTime:.55}),saved.makeBody(0,100,136,{age:2})];
saved.update(1/120);assert.equal(saved.bodies.length,1);
assert(saved.bodies[0].y-saved.bodies[0].r>=saved.maxLine-2);
assert.equal(saved.bodies[0].overflowTime,0);assert.equal(saved.state,'playing');

console.log('PASS overflow: real unrelated merge chains, sideways rolling, fresh apple flight, transient bounces, full shake protection and expiration, merge warning inheritance and below-MAX recovery.');
