// An original electronic race loop and synthesized engine/exhaust, generated locally.
// The context is created only from a user gesture; no sound assets or network needed.
const LEAD=[64,67,71,74,71,67,76,74, 64,67,71,79,76,74,71,67,
 62,66,69,74,69,66,74,76, 60,64,67,72,67,64,71,74];
const BASS=[40,40,43,40, 36,36,38,38];
const hz=n=>440*2**((n-69)/12);
const volume=(n,fallback)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
export class RacingAudio {
 constructor({contextFactory,setTimer,clearTimer}={}){
  this.contextFactory=contextFactory||(()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;});
  this.setTimer=setTimer||((fn,ms)=>globalThis.setInterval(fn,ms));this.clearTimer=clearTimer||((id)=>globalThis.clearInterval(id));
  this.context=null;this.initialized=false;this.timer=null;this.notes=new Set();this.step=0;this.nextNote=0;this.lastPop=-10;this.wasThrottle=false;this.gear=0;
  this.state={active:false,running:false,racing:false,speed:0,throttle:false,gear:0,boosting:false};
  this.settings={sound:true,music:true,effects:true,volume:.55,musicVolume:.45,effectsVolume:.8};
 }
 async unlock(settings={}){
  this.configure(settings);if(!this.settings.sound)return false;
  try{
   if(!this.context||this.context.state==='closed'||!this.initialized){
    const c=this.contextFactory();if(!c)return false;this.context=c;this.notes.clear();
    this.musicBus=c.createGain();this.fxBus=c.createGain();this.musicBus.gain.value=0;this.fxBus.gain.value=0;this.musicBus.connect(c.destination);this.fxBus.connect(c.destination);
    this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=280;this.filter.connect(this.fxBus);
    this.motorGain=c.createGain();this.motorGain.gain.value=0;this.motorGain.connect(this.filter);
    this.motor=c.createOscillator();this.motor.type='sawtooth';this.motor.frequency.value=54;this.motor.connect(this.motorGain);this.motor.start();
    this.harmonicGain=c.createGain();this.harmonicGain.gain.value=0;this.harmonicGain.connect(this.filter);
    this.harmonic=c.createOscillator();this.harmonic.type='triangle';this.harmonic.frequency.value=108;this.harmonic.connect(this.harmonicGain);this.harmonic.start();this.initialized=true;
    c.onstatechange=()=>{if(c!==this.context)return;if(c.state!=='running')this._stopMusic();else this._syncMusic();};
   }
   const c=this.context;const promise=c.state==='running'?null:c.resume();if(promise)await promise;if(c!==this.context)return false;this._mix();this._syncMusic();return c.state==='running';
  }catch{this._stopMusic();if(!this.initialized){try{this.context?.close?.();}catch{}this.context=null;}return false;}
 }
 configure(values={}){
  for(const key of ['sound','music','effects'])if(typeof values[key]==='boolean')this.settings[key]=values[key];
  for(const key of ['volume','musicVolume','effectsVolume'])if(Number.isFinite(values[key]))this.settings[key]=volume(values[key],this.settings[key]);
  this._mix();this._syncMusic();
 }
 _target(param,value,time=.025){try{if(this.context&&this.context.state!=='closed')param?.setTargetAtTime(value,this.context.currentTime,time);}catch{}}
 _mix(){const s=this.settings;this._target(this.musicBus?.gain,s.sound&&s.music?s.volume*s.musicVolume*.22:0);this._target(this.fxBus?.gain,s.sound&&s.effects&&this.state.active&&this.state.running?s.volume*s.effectsVolume*.36:0);}
 _musicWanted(){const s=this.settings;return !!(this.state.active&&this.state.racing&&s.sound&&s.music&&s.volume&&s.musicVolume&&this.context?.state==='running');}
 _syncMusic(){if(!this._musicWanted()){this._stopMusic();return;}if(this.timer!==null)return;this.nextNote=this.context.currentTime+.025;this.timer=this.setTimer(()=>this._tick(),35);this._tick();}
 _stopMusic(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}const c=this.context;for(const voice of this.notes){try{voice.gain.gain.cancelScheduledValues(c?.currentTime||0);voice.gain.gain.setTargetAtTime(.0001,c?.currentTime||0,.004);voice.osc.stop((c?.currentTime||0)+.03);}catch{}this.notes.delete(voice);}}
 _tone(bus,f,time,duration,level,wave='triangle',end=f,tracked=false){
  const c=this.context;if(c?.state!=='running')return;const osc=c.createOscillator(),gain=c.createGain();osc.type=wave;osc.frequency.setValueAtTime(f,time);if(end!==f)osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),time+duration*.8);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(bus);const voice={osc,gain};if(tracked)this.notes.add(voice);osc.onended=()=>{this.notes.delete(voice);try{osc.disconnect();gain.disconnect();}catch{}};osc.start(time);osc.stop(time+duration+.02);
 }
 _tick(){if(!this._musicWanted()){this._stopMusic();return;}try{const now=this.context.currentTime;if(this.nextNote<now-.2)this.nextNote=now+.02;let count=0;while(this.nextNote<now+.12&&count++<4){const i=this.step%LEAD.length,t=this.nextNote;this._tone(this.musicBus,hz(LEAD[i]),t,.12,.25,'square',hz(LEAD[i]),true);if(i%2===0)this._tone(this.musicBus,hz(BASS[Math.floor(i/4)%BASS.length]),t,.16,.36,'sawtooth',hz(BASS[Math.floor(i/4)%BASS.length]),true);if(i%4===0)this._tone(this.musicBus,125,t,.085,.38,'sine',48,true);if(i%4===2)this._tone(this.musicBus,360,t,.05,.12,'triangle',130,true);this.step=(this.step+1)%LEAD.length;this.nextNote+=60/136/2;}}catch{this._stopMusic();}}
 update(state={},settings={}){
  this.state={...this.state,...state};this.configure(settings);const c=this.context;if(c?.state!=='running')return;
  try{const s=this.settings,on=this.state.active&&this.state.running&&s.sound&&s.effects&&s.volume&&s.effectsVolume,ratio=volume(this.state.speed,0),throttle=!!this.state.throttle;
   const rpm=48+ratio*112+(throttle?12:0)+(this.state.boosting?15:0);this._target(this.motor?.frequency,rpm,.055);this._target(this.harmonic?.frequency,rpm*2.03,.06);this._target(this.filter?.frequency,200+ratio*600+(throttle?220:0),.08);this._target(this.motorGain?.gain,on?(throttle?.18:.105):0,.04);this._target(this.harmonicGain?.gain,on?(throttle?.075:.038):0,.04);
   if(on&&((this.wasThrottle&&!throttle&&ratio>.12)||(this.gear>0&&this.state.gear>this.gear))&&c.currentTime-this.lastPop>.24){this.lastPop=c.currentTime;this._tone(this.fxBus,120,c.currentTime,.10,.16,'triangle',45);this._tone(this.fxBus,75,c.currentTime+.045,.075,.09,'sawtooth',35);}
   this.wasThrottle=throttle;this.gear=this.state.gear||0;
  }catch{}
 }
 mute(){this.state.active=false;this._target(this.fxBus?.gain,0,.01);this.wasThrottle=false;this.gear=0;this._target(this.motorGain?.gain,0,.01);this._target(this.harmonicGain?.gain,0,.01);this._stopMusic();}
}
