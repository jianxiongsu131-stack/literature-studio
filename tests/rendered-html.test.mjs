import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Yanji literature workspace", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>研迹 · 文献研究工作台<\/title>/);
  assert.match(html, /从一个论文项目开始/);
  assert.match(html, /AI 辅助文献阅读与深度思考/);
  assert.match(html, /设置/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("AI route rejects incomplete connection data without contacting a provider", async () => {
  const response = await request("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "AI 连接信息不完整" });
});

test("source keeps API credentials out of persisted workspace data", async () => {
  const [page, route, settings] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SettingsCenter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const aiCredentialRef = useRef\(""\)/);
  assert.doesNotMatch(page, /saveWorkspaceValue\([^\n]*credential/i);
  assert.match(route, /generativelanguage\.googleapis\.com/);
  assert.match(settings, /密钥只保留在当前页面会话中/);
});
