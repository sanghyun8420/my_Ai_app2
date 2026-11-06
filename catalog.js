function catalog(entries) {
  return Object.freeze(entries.map(entry => Object.freeze(entry)));
}

export const SKIN_CATALOG = catalog([
  { id: 'classic', name: '과일', price: 0, description: '작은 체리부터 시크릿 과일까지, 귀여운 과일 정원.', icon: '🍉' },
  { id: 'numbers', name: '숫자', price: 15, description: '동그란 숫자 공을 합쳐 2부터 16,384까지!', icon: '🔢' },
  { id: 'candy', name: '캔디', price: 25, description: '반짝이는 포장지 속 소용돌이 사탕.', icon: '🍬' },
  { id: 'pastel', name: '파스텔', price: 20, description: '바느질 무늬가 담긴 포근한 봉제 열매.', icon: '🎨' },
  { id: 'pixel', name: '픽셀', price: 30, description: '작은 네모가 모인 추억 속 픽셀 과일.', icon: '👾' },
  { id: 'cat', name: '고양이', price: 35, description: '보드라운 털과 작은 방울 목걸이의 고양이.', icon: '🐱' },
  { id: 'ice', name: '얼음', price: 35, description: '맑은 얼음 속에서 반짝이는 시원한 열매.', icon: '🧊' },
  { id: 'neon', name: '네온', price: 40, description: '빛나는 회로가 흐르는 아케이드 구슬.', icon: '💡' },
  { id: 'galaxy', name: '행성', price: 50, description: '수성·지구·목성·토성부터 태양까지, 작은 태양계.', icon: '🪐' },
  { id: 'gem', name: '크리스탈', price: 60, description: '투명한 면마다 빛이 흐르는 크리스탈 열매.', icon: '💎' },
  { id: 'mystery', name: '???', price: 999, description: '999개의 반짝임 뒤에 숨은 특별한 모습을 만나보세요.', icon: '❔' },
  { id: 'cars', name: '차고의 전설', price: 100, description: '기아부터 부가티까지, 14가지 자동차 브랜드 배지.', icon: '🏎️' },
  { id: 'fruit3d', name: '3D 과일', price: 80, description: '빛과 그림자, 껍질의 질감이 살아 있는 입체 과일.', icon: '🍒' },
  { id: 'food', name: '야식 정원', price: 75, description: '도넛·초밥·피자·햄버거로 차리는 한 상.', icon: '🍔' },
  { id: 'royalGem', name: '보석 광산', price: 9999, description: '합칠 때마다 보석 +1. 10단계 이상 보석을 합치면 +10.', icon: '💠' },
]);

export const HATS = catalog([
  {id:'none',name:'맨머리',price:0,icon:'🙂'}, {id:'cap',name:'야구 모자',price:20,icon:'🧢'},
  {id:'flower',name:'꽃 한 송이',price:35,icon:'🌼'}, {id:'wizard',name:'마법사',price:60,icon:'🧙'},
  {id:'crown',name:'정원 왕관',price:100,icon:'👑'},
]);

export const BACKGROUNDS = catalog([
  { id: 'default', name: '기본정원', price: 0, description: '햇살이 머무는 포근하고 밝은 정원.', icon: '🌱' },
  { id: 'sunset', name: '노을', price: 18, description: '분홍빛과 살구빛 노을 아래 쉬어가요.', icon: '🌅' },
  { id: 'forest', name: '숲', price: 20, description: '초록 잎 사이로 바람이 스치는 숲속 정원.', icon: '🌲' },
  { id: 'ocean', name: '바다', price: 25, description: '잔잔한 푸른빛이 일렁이는 바닷가.', icon: '🌊' },
  { id: 'night', name: '별밤', price: 30, description: '별이 반짝이는 깊고 고요한 밤하늘.', icon: '🌠' },
]);

export const BASKETS = catalog([
  { id: 'classic', name: '기본바구니', price: 0, description: '언제나 편안한 기본 정원 바구니.', icon: '🧺' },
  { id: 'wood', name: '나무', price: 12, description: '자연의 결이 느껴지는 따뜻한 나무 테두리.', icon: '🪵' },
  { id: 'bubble', name: '버블', price: 20, description: '비눗방울처럼 맑고 둥근 테두리.', icon: '🫧' },
  { id: 'gold', name: '골드', price: 35, description: '수확을 더욱 빛내주는 반짝이는 금빛 테두리.', icon: '👑' },
  { id: 'aurora', name: '오로라', price: 45, description: '신비로운 오로라빛으로 둘러싼 정원.', icon: '🌈' },
]);

export const ITEMS = catalog([
  { id: 'eraser', name: '선택지우개', price: 8, description: '원하는 과일 하나를 직접 골라 지워요.', icon: '✦' },
  { id: 'shake', name: '흔들기', price: 5, description: '1개로 1회 사용해요. 보석으로 구매하거나 특별 사과를 합쳐 얻어요.', icon: '🌀' },
  { id: 'calm', name: '작은 과일 정리', price: 6, description: '작은 과일부터 3개를 삭제해 바구니에 틈을 만들어요.', icon: '🧹' },
]);
