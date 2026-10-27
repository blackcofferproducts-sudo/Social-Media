import fs from "node:fs";
import path from "node:path";
import { roboticPhrase } from "./comment-model";
import type { Fixture } from "./fixture";

export type SheetExample = {
  id: string;
  type: "comment" | "convo";
  category: string;
  post: string;
  intent: string;
  userWordCount: number;
  turns: Array<{ kind: "user" | "gap"; speaker: string; text: string }>;
};

const CRISIS = /\b(?:kill myself|suicide|end my life|don't want to (?:live|be here)|do not want to (?:live|be here))\b/i;

const STOP = new Set(
  "this that with from your have been will they them their what when where which about just like into over after before because there here would could should today every each also than then some more most only same very much many really gonna wanna".split(
    " ",
  ),
);

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function loadSheet(csv = readSheet()): SheetExample[] {
  const [header, ...rows] = parseCsv(csv);
  const col = (name: string) => header.findIndex((cell) => cell.trim() === name);
  const id = col("id");
  const type = col("type");
  const category = col("category");
  const post = col("platform_context");
  const text = col("text_or_turns");
  const intent = col("expected_engagement_intent");
  const words = col("user_word_count");
  return rows.map((cells) => ({
    id: cells[id].trim(),
    type: cells[type].trim() === "convo" ? "convo" : "comment",
    category: cells[category].trim(),
    post: cells[post].trim(),
    intent: cells[intent].trim(),
    userWordCount: Number(cells[words]) || 0,
    turns: parseTurns(cells[text].trim()),
  }));
}

function readSheet() {
  return fs.readFileSync(path.join(process.cwd(), "data/training/sample-engagement.csv"), "utf8");
}

export function parseTurns(raw: string): SheetExample["turns"] {
  return raw
    .split(/\s*\|\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^\[AI REPLY HERE\]$/i.test(part)) return { kind: "gap" as const, speaker: "", text: "" };
      const matched = part.match(/^@(\S+):\s*([\s\S]*)$/);
      if (!matched) return { kind: "user" as const, speaker: "", text: part };
      return { kind: "user" as const, speaker: matched[1], text: matched[2].trim() };
    });
}

function words(text: string) {
  return new Set((text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []).filter((word) => !STOP.has(word)));
}

export function nearestIds(examples: SheetExample[], id: string, limit = 2) {
  const current = examples.find((example) => example.id === id);
  if (!current) return [];
  const mine = words(userBlob(current));
  return examples
    .filter((example) => example.id !== id)
    .map((example) => {
      const theirs = words(userBlob(example));
      let shared = 0;
      for (const word of mine) if (theirs.has(word)) shared += 1;
      return { id: example.id, shared };
    })
    .sort((a, b) => b.shared - a.shared || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => item.id);
}

function userBlob(example: SheetExample) {
  return example.turns
    .filter((turn) => turn.kind === "user")
    .map((turn) => turn.text)
    .join(" ");
}

export function isCrisis(text: string) {
  return CRISIS.test(text);
}

export function draftReply(userText: string, intent: string, category: string): string {
  if (isCrisis(userText)) return "";
  const said = userText.replace(/\s+/g, " ").trim();
  const lower = said.toLowerCase();
  const want = intent.toLowerCase();
  const lines: string[] = [];

  if (/\b(?:another ai|are you (?:a |an )?bot|automated)\b/.test(lower)) {
    lines.push("Someone drafts this, and Pat reads the words before it goes up.");
  }
  if (/who actually listens|real people/.test(lower)) {
    lines.push("People listen to the tracks. A follower count doesn't get them heard.");
  }

  if (category.startsWith("Praise")) lines.push(...praise(lower, want));
  else if (category.startsWith("Joining")) lines.push(...joining(lower, want));
  else if (category.startsWith("Collaboration")) lines.push(...collab(lower, want));
  else if (category.startsWith("Studio")) lines.push(...studio(lower, want));
  else if (category.startsWith("Rights")) lines.push(...rights(lower, want));
  else if (category.startsWith("Release")) lines.push(...release(lower, want));
  else if (category.startsWith("Sync")) lines.push(...sync(lower, want));
  else if (category.startsWith("Gear")) lines.push(...gear(lower, want));
  else if (category.startsWith("Scene")) lines.push(...scene(lower, want));
  else if (category.startsWith("Feedback")) lines.push(...feedback(lower, want));
  else if (category.startsWith("Burnout")) lines.push(...burnout(lower, want));
  else if (category.startsWith("Mild")) lines.push(...sceptic(lower, want));

  if (/what they are working on this week/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you working on this week?");
  }
  if (/what they are listening to/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you listening to?");
  }
  if (/ask what they listen for/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you listening for when you say it's done?");
  }
  if (/ask about their scene/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("Where are you actually managing to play?");
  }

  if (lines.filter(Boolean).length === 0) {
    lines.push("Say the bit you want answered and I'll take that.");
  }
  const draft = lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (/https?:\/\/|waitlist\.cityjam/i.test(draft)) {
    throw new Error(`Training draft included a link: ${draft}`);
  }
  const robotic = roboticPhrase(draft);
  if (robotic) throw new Error(`Training draft sounded like a policy note (${robotic}): ${draft}`);
  return draft;
}

