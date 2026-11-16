export function embedStaticAssets(template,assets){
 const marker='/*__STATIC_ASSETS__*/ {}';
 if(!template.includes(marker))throw Error('Static asset marker missing');
 // A callback preserves literal $&, $` and $' sequences in bundled assets.
 return template.replace(marker,()=>JSON.stringify(assets));
}
