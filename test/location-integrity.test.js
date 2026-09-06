const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

function loadTripData() {
  const html = fs.readFileSync('index.html', 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
  const elements = new Map();
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.window = { scrollTo() {} };
  global.navigator = {};
  global.document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { style:{}, classList:{add(){},remove(){},toggle(){}}, addEventListener(){}, innerHTML:'', textContent:'' });
      return elements.get(id);
    },
    querySelectorAll: () => [], createElement: () => ({}), head:{appendChild(){}}, body:{style:{}}, addEventListener() {},
  };
  global.L = {}; global.setInterval = () => {};
  eval(script);
  return { P, DAYS, FOOD, CAFES, dirUrl, mapUrl };
}

function referencedPlaceKeys(DAYS, FOOD) {
  const keys = new Set();
  DAYS.forEach((day) => {
    day.pins.forEach((key) => keys.add(key));
    day.slots.forEach((slot) => keys.add(slot.p));
  });
  Object.values(FOOD).forEach((day) => Object.values(day).forEach((items) => {
    items.forEach((item) => { if (item.pk) keys.add(item.pk); });
  }));
  return keys;
}

test('every place used by the itinerary and food cards has a full address and exact Google Maps query', () => {
  const { P, DAYS, FOOD } = loadTripData();
  const missing = [...referencedPlaceKeys(DAYS, FOOD)]
    .filter((key) => !P[key]?.a || !P[key]?.q)
    .map((key) => `${key}: ${JSON.stringify(P[key])}`);

  assert.deepEqual(missing, []);
});

test('hotel directions search the booked CANDEO Shimbashi address, not an approximate coordinate', () => {
  const { dirUrl, mapUrl } = loadTripData();
  const expected = encodeURIComponent('CANDEO HOTELS 東京新橋 東京都港区新橋3-6-8');

  assert.match(dirUrl('hotel'), new RegExp(expected));
  assert.match(mapUrl('hotel'), new RegExp(expected));
});

test('every cafe card has a full address and exact branch-specific Google Maps query', () => {
  const { CAFES } = loadTripData();
  const missing = CAFES
    .filter((cafe) => !cafe.a || !cafe.q)
    .map((cafe) => cafe.n);

  assert.deepEqual(missing, []);
});