function praise(lower: string, want: string) {
  const lines: string[] = [];
  if (/energy i needed/.test(lower)) lines.push("Glad it landed today.");
  else if (/follower counts|numbers are tiny/.test(lower)) {
    lines.push("Yeah. Getting knocked back because the numbers are tiny is rough.");
  } else if (/best line/.test(lower)) lines.push("Glad that line stuck.");
  else if (/where can i read|covers look/.test(lower)) {
    lines.push("The covers are doing the work. I don't have a link I can send for the Magazine yet.");
  } else if (/live stuff|just releases/.test(lower)) {
    lines.push("Live shows as well as releases.");
  } else if (/thank/.test(want)) lines.push("Glad that one landed.");
  if (/feature/.test(want) && !lines.some((line) => /Feature/.test(line))) {
    lines.push("If the record's finished, send that. The Feature listens to the sound, not the count.");
  }
  return lines;
}

function joining(lower: string, want: string) {
  const lines: string[] = [];
  if (/how do i actually join|is there an app/.test(lower)) {
    lines.push("Yeah, there's an app. This page isn't where you sign up.");
  } else if (/released stuff|just demos|join with just demos/.test(lower)) {
    lines.push("Demos are enough to join. The Feature is the one that wants a finished record.");
  } else if (/session bassist|not really an artist/.test(lower)) {
    lines.push("Creator Labs is for people putting their own music out. If you're playing on other people's sessions, Marketplace is the closer fit.");
  } else if (/difference between maestro and creator labs/.test(lower)) {
    lines.push("Creator Labs is for making your own music. Maestro is a different path, and it has a waitlist.");
  } else if (/maestro sounds like me|how do i get on that/.test(lower)) {
    lines.push("If Maestro's the fit, the waitlist is how you ask.");
  } else if (/teach guitar/.test(lower)) {
    lines.push("Teaching, and producing a bit on the side, can sit with Maestro. Creator Labs is the other one, for your own records.");
  } else if (/music ambassador/.test(lower)) {
    lines.push("You don't have to be a big artist. Play, jam, and share what you love.");
  } else if (/\b34\b|late to start/.test(lower)) {
    lines.push("34 isn't late. SKEWL//HAUS is the practical side. It isn't a clock that starts at 18.");
  } else if (/mixing and the business/.test(lower)) {
    lines.push("Mixing and the business side both fit. SKEWL//HAUS is that practical stuff.");
  } else if (/skewl/.test(lower)) {
    lines.push("SKEWL//HAUS is for learning the work. It isn't a school that tells you you're late.");
  } else if (/like a course/.test(lower)) {
    lines.push("Creator Labs is people working on their own music together. Not a certificate.");
  }
  if (/maestro/.test(want) && !lines.some((line) => /Maestro/.test(line))) {
    lines.push("Maestro has a waitlist if that's the fit.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is for people making their own music.");
  }
  if (/marketplace/.test(want) && !lines.some((line) => /Marketplace/.test(line))) {
    lines.push("Marketplace is where session playing tends to fit.");
  }
  if (/play, jam|ambassador/.test(want) && !lines.some((line) => /jam/.test(line))) {
    lines.push("You don't have to be a big artist. Play, jam, and share what you love.");
  }
  return lines;
}

