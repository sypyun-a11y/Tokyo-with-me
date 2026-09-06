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

  // The app exposes its source-of-truth data through global `var` declarations.
  eval(match[1]);
  return { DAYS, FOOD, CAFES, P, PREP };
}

function dayPlaces(day) {
  return day.slots.map((slot) => slot.p);
}

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
