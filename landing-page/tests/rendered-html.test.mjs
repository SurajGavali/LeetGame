import assert from "node:assert/strict";
import test from "node:test";

import "./binary-search-engine.test.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://leetgame.example/", {
      headers: {
        accept: "text/html",
        host: "leetgame.example",
        "x-forwarded-host": "leetgame.example",
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LeetGame landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>LeetGame — Play the problem\. Code the pattern\.<\/title>/i,
  );
  assert.match(html, /Play the problem/);
  assert.match(html, /Code the pattern/);
  assert.match(html, /Warehouse Hunt/);
  assert.match(html, /Find the parcel before the scanner dies\./);
  assert.match(html, /Clock in/);
  assert.match(html, /3 shipments/);
  assert.match(html, /7 → 15 → 31 racks/);
  assert.match(html, /RUSH MANIFEST/);
  assert.match(html, /FIND P-<!-- -->\d+/);
  assert.match(html, /No lecture before the win\./);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /Best Time to Buy and Sell Stock/);
  assert.doesNotMatch(html, /MAX SO FAR/);
  assert.doesNotMatch(html, /Can you beat the market\?/);
  assert.doesNotMatch(html, /BINARY SEARCH/);
  assert.match(html, /\/leetgame-symbol\.svg/);
  assert.match(html, /https:\/\/leetgame\.example\/og\.png/);
});

test("ships without starter preview artifacts", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
});
