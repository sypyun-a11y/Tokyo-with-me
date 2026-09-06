const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1] ?? '';

test('access gate never persists a successful code between page loads', () => {
  assert.doesNotMatch(script, /LS_KEY\+':ok'/);
  assert.doesNotMatch(script, /localStorage\.setItem\([^)]*:ok/);
  assert.match(html, /<div class="gate" id="gate">/);
});
