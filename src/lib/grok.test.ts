import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsModelDraft } from "./draft-status";
import { enteredComment, readLiveInput } from "./live-reply";
import { fixtures } from "./fixtures";
import { cleanReply, grokPrompt, rejectReply, replyText } from "./grok";
import type { CommentRecord } from "./store";

describe("grok", () => {
  const join = fixtures.find((item) => item.id === "train-c04");
  assert.ok(join);

  it("asks for a human reply to this comment, with no link", () => {
    const prompt = grokPrompt(join);
    assert.match(prompt.system, /person who typed it/);
    assert.match(prompt.system, /as long as the reply needs/);
    assert.doesNotMatch(prompt.system, /one or two sentences|two or three sentences|four or five sentences/i);
    assert.match(prompt.system, /No links/);
    assert.match(prompt.user, /how do i actually join/i);
    assert.match(prompt.user, /no links/i);
    const folk = fixtures.find((item) => item.id === "out-threads-folk-friday");
    assert.ok(folk);
    const folkPrompt = grokPrompt(folk);
    assert.match(folkPrompt.user, /song title/i);
    assert.match(folkPrompt.system, /Do not mention the loss/);
    assert.doesNotMatch(`${prompt.system}\n${prompt.user}`, /XAI_API_KEY|Bearer /);
  });

  it("keeps a spoken reply and rejects a policy line or a link", () => {
    assert.equal(rejectReply("Yeah, there's an app. This page isn't where you sign up.", join), null);
    assert.match(rejectReply("I won't paste a link.", join) ?? "", /Stock phrasing/);
    assert.match(rejectReply("Join at https://waitlist.cityjam.example/", join) ?? "", /link/i);
  });

  it("sends a new reply to the model and leaves a handoff alone", () => {
    const sheet: CommentRecord = {
      draft: "Hello.",
      source: "sheet",
      model: null,
      grokNote: null,
      testerA: null,
      testerB: null,
      approvedText: null,
      outcome: "open",
    };
    const reply = fixtures.find((item) => item.id === "out-threads-folk-friday");
    const handoff = fixtures.find((item) => item.expected === "handoff");
    assert.ok(reply);
    assert.ok(handoff);
    assert.equal(needsModelDraft(reply, sheet), true);
    assert.equal(needsModelDraft(handoff, sheet), false);
    assert.equal(needsModelDraft(reply, { ...sheet, source: "grok" }), false);
  });

  it("saves an entered comment as the text shown in the queue", () => {
    assert.equal(enteredComment("  ", "others", "entered-blank").ok, false);
    const saved = enteredComment("  Try this song.  ", "own", "entered-1");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.fixture.id, "entered-1");
    assert.equal(saved.fixture.comment, "Try this song.");
    assert.equal(saved.fixture.post, "Try this song.");
    assert.equal(saved.fixture.place, "own");
  });

  it("needs the post before a live reply", () => {
    assert.equal(readLiveInput("", "Hello", "others").ok, false);
    const ready = readLiveInput("Today's tune is Branding Iron.", "", "others");
    assert.equal(ready.ok, true);
    if (ready.ok) {
      assert.equal(ready.fixture.place, "others");
      assert.equal(ready.fixture.comment, ready.fixture.post);
    }
  });

  it("does not fix the reply to a sentence count", () => {
    const ready = readLiveInput(
      "Hi, everyone! Could you recommend some good music? Or recommend a playlist, an artist, or an underrated artist?",
      "",
      "others",
    );
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const prompt = grokPrompt(ready.fixture);
    assert.match(prompt.user, /as many sentences as this reply needs/);
    assert.doesNotMatch(`${prompt.system}\n${prompt.user}`, /one or two sentences|name two songs/i);
    assert.equal(rejectReply("Give Little Simz and Sampha a go.", ready.fixture), null);
    assert.equal(
      rejectReply(
        "There is an app, and you join in the app. This page is the post, not the sign-up. I have no link to give you.",
        ready.fixture,
      ),
      null,
    );
  });

  it("reads only the reply out of a chat completion", () => {
    assert.equal(
      replyText({ choices: [{ message: { content: "  \"Glad it landed today.\"  " } }] }),
      "Glad it landed today.",
    );
    assert.equal(cleanReply("Reply: Yeah, there's an app.\nThis page isn't the form."), "Yeah, there's an app. This page isn't the form.");
    assert.equal(cleanReply("<|eos|>"), "");
  });
});
