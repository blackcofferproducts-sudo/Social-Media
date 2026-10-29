import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { musicFeed, nextMusicComment } from "./music-feed";

describe("music feed", () => {
  it("does not invent comments", () => {
    assert.equal(musicFeed.length, 0);
    assert.equal(nextMusicComment([]), undefined);
    assert.equal(nextMusicComment(["music-feed-playlist"]), undefined);
  });
});
