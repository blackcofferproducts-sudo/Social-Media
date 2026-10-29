import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsModelDraft } from "./draft-status";
import { readLiveInput } from "./live-reply";
import { fixtures } from "./fixtures";
import { cleanReply, grokPrompt, rejectReply, replyText } from "./grok";
import type { CommentRecord } from "./store";

describe("grok", () => {
  const join = fixtures.find((item) => item.id === "train-c04");
  assert.ok(join);

  it("asks for a human reply to this comment, with no link", () => {
    const prompt = grokPrompt(join);
    assert.match(prompt.system, /person who typed it/);
    assert.match(prompt.system, /One or two sentences/);
    assert.match(prompt.system, /name two and stop/);
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

  it("needs the post before a live reply", () => {
    assert.equal(readLiveInput("", "Hello", "others").ok, false);
    const ready = readLiveInput("Today's tune is Branding Iron.", "", "others");
    assert.equal(ready.ok, true);
    if (ready.ok) {
      assert.equal(ready.fixture.place, "others");
      assert.equal(ready.fixture.comment, ready.fixture.post);
    }
  });

  it("keeps a music recommendation to two names", () => {
    const ready = readLiveInput(
      "Hi, everyone! Could you recommend some good music? Or recommend a playlist, an artist, or an underrated artist? I've been stuck on my 2018 playlist ever since I got busy. I wanna go back to listening to new songs. TIA!!",
      "",
      "others",
    );
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const prompt = grokPrompt(ready.fixture);
    assert.match(prompt.user, /Name two songs or artists and stop/);
    assert.equal(
      rejectReply("English Teacher, The World's Biggest Paving Slab. And Wet Leg, Ur Mum.", ready.fixture),
      null,
    );
    assert.match(
      rejectReply(
        "That 2018 playlist is the thing I can actually see, same songs dropping in before you've even decided you want anything on. It makes me want to put one new artist in front of it and leave you with just that. Try English Teacher and start with The World's Biggest Paving Slab, it's talky and bright and a bit wonky, like the room just woke up. The next couple of tracks sit right beside it, so just let them run. You'll know in about a minute if you want the rest.",
        ready.fixture,
      ) ?? "",
      /Name two songs or artists and stop/,
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
