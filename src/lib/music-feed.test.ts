import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { musicFeed, nextMusicComment } from "./music-feed";

describe("music feed", () => {
  it("only offers music comments, and skips the ones already fetched", () => {
    assert.ok(musicFeed.length >= 2);
    assert.ok(musicFeed.every((item) => item.category === "music"));
    const first = nextMusicComment([]);
    assert.ok(first);
    assert.equal(first.category, "music");
    const second = nextMusicComment([first.id]);
    assert.ok(second);
    assert.notEqual(second.id, first.id);
    assert.equal(nextMusicComment(musicFeed.map((item) => item.id)), undefined);
  });
});
