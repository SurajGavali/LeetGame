import assert from "node:assert/strict";
import test from "node:test";

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
  assert.match(html, /<title>LeetGame — Feel how algorithms work<\/title>/i);
  assert.match(html, /Don&#x27;t just solve it/);
  assert.match(html, /Feel how it works/);
  assert.match(html, /Challenge #122/);
  assert.match(html, /Best Time to Buy and Sell Stock/);
  assert.match(html, /Your eyes cheat\. The machine cannot\./);
  assert.match(html, /Become the loop/);
  assert.match(html, /MINIMUM MEMORY/);
  assert.match(html, /Future price hidden/);
  assert.match(html, /Reverse Integer/);
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