function collab(lower: string, want: string) {
  const lines: string[] = [];
  if (/singapore|\bhouse\b/.test(lower)) {
    lines.push("House, and remote is fine. You're welcome here the same as anywhere else.");
  } else if (/remote is totally fine|vocal chain/.test(lower)) {
    lines.push("Remote's fine. A decent chain at home is enough to say.");
  } else if (/2-step|swung beat/.test(lower)) {
    lines.push("A voice that can sit on a swung beat. Yeah, that's a real ask.");
  } else if (/lofi|boom bap|beats into the void/.test(lower)) {
    lines.push("Sending beats out and hearing nothing back does get old. People on here meet in Marketplace, or in Creator Labs if the music is yours.");
  } else if (/manila|ballads/.test(lower)) {
    lines.push("A ballad that wants to go somewhere weirder is welcome here, same as anywhere else.");
  } else if (/neo soul|voice memos/.test(lower)) {
    lines.push("Five songs on voice memos is enough to start looking.");
  } else if (/live already|coming soon/.test(lower)) {
    lines.push("I don't know if Marketplace is open yet.");
  }
  if (/marketplace/.test(want) && !lines.some((line) => /Marketplace/.test(line))) {
    lines.push("Marketplace is where people look for each other.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is the other room, for music you're making yourself.");
  }
  return lines;
}

function studio(lower: string, want: string) {
  const lines: string[] = [];
  if (/leeds|only in big cities/.test(lower)) {
    lines.push("I don't have a city list, so I can't tell you about Leeds. Pat would have to check that.");
  } else if (/what do you look at|what makes a studio|certified' tho/.test(lower)) {
    lines.push("I don't have the list of what gets checked. Pat would need to say what certified actually looks at.");
  } else if (/brixton|getting our studio certified/.test(lower)) {
    lines.push("A two-room place in Brixton can ask. The size isn't what decides it.");
  } else if (/first time booking|terrified|what should i bring/.test(lower)) {
    lines.push("First time is nerve-racking. Bring the song so you're not hunting for it, and one line on what you want done.");
  }
  if (/skewl/.test(want)) lines.push("SKEWL//HAUS has the longer version of how to prep.");
  if (/flag to pat|without inventing/.test(want) && !lines.some((line) => line.includes("Pat"))) {
    lines.push("Pat would have to confirm the rest.");
  }
  return lines;
}

function rights(lower: string, want: string) {
  const lines: string[] = [];
  if (/who owns what|wrote the song|made the beat/.test(lower)) {
    lines.push("If you wrote the song, that's the composition. Your mate's beat is a separate recording. Write the split down before it goes anywhere.");
  } else if (/never registered|lost all|collection society/.test(lower)) {
    lines.push("Four years unregistered isn't the same as it all being gone. Registering is still worth doing. I can't tell you there's money waiting.");
  } else if (/nobody explains it like a human|confusing/.test(lower)) {
    lines.push("It is confusing. Ask the next bit that's actually stuck.");
  } else if (/garage|four of us/.test(lower)) {
    lines.push("Four of you in a garage, and nothing written down, means any of you might have a claim. Get proper advice before money changes hands. I'm not a lawyer.");
  } else if (/old band|who owns the songs|never signed/.test(lower)) {
    lines.push("If the band's split, it isn't obvious from here who owns the songs. I'm not a lawyer.");
  } else if (/three columns|they all say different/.test(lower)) {
    lines.push("Three columns that don't match are often counting different things. I can't tell which one is the real number from a comment.");
  } else if (/royalty statement|cannot read it|distributor/.test(lower)) {
    lines.push("Royalty statements are a pain to read. Which bit is the stuck one?");
  }
  if (/skewl/.test(want) && !lines.some((line) => /SKEWL/.test(line))) {
    lines.push("SKEWL//HAUS walks through it more slowly.");
  }
  return lines;
}

function release(lower: string, want: string) {
  const lines: string[] = [];
  if (/artwork|isrc|pitched/.test(lower)) {
    lines.push("If the distributor makes the ISRC, don't make a second one. A pitch can just be a short note to people who already care.");
  } else if (/how far ahead|5 days/.test(lower)) {
    lines.push("Five days is tight if you want anyone to hear it before the date. Pick a day you can actually finish.");
  } else if (/need a label|playlists/.test(lower)) {
    lines.push("You don't need a label to pitch. That still doesn't mean a playlist will take it.");
  } else if (/single every 6 weeks|drop an ep|stopping me releasing/.test(lower)) {
    lines.push("If going back and forth is what's stopping you, put one song out. The EP can wait.");
  } else if (/first single|what am i forgetting/.test(lower)) {
    lines.push("Three weeks out, once the song and the artwork exist, tell the people who already care.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is there if you want other people around the choice.");
  }
  return lines;
}

