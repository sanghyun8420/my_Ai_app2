// Transparent rectangles in game sheets prepared from the user's vehicle references.
// Order per rectangle: x, y, width, height. Driving sprites have their hoods at the top.
export const referenceCars = Object.freeze({
 x6m:    { portrait: [63, 86, 514, 266], top: [697, 15, 183, 348] },
 m8:     { portrait: [59, 412, 516, 241], top: [705, 370, 166, 304] },
 amg_gt: { portrait: [51, 714, 534, 225], top: [710, 678, 159, 281] },
 rs6:    { portrait: [51, 994, 540, 238], top: [708, 961, 163, 303] },
 r8:     { portrait: [64, 1290, 518, 221], top: [713, 1267, 154, 268] },
 s_class:  { sheet: 'series', portrait: [77, 51, 608, 266], top: [760, 7, 161, 317] },
 q8:       { sheet: 'series', portrait: [75, 361, 612, 289], top: [760, 329, 161, 317] },
 a6:       { sheet: 'series', portrait: [73, 684, 621, 259], top: [761, 650, 159, 311] },
 '5_series': { sheet: 'series', portrait: [75, 981, 600, 267], top: [765, 963, 153, 298] },
 xm:       { sheet: 'series', portrait: [77, 1267, 540, 259], top: [768, 1267, 125, 259] },
 a5:       { sheet: 'touring', portrait: [35, 236, 683, 313], top: [770, 55, 273, 576] },
 e_class:  { sheet: 'touring', portrait: [20, 930, 719, 329], top: [767, 742, 277, 620] },
 c_class:  { sheet: 'fastback', portrait: [55, 150, 623, 291], top: [724, 41, 236, 459] },
 a7:       { sheet: 'fastback', portrait: [46, 635, 646, 286], top: [722, 523, 237, 481] },
 rs7:      { sheet: 'fastback', portrait: [41, 1138, 640, 274], top: [715, 1023, 252, 477] }
});
