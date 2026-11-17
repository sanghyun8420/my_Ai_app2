import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(':memory:');
for(const name of ['0001_game_accounts','0002_social','0003_arcade_social','0004_nickname_cloud','0005_signup_rewards'])db.exec(await readFile(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8'));
const keys=['suika-garden-profile-v3','garden-arcade-apple-v1','garden-arcade-blocks-v1','garden-expedition-v1','garden-racing-v1'];
const account=(id,username)=>db.prepare('INSERT INTO garden_accounts(id,username,display_name,friend_code,password_salt,password_hash,password_iterations,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,username,'테스트',id,'test-salt','test-hash',100000,1,1);
account('owner','sanghyun8420');account('other','player123');
const economy={version:1,rewardRules:2,gems:77,revision:90,recordVersions:Object.fromEntries(keys.map(k=>[k,5])),milestones:{suika:2},records:Object.fromEntries([...keys.map((k,i)=>[k,{coins:10+i,bestScore:900,inventory:{eraser:2}}]),['garden-orchard-v1',{coins:123}]])};
const snapshot={version:1,values:{'garden-economy-v1':JSON.stringify(economy),'suika-garden-run-v1':'saved board unchanged','suika-garden-preferences-v1':'saved preferences unchanged'}};
const text=JSON.stringify(snapshot);for(const id of ['owner','other'])db.prepare('INSERT INTO garden_cloud_saves(account_id,version,payload,updated_at) VALUES(?,?,?,?)').run(id,12,text,1);
const migration=await readFile(new URL('../drizzle/0006_owner_coin_grant.sql',import.meta.url),'utf8');db.exec('BEGIN');db.exec(migration);db.exec('COMMIT');
const saved=db.prepare('SELECT * FROM garden_cloud_saves WHERE account_id=?').get('owner'),next=JSON.parse(saved.payload);assert.equal(typeof next.values['garden-economy-v1'],'string','canonical wallet remains a JSON string inside the cloud envelope');const wallet=JSON.parse(next.values['garden-economy-v1']);
for(const [i,k]of keys.entries()){assert.equal(wallet.records[k].coins,100010+i);assert.equal(wallet.recordVersions[k],6);assert.equal(wallet.records[k].bestScore,900);assert.deepEqual(wallet.records[k].inventory,{eraser:2});}
assert.equal(wallet.records['garden-orchard-v1'].coins,123);assert.equal(wallet.gems,77);assert.equal(wallet.revision,91);assert.equal(saved.version,13);assert.equal(next.values['suika-garden-run-v1'],snapshot.values['suika-garden-run-v1']);assert.equal(db.prepare('SELECT payload FROM garden_cloud_saves WHERE account_id=?').get('other').payload,text);
const receipt=db.prepare('SELECT * FROM garden_coin_grants').get();assert.equal(receipt.account_id,'owner');assert.equal(receipt.amount,100000);assert(receipt.applied_at>0);const before=JSON.parse(receipt.before_balances),after=JSON.parse(receipt.after_balances);for(const game of Object.keys(before))assert.equal(after[game]-before[game],100000);
assert.equal(db.prepare('UPDATE garden_cloud_saves SET payload=? WHERE account_id=? AND version=?').run(text,'owner',12).changes,0,'stale clients cannot overwrite the credited wallet');
db.exec(migration);assert.equal(db.prepare('SELECT version FROM garden_cloud_saves WHERE account_id=?').get('owner').version,13);assert.equal(db.prepare('SELECT count(*) AS n FROM garden_coin_grants').get().n,1);assert.equal(db.prepare('SELECT payload FROM garden_cloud_saves WHERE account_id=?').get('owner').payload,saved.payload,'re-running migration cannot credit again');
console.log('PASS owner coin migration: exactly five targeted wallets +100000, unchanged gems/archived garden/progress/other accounts, valid backup envelope, version-conflict protection, audited balances and idempotent replay.');
