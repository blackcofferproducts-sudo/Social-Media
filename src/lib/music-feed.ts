import type { Fixture } from "./fixture";

export const musicFeed: Fixture[] = [
  {
    id: "music-feed-playlist",
    accountId: "threads",
    place: "others",
    author: "stuck.on.2018",
    post: "Hi, everyone! Could you recommend some good music? Or recommend a playlist, an artist, or an underrated artist? I've been stuck on my 2018 playlist ever since I got busy. I wanna go back to listening to new songs. TIA!!",
    comment:
      "Hi, everyone! Could you recommend some good music? Or recommend a playlist, an artist, or an underrated artist? I've been stuck on my 2018 playlist ever since I got busy. I wanna go back to listening to new songs. TIA!!",
    category: "music",
    signal: "ordinary",
    expected: "reply",
    suggestedDraft: "",
  },
  {
    id: "music-feed-branding-iron",
    accountId: "threads",
    place: "others",
    author: "folk.fridays",
    post: "Folk Friday. Today's tune is Branding Iron, off The Fabled City. Putting it on while the room is quiet.",
    comment: "Folk Friday. Today's tune is Branding Iron, off The Fabled City.",
    category: "music",
    signal: "ordinary",
    expected: "reply",
    suggestedDraft: "",
  },
  {
    id: "music-feed-kitchen",
    accountId: "threads",
    place: "others",
    author: "kitchen.takes",
    post: "Just finished a song. Recorded it on my phone in the kitchen at 1am because the flat was finally quiet.",
    comment: "Recorded it on my phone in the kitchen at 1am. Not signed to a label, so this is the rough version.",
    category: "music",
    signal: "ordinary",
    expected: "reply",
    suggestedDraft: "",
  },
  {
    id: "music-feed-underrated",
    accountId: "threads",
    place: "others",
    author: "late.bus",
    post: "Name one underrated artist you keep sending to friends. Mine is still sitting in a notes app.",
    comment: "Name one underrated artist you keep sending to friends.",
    category: "music",
    signal: "ordinary",
    expected: "reply",
    suggestedDraft: "",
  },
];

export function nextMusicComment(seenIds: string[]) {
  const seen = new Set(seenIds);
  return musicFeed.find((item) => item.category === "music" && !seen.has(item.id));
}
