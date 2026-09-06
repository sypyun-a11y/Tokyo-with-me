const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('index.html', 'utf8');

function meta(property) {
  const match = html.match(new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]+)"`));
  return match?.[1];
}

test('OG image uses the canonical, publicly accessible Vercel URL', () => {
  assert.equal(meta('og:url'), 'https://tokyo-with-me.vercel.app/');
  assert.equal(meta('og:image'), 'https://tokyo-with-me.vercel.app/og-image.png');
  assert.equal(meta('og:image:width'), '512');
  assert.equal(meta('og:image:height'), '512');
});
