-- One authorized credit to the existing owner's five active game wallets.
-- No login credentials or client-side grant endpoint are involved.
CREATE TABLE IF NOT EXISTS garden_coin_grants (
  grant_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount > 0),
  before_balances TEXT NOT NULL,
  after_balances TEXT,
  applied_at INTEGER
);
--> statement-breakpoint
INSERT OR IGNORE INTO garden_coin_grants(grant_id,account_id,amount,before_balances)
SELECT 'owner_coins_v60_20261117',a.id,100000,json_object('suika',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."suika-garden-profile-v3".coins'),20),'apple',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-apple-v1".coins'),10),'blocks',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-blocks-v1".coins'),16),'quest',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-expedition-v1".coins'),60),'racing',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-racing-v1".coins'),500))
FROM garden_accounts a JOIN garden_cloud_saves c ON c.account_id=a.id
WHERE a.username='sanghyun8420'
  AND NOT EXISTS(SELECT 1 FROM garden_guest_keys g WHERE g.account_id=a.id)
  AND json_valid(c.payload) AND json_valid(json_extract(c.payload,'$.values."garden-economy-v1"'));
--> statement-breakpoint
UPDATE garden_cloud_saves AS c
SET payload=json_set(c.payload,'$.values."garden-economy-v1"',(json_set(json_extract(c.payload,'$.values."garden-economy-v1"'),
  '$.records."suika-garden-profile-v3".coins',
  MIN(9007199254740991,COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."suika-garden-profile-v3".coins'),20)+100000),
  '$.recordVersions."suika-garden-profile-v3"',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.recordVersions."suika-garden-profile-v3"'),0)+1,
  '$.records."garden-arcade-apple-v1".coins',
  MIN(9007199254740991,COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-apple-v1".coins'),10)+100000),
  '$.recordVersions."garden-arcade-apple-v1"',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.recordVersions."garden-arcade-apple-v1"'),0)+1,
  '$.records."garden-arcade-blocks-v1".coins',
  MIN(9007199254740991,COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-blocks-v1".coins'),16)+100000),
  '$.recordVersions."garden-arcade-blocks-v1"',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.recordVersions."garden-arcade-blocks-v1"'),0)+1,
  '$.records."garden-expedition-v1".coins',
  MIN(9007199254740991,COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-expedition-v1".coins'),60)+100000),
  '$.recordVersions."garden-expedition-v1"',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.recordVersions."garden-expedition-v1"'),0)+1,
  '$.records."garden-racing-v1".coins',
  MIN(9007199254740991,COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-racing-v1".coins'),500)+100000),
  '$.recordVersions."garden-racing-v1"',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.recordVersions."garden-racing-v1"'),0)+1,
  '$.revision',
  COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.revision'),0)+1,
  '$.coinGrants.owner_coins_v60_20261117',
  100000)) || ''),
    version=version+1,updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE c.account_id IN (SELECT account_id FROM garden_coin_grants WHERE grant_id='owner_coins_v60_20261117' AND applied_at IS NULL)
  AND json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.coinGrants.owner_coins_v60_20261117') IS NULL;
--> statement-breakpoint
UPDATE garden_coin_grants
SET applied_at=CAST(strftime('%s','now') AS INTEGER)*1000,
    after_balances=(SELECT json_object('suika',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."suika-garden-profile-v3".coins'),20),'apple',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-apple-v1".coins'),10),'blocks',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-arcade-blocks-v1".coins'),16),'quest',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-expedition-v1".coins'),60),'racing',COALESCE(json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.records."garden-racing-v1".coins'),500)) FROM garden_cloud_saves c WHERE c.account_id=garden_coin_grants.account_id)
WHERE grant_id='owner_coins_v60_20261117' AND applied_at IS NULL
  AND EXISTS(SELECT 1 FROM garden_cloud_saves c WHERE c.account_id=garden_coin_grants.account_id AND json_extract(json_extract(c.payload,'$.values."garden-economy-v1"'),'$.coinGrants.owner_coins_v60_20261117')=100000);
