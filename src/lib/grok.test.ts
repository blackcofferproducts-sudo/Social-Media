import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixtures } from "./fixtures";
import { cleanReply, grokPrompt, rejectReply, replyText } from "./grok";

describe("grok", () => {
  const join = fixtures.find((item) => item.id === "train-c04");
  assert.ok(join);

  it("asks for a human reply to this comment, with no link", () => {
    const prompt = grokPrompt(join);
    assert.match(prompt.system, /person who typed it/);
    assert.match(prompt.system, /No links/);
    assert.match(prompt.user, /how do i actually join/i);
    assert.match(prompt.user, /no links/i);
    assert.doesNotMatch(`${prompt.system}\n${prompt.user}`, /XAI_API_KEY|Bearer /);
  });

  it("keeps a spoken reply and rejects a policy line or a link", () => {
    assert.equal(rejectReply("Yeah, there's an app. This page isn't where you sign up.", join), null);
    assert.match(rejectReply("I won't paste a link.", join) ?? "", /Stock phrasing/);
    assert.match(rejectReply("Join at https://waitlist.cityjam.example/", join) ?? "", /link/i);
  });

  it("reads only the reply out of a chat completion", () => {
    assert.equal(
      replyText({ choices: [{ message: { content: "  \"Glad it landed today.\"  " } }] }),
      "Glad it landed today.",
    );
    assert.equal(cleanReply("Reply: Yeah, there's an app.\nThis page isn't the form."), "Yeah, there's an app. This page isn't the form.");
  });
});
