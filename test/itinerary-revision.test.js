const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

function loadTripData() {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1);
  if (!match) throw new Error('Inline app script not found');

  const elements = new Map();
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.window = { scrollTo: () => {} };
  global.navigator = {};
  global.document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          style: {},
          classList: { add() {}, remove() {}, toggle() {} },
          addEventListener() {},
          innerHTML: '',
          textContent: '',
        });
      }
      return elements.get(id);
    },
    querySelectorAll: () => [],
    createElement: () => ({}),
    head: { appendChild() {} },
    body: { style: {} },
    addEventListener() {},
  };
  global.setInterval = () => {};
  global.L = {};

  eval(match[1]);
  return { DAYS, FOOD, CAFES, P, PREP };
}

function dayPlaces(day) {
  return day.slots.map((slot) => slot.p);
}

test('hotel pin uses the booked CANDEO Shimbashi address at 新橋 3-6-8', () => {
  const { P } = loadTripData();

  assert.equal(P.hotel.n, '칸데오 호텔즈 도쿄 신바시');
  assert.ok(Math.abs(P.hotel.lat - 35.66584) < 0.0001, 'hotel latitude must match 新橋 3-6-8');
  assert.ok(Math.abs(P.hotel.lng - 139.75514) < 0.0001, 'hotel longitude must match 新橋 3-6-8');
});

test('Day 1 starts at Seodaemun Intersection on Airport Limousine 6002, not a generic Gwanghwamun coordinate', () => {
  const { DAYS, P } = loadTripData();
  const slots = DAYS[0].slots;
  const stop = P.seodaemunBus;

  assert.ok(stop, 'Seodaemun bus stop must be a defined place');
  assert.equal(stop.n, '서대문역사거리 (신라스테이)');
  assert.match(stop.q, /Seodaemun Station Intersection/);
  assert.equal(stop.lat, undefined, 'no guessed coordinate for a two-direction bus stop');
  assert.ok(slots.some((slot) => slot.p === 'seodaemunBus' && /6002/.test(slot.name)));
  assert.ok(!slots.some((slot) => slot.p === 'home'));
});

test('Day 1 explains the Narita B1F → Keisei/Sky Access → Shimbashi path before the city itinerary', () => {
  const { DAYS } = loadTripData();
  const slots = DAYS[0].slots;
  const stationIndex = slots.findIndex((slot) => /B1F.*철도역/.test(slot.name));
  const gateIndex = slots.findIndex((slot) => /Keisei.*Sky Access.*개찰구/.test(slot.name));
  const trainIndex = slots.findIndex((slot) => /Access Express/.test(slot.name));

  assert.ok(stationIndex >= 0, 'B1F railway-station route must be visible');
  assert.ok(gateIndex > stationIndex, 'gate guidance must follow B1F guidance');
  assert.ok(trainIndex > gateIndex, 'train boarding must follow gate guidance');
  assert.match(slots[gateIndex].tip, /Suica/);
  assert.match(slots[trainIndex].warn, /都営浅草線|신바시/);
});

test('Day 1 follows Kanade Lounge → Mori Art Museum → Ginza → Gonpachi and excludes Happo/Asakusa', () => {
  const { DAYS } = loadTripData();
  const places = dayPlaces(DAYS[0]);

  assert.ok(places.includes('kanadeLounge'));
  assert.ok(places.includes('moriMuseum'));
  assert.ok(places.includes('ginzaWest'));
  assert.ok(places.includes('gonpachiNishiazabu'));
  assert.ok(!places.includes('happo'));
  assert.ok(!places.includes('sensoji'));
});

test('Day 2 exits DisneySea into Asakusa and does not detour through Ginza or Shimbashi Gado-shita', () => {
  const { DAYS } = loadTripData();
  const places = dayPlaces(DAYS[1]);

  assert.ok(places.includes('sea'));
  assert.ok(places.includes('sensoji'));
  assert.ok(places.includes('asakusaAlley'));
  assert.ok(!places.includes('yurakucho'));
  assert.ok(!places.includes('ginzasix'));
  assert.ok(!places.includes('gado'));
});

test('Day 3 is west-side shopping through Daikanyama and keeps Shinjuku out of the fixed itinerary', () => {
  const { DAYS } = loadTripData();
  const places = dayPlaces(DAYS[2]);

  ['f45', 'shibaPark', 'stussyHarajuku', 'kitsuneAoyama', 'barbourCatStreet', 'sky', 'tableauxLounge']
    .forEach((place) => assert.ok(places.includes(place), `${place} should be on Day 3`));
  assert.ok(!places.includes('shinjuku'));
});

test('Day 4 declares a FLEX Day and protects the 15:00 Shimbashi airport departure', () => {
  const { DAYS } = loadTripData();
  const day = DAYS[3];

  assert.match(day.theme, /FLEX/i);
  assert.ok(day.slots.some((slot) => slot.t === '15:00' && slot.p === 'hotel'));
  assert.ok(day.slots.some((slot) => slot.p === 'granstaTokyo'));
});

test('Day 1 and Day 3 food candidates include the user-selected Ginza and Shibuya katsu shops', () => {
  const { FOOD, P } = loadTripData();
  const day1 = JSON.stringify(FOOD['2026-09-12']);
  const day3 = JSON.stringify(FOOD['2026-09-14']);

  assert.match(day1, /이마카츠 긴자점/);
  assert.match(day3, /카츠동야 즈이초/);
  assert.match(day3, /신주쿠 사카에즈시 서쪽출구점/);
  assert.equal(P.imakatsuGinza.a, '〒104-0061 東京都中央区銀座4-13-18');
  assert.equal(P.zuichoShibuya.a, '〒150-0042 東京都渋谷区宇田川町41-26');
  assert.equal(P.sakaeZushiNishiguchi.a, '〒160-0023 東京都新宿区西新宿1-18-16');
});

test('food and cafe candidates remove Ginza Happo and include the newly curated places', () => {
  const { FOOD, CAFES, P, PREP } = loadTripData();
  const foodText = JSON.stringify(FOOD);
  const cafes = CAFES.map((cafe) => cafe.n);

  assert.doesNotMatch(foodText, /긴자 핫포|銀座八芳/);
  assert.ok(!Object.hasOwn(P, 'happo'));
  assert.doesNotMatch(JSON.stringify(PREP), /긴자 핫포|銀座八芳/);
  ['긴자 텐류', '긴자 오보로즈키', '토라후쿠 아오야마 본점', '야키니쿠 사이몬', '키칸보', '카메야']
    .forEach((name) => assert.match(foodText, new RegExp(name)));
  ['카나데 라운지', '긴자 웨스트 본점', '마츠바야 사료', '하코부네 갤러리']
    .forEach((name) => assert.ok(cafes.includes(name), `${name} should be visible in the cafe tab`));
});
