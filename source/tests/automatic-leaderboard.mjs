import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLocalApp} from '../scripts/dev-server.mjs';
const dir=await mkdtemp(path.join(tmpdir(),'garden-ranking-')),file=path.join(dir,'db.sqlite'),app=await createLocalApp({databasePath:file}),db=new DatabaseSync(file),origin='https://garden.example';
const call=async(p,body,cookie)=>{const r=await app(new Request(origin+p,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));return {status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};};
try{
 const owner=await call('/api/auth/register',{username:'Ranking42',displayName:'자동 참여',password:'GardenPass42',passwordConfirm:'GardenPass42'});assert.equal(owner.status,201);
 let rank=(await call('/api/leaderboard',null,owner.cookie)).data;assert.equal(rank.scores.length,1);assert.equal(rank.me.score,0);assert.equal(rank.me.rank,1,'a new account participates without playing or a manual registration');
 const guest=await call('/api/guest',{key:'r'.repeat(43),displayName:'아직 연습 중'});assert.equal((await call('/api/leaderboard')).data.scores.some(r=>r.id===guest.data.user.id),false,'empty automatic guests do not flood the board');
 const insert=db.prepare('INSERT INTO garden_accounts(id,username,display_name,friend_code,password_salt,password_hash,password_iterations,best_score,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<51;i++)insert.run('ga_'+String(i).padStart(24,'0'),'fixture'+i,'다른 정원 '+i,'FIX'+i,'test-salt','test-hash',100000,1000+i,1,1);
 rank=(await call('/api/leaderboard',null,owner.cookie)).data;assert.equal(rank.scores.length,50);assert.equal(rank.me.rank,52);assert(!rank.scores.some(r=>r.id===owner.data.user.id),'own rank remains available outside the top50');
 const saved=(await call('/api/cloud-save',null,owner.cookie)).data,snapshot=structuredClone(saved.snapshot),wallet=JSON.parse(snapshot.values['garden-economy-v1']);wallet.records['suika-garden-profile-v3'].bestScore=6543;wallet.records['suika-garden-profile-v3'].modeBestScores={zoo:999999};wallet.records['garden-arcade-apple-v1'].best=2200;wallet.records['garden-arcade-blocks-v1'].best=3300;snapshot.values['garden-economy-v1']=JSON.stringify(wallet);
 assert.equal((await call('/api/cloud-save',{version:saved.version,snapshot},owner.cookie)).status,200);
 for(const [game,score]of[['suika',6543],['apple',2200],['blocks',3300]]){rank=(await call('/api/leaderboard?game='+game,null,owner.cookie)).data;assert.equal(rank.me.score,score,'server saves automatically appear without profile/import or opening the leaderboard');assert.equal(rank.me.rank,1);assert.equal(rank.scores[0].id,owner.data.user.id);}
 assert.equal((await call('/api/leaderboard')).data.scores[0].score,6543,'zoo scores never leak into the basic leaderboard');
 assert.equal((await call('/api/rooms',{game:'suika',mode:'zoo'},owner.cookie)).data.room.mode,'zoo','real zoo room API is supported');
 await call('/api/profile/import',{scores:{suika:7000}},owner.cookie);rank=(await call('/api/leaderboard',null,owner.cookie)).data;assert.equal(rank.me.score,7000,'existing higher imported scores remain monotonic');
 await call('/api/profile/import',{scores:{suika:5001}},guest.cookie);assert((await call('/api/leaderboard')).data.scores.some(r=>r.id===guest.data.user.id),'positive guest scores remain visible');
 const latest=(await call('/api/cloud-save',null,owner.cookie)).data;latest.snapshot.values['suika-garden-best']='7500';latest.snapshot.values['garden-arcade-apple-v1']=JSON.stringify({best:4500});latest.snapshot.values['garden-arcade-blocks-v1']='old broken backup';await call('/api/cloud-save',{version:latest.version,snapshot:latest.snapshot},owner.cookie);
 assert.equal((await call('/api/leaderboard',null,owner.cookie)).data.me.score,7500,'historical device highs in server backups are included automatically');assert.equal((await call('/api/leaderboard?game=apple',null,owner.cookie)).data.me.score,4500);assert.equal((await call('/api/leaderboard?game=blocks',null,owner.cookie)).data.me.score,3300,'an unreadable legacy backup cannot break ranking');
 console.log('PASS automatic leaderboard: zero-point accounts auto-enroll, empty guest filtering, legacy/three-game cloud records without manual import, own rank beyond50, stable ordering, mode isolation, monotonic scores and zoo rooms.');
}finally{db.close();app.close();await rm(dir,{recursive:true,force:true});}
