import assert from 'node:assert/strict';
import { SKIN_CATALOG } from '../dist/catalog.js';
import { GardenProgress } from '../dist/profile.js';
import { ArcadeStore } from '../dist/arcade.js';
import { skinFruitName } from '../dist/skins.js';

const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))};
assert(!SKIN_CATALOG.some(skin=>skin.id==='dino'));
assert.equal(SKIN_CATALOG.find(skin=>skin.id==='fruit3d').price,80);
values.set('suika-garden-profile-v3',JSON.stringify({gems:123,ownedSkins:['classic','dino','galaxy'],equippedSkin:'dino'}));
const legacy=new GardenProgress({storage});await legacy.init();
assert.equal(legacy.profile.equippedSkin,'fruit3d');
assert(legacy.profile.ownedSkins.includes('fruit3d'));assert(!legacy.profile.ownedSkins.includes('dino'));
assert.equal(legacy.profile.gems,123,'converting an owned skin does not charge the wallet');
const again=new GardenProgress({storage});await again.init();assert.equal(again.profile.equippedSkin,'fruit3d');assert.equal(again.profile.gems,123);
await again.equipSkin('classic');await again.equipSkin('fruit3d');assert.equal(again.profile.equippedSkin,'fruit3d');
await assert.rejects(again.buySkin('dino'));
const freshValues=new Map([['suika-garden-profile-v3',JSON.stringify({gems:80})]]);
const fresh=new GardenProgress({storage:{getItem:key=>freshValues.get(key)||null,setItem:(key,value)=>freshValues.set(key,value)}});await fresh.init();
await fresh.buySkin('fruit3d');await fresh.equipSkin('fruit3d');assert.equal(fresh.profile.gems,0);assert.equal(fresh.profile.equippedSkin,'fruit3d');

const refundValues=new Map([['suika-garden-profile-v3',JSON.stringify({gems:123})],['garden-arcade-apple-v1',JSON.stringify({gems:7,owned:['classic','dino','night'],skin:'dino'})]]),refundStorage={getItem:key=>refundValues.get(key)||null,setItem:(key,value)=>refundValues.set(key,value)};
const apples=new ArcadeStore('apple',refundStorage);apples.save();assert.equal(apples.data.gems,190);assert.equal(apples.data.skin,'classic');assert(!apples.data.owned.includes('dino'));assert(apples.data.owned.includes('night'));
assert.equal(new ArcadeStore('apple',refundStorage).data.gems,190,'retired minigame skin refund is paid once');
assert.equal(new ArcadeStore('blocks',refundStorage).data.gems,190,'refunds join the common wallet');
assert.equal(again.profile.gems,123);
assert.equal(skinFruitName(2,'galaxy'),'지구');assert.equal(skinFruitName(5,'galaxy'),'토성');assert.equal(skinFruitName(13,'galaxy'),'태양');
assert.equal(skinFruitName(0,'cars'),'기아');assert.equal(skinFruitName(13,'cars'),'부가티');assert.equal(skinFruitName(9,'fruit3d'),'수박');
console.log('PASS refreshed skins: catalog removal, legacy ownership conversion, purchase/equip persistence, one-time shared-wallet refunds and reference stage names.');