function sync(lower: string, want: string) {
  const lines: string[] = [];
  if (/zero connections|closed club/.test(lower)) {
    lines.push("Sync is when someone uses the track in a film, an ad, or a game. No connections doesn't close that off, and it doesn't make it likely either.");
  } else if (/instrumentals/.test(lower)) {
    lines.push("Instrumentals get used, and so do songs with vocals. Clean titles and the writer names matter more than whether anyone's singing.");
  } else if (/stems|bounced/.test(lower)) {
    lines.push("A bounced master is enough to start. Stems help later, if they need to edit.");
  } else if (/student film|didn't get paid|did not get paid/.test(lower)) {
    lines.push("If you never agreed to that use, not being paid is a problem. It isn't a favour you owe them.");
  } else if (/buyout/.test(lower)) {
    lines.push("A buyout is usually one fee for a use they've written down, instead of royalties later. Read which uses they want. I don't have a number for it.");
  }
  if (/sync programme/.test(want) && !lines.some((line) => /Sync path/.test(line))) {
    lines.push("The Sync path is the one we have.");
  }
  return lines;
}

function gear(lower: string, want: string) {
  const lines: string[] = [];
  if (/wardrobe|laptop mic/.test(lower)) {
    lines.push("A wardrobe and a laptop mic still counts. If the song's there, the room isn't the verdict.");
  } else if (/vocals|too loud|buried/.test(lower)) {
    lines.push("Too loud, or buried under the synths. That's the usual fight. Bring the vocal up until the words are clear, then stop before it sits on top like a podcast.");
  } else if (/overcompress|bedroom mixes/.test(lower)) {
    lines.push("A lot of bedroom mixes are fine. If it won't breathe, the compressor's probably working too hard.");
  } else if (/sampler or groovebox/.test(lower)) {
    lines.push("If you're chopping records, a sampler matches that. A groovebox is the one box if you want drums and bass together. Either is a real start.");
  } else if (/chopping old records|live drums/.test(lower)) {
    lines.push("Chopping records, plus a bit of live drums, can live in a sampler. You don't have to buy both this week.");
  }
  if (/skewl/.test(want) && !lines.some((line) => /SKEWL/.test(line))) {
    lines.push("SKEWL//HAUS if you want it talked through.");
  }
  return lines;
}

function scene(lower: string, want: string) {
  const lines: string[] = [];
  if (/peckham|lewisham|south ideally/.test(lower)) {
    lines.push("Peckham and Lewisham way. Say what you play, and people who are actually there can answer.");
  } else if (/open jams|london people/.test(lower)) {
    lines.push("I don't have a night to send you to. People who are still going can say what's on.");
  }
  if (/rent is killing|rehearsal space/.test(lower)) {
    lines.push("Yeah, the rent is eating the rooms. I don't have a New York one to send you. Where are you actually managing to play?");
  }
  if (/haven't found my people|havent found my people/.test(lower)) {
    lines.push("A year in and still no people to play with is lonely.");
  }
  if (/afrobeats|jazz trio/.test(lower)) {
    lines.push("Afrobeats, and keys in a jazz trio. That's a real mix. Say it and people can find you.");
  }
  if (/singapore/.test(lower) && !lines.some((line) => /Singapore/.test(line))) {
    lines.push("You're welcome here, same as anywhere else. If you're making something, say what it is.");
  }
  if (/manila|same few venues/.test(lower)) {
    lines.push("You're welcome here, same as anywhere else. If other people in Manila are around, they can say so.");
  }
  if (/marketplace/.test(want) && !lines.some((line) => /Marketplace/.test(line))) {
    lines.push("Marketplace and Creator Labs are where people find each other.");
  }
  return lines;
}

function feedback(lower: string, want: string) {
  const lines: string[] = [];
  if (/grandad|mastered/.test(lower)) {
    lines.push("Finished, mixed, and mastered. Put that forward for the Feature, and keep your grandad in the song.");
  } else if (/ears on my demo|only for finished|before i send it/.test(lower)) {
    lines.push("The Feature is for a finished record. A demo that's still moving fits Creator Labs better.");
  } else if (/check my track|honest feedback|dreampop|would you listen/.test(lower)) {
    lines.push("I can't give the dreampop track a proper listen under this post. If it's finished, send the record. We listen to the sound.");
  } else if (/pls listen|please listen/.test(lower) || lower.length < 20) {
    lines.push("What did you make? I haven't heard it yet.");
  }
  if (/feature/.test(want) && !lines.some((line) => /Feature/.test(line))) {
    lines.push("The Feature is how a finished record gets put forward. They listen to the sound.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is the place for work that isn't finished yet.");
  }
  return lines;
}

