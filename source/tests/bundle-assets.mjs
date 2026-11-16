import assert from 'node:assert/strict';
import {embedStaticAssets} from '../scripts/bundle-assets.mjs';
const assets={
 '/money.js':{type:'text/javascript',body:"text(c,'$',21,-1,7); const amount='$100'; const literal=\"$& $` $' $$\";"},
 '/label.html':{type:'text/html',body:'<p>5만원 · $100 · 1달러</p>\n<script>const value="$&";</script>'},
 '/data':{body:'"quotes" \\slashes\\ \nnewlines `backticks` ${literal}'}
};
const template='const before = "prefix"; const assets = /*__STATIC_ASSETS__*/ {}; return {before,assets,after:"suffix"};';
const result=Function(embedStaticAssets(template,assets))();assert.deepEqual(result,{before:'prefix',assets,after:'suffix'});
assert.throws(()=>embedStaticAssets('no marker',assets));
console.log('PASS static bundling: literal dollar replacement sequences, currency text, quotes/backslashes/newlines and exact asset bytes without template corruption.');
