import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { clearThreadsSearchCache, postsFromThreadsSearch, searchThreadsMusic, THREADS_SEARCH_URL } from "./threads";

describe("threads search", () => {
  afterEach(() => clearThreadsSearchCache());

  it("turns a Threads payload into queue posts and drops blanks", () => {
    const posts = postsFromThreadsSearch({
      data: [
        { id: "111", text: "Anyone got a song for a late bus?", username: "late.bus" },
        { id: "222", text: "   ", username: "blank" },
        { text: "no id" },
      ],
    });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, "threads-111");
    assert.equal(posts[0].author, "late.bus");
    assert.equal(posts[0].comment, "Anyone got a song for a late bus?");
    assert.equal(posts[0].post, posts[0].comment);
    assert.equal(posts[0].accountId, "threads");
    assert.equal(posts[0].place, "others");
    assert.equal(posts[0].category, "music");
    assert.equal(posts[0].suggestedDraft, "");
  });

  it("does not invent a post when Threads returns nothing", () => {
    assert.deepEqual(postsFromThreadsSearch({ data: [] }), []);
    assert.deepEqual(postsFromThreadsSearch({}), []);
  });

  it("asks Threads keyword search and keeps the token out of the result", async () => {
    let called = "";
    const result = await searchThreadsMusic({
      token: "secret-token-value",
      query: "music",
      fetchImpl: async (url) => {
        called = String(url);
        return new Response(
          JSON.stringify({
            data: [{ id: "9", text: "New song out tonight.", username: "night.bus" }],
          }),
        );
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.posts[0].comment, "New song out tonight.");
    const parsed = new URL(called);
    assert.equal(`${parsed.origin}${parsed.pathname}`, THREADS_SEARCH_URL);
    assert.equal(parsed.searchParams.get("q"), "music");
    assert.equal(parsed.searchParams.get("search_type"), "RECENT");
    assert.equal(parsed.searchParams.get("access_token"), "secret-token-value");
    assert.equal(JSON.stringify(result).includes("secret-token-value"), false);
  });

  it("reports a missing token without calling Threads", async () => {
    let called = false;
    const result = await searchThreadsMusic({
      token: "",
      fetchImpl: async () => {
        called = true;
        return new Response("{}");
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.note, /THREADS_ACCESS_TOKEN/);
    assert.equal(called, false);
  });

  it("passes through an API error without the token", async () => {
    const result = await searchThreadsMusic({
      token: "secret-token-value",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: "Invalid OAuth access token secret-token-value" } }), {
          status: 400,
        }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.note, /Invalid OAuth/);
      assert.equal(result.note.includes("secret-token-value"), false);
    }
  });
});