function burnout(lower: string, want: string) {
  const lines: string[] = [];
  if (/10 years|dont even want to open the daw|don't even want to open/.test(lower)) {
    lines.push("Ten years in, and the DAW stays shut. You're not the only one.");
  } else if (/fun again|numbers and posting|posting schedules/.test(lower)) {
    lines.push("Yeah. It stops being fun once it's a posting schedule.");
  } else if (/like a course/.test(lower)) {
    lines.push("Creator Labs is people working on their own music together. Not a certificate.");
  } else if (/thinking of quitting/.test(lower)) {
    lines.push("That's a heavy thing to say. If it's more than the work, tell a person, not a comment.");
  } else if (/not the music|pitching, posting|chasing people/.test(lower)) {
    lines.push("If it's the pitching and the chasing, that part wears people out. The songs can stay.");
  } else if (/streams are flat|people love the songs/.test(lower)) {
    lines.push("Loved in the room and flat on the streams. That's a rough gap.");
  } else if (/holding (?:me|your career) back/.test(lower)) {
    lines.push("Good songs and nothing moving. That's a rough place to be.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is where people work on that with others around.");
  }
  if (/skewl/.test(want) && !lines.some((line) => /SKEWL/.test(line))) {
    lines.push("SKEWL//HAUS is the slower walk-through, when you want it.");
  }
  return lines;
}

function sceptic(lower: string, want: string) {
  const lines: string[] = [];
  if (/selling you something|what's actually different|whats actually different/.test(lower)) {
    lines.push("Fair. A lot of these end up as a pitch. Here the listen is the sound, not your follower count.");
  } else if (/judge by looks|identity-blind/.test(lower) && /stop that|how do you/.test(lower)) {
    lines.push("The sound is what gets heard first here. That doesn't wipe out the rest of the industry.");
  } else if (/story is part of my music/.test(lower)) {
    lines.push("The story can live in the song. Hearing the sound first doesn't mean the song has to be anonymous.");
  } else if (/don't care who i am|do not care who i am|identity-blind/.test(lower)) {
    lines.push("We hear it before we ask who you are. That's the whole of it.");
  } else if (/upwork|race to the bottom/.test(lower)) {
    lines.push("Yeah, that comparison would make me nervous too. The point here is the sound, not a race.");
  }
  if (/de-escalate/.test(want) && lines.length === 0) lines.push("Fair question.");
  return lines;
}

function handleOf(example: SheetExample) {
  const speaker = example.turns.find((turn) => turn.kind === "user" && turn.speaker)?.speaker;
  return speaker || example.id.toLowerCase();
}

function threadContext(example: SheetExample, drafted: string[]) {
  const users = example.turns.filter((turn) => turn.kind === "user");
  if (users.length < 2) return example.post;
  const earlier: string[] = [];
  let userIndex = 0;
  let draftIndex = 0;
  for (const turn of example.turns) {
    if (turn.kind === "user") {
      if (userIndex < drafted.length - 1) earlier.push(`${turn.speaker || "Them"}: ${turn.text}`);
      userIndex += 1;
    } else if (draftIndex < drafted.length - 1) {
      earlier.push(`CITY JAM: ${drafted[draftIndex] ?? ""}`);
      draftIndex += 1;
    } else draftIndex += 1;
  }
  if (earlier.length === 0) return example.post;
  return `${example.post}\n\nEarlier in the thread:\n${earlier.join("\n")}`;
}

export function trainFixtures(examples = loadSheet()): Fixture[] {
  return examples.map((example) => {
    const users = example.turns.filter((turn) => turn.kind === "user");
    const drafted = users.map((user) => draftReply(user.text, example.intent, example.category));
    const lastUser = users[users.length - 1];
    const crisis = users.some((user) => isCrisis(user.text));
    const latest = drafted[drafted.length - 1] ?? "";
    return {
      id: `train-${example.id.toLowerCase()}`,
      accountId: "threads",
      author: handleOf(example),
      post: threadContext(example, drafted),
      comment: lastUser?.text ?? "",
      category: "music",
      signal: crisis ? "sensitive" : "ordinary",
      expected: crisis ? "handoff" : "reply",
      suggestedDraft: crisis ? "" : latest,
      place: "own",
      training: {
        sheetId: example.id,
        sheetCategory: example.category,
        intent: example.intent,
        nearest: nearestIds(examples, example.id),
      },
    };
  });
}

export const trainedFixtures = trainFixtures();
