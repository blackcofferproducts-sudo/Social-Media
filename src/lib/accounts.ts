export const accountIds = [
  "pat-x",
  "pat-linkedin",
  "cityjam-instagram",
  "cityjam-linkedin",
  "threads",
] as const;

export type AccountId = (typeof accountIds)[number];

export type SendMode = "mock" | "draft-only" | "threadify";

export type Account = {
  id: AccountId;
  label: string;
  short: string;
  platform: string;
  phase: "now" | "later";
  speaksAs: string;
  subjects: string[];
  handsOff: string[];
  samples: string[];
  send: SendMode;
  dailyCap: number;
  api: string;
  ceiling: string;
  access: string;
  metric: string;
};

export const accounts: Record<AccountId, Account> = {
  "pat-x": {
    id: "pat-x",
    label: "Pat Villaceran on X",
    short: "Pat · X",
    platform: "X",
    phase: "later",
    speaksAs: "Pat, in the first person, and shorter than LinkedIn.",
    subjects: ["His own work", "AI agents", "Innovation Philosophie"],
    handsOff: [
      "CITY JAM and the waitlist",
      "Dating and love",
      "The corporate music industry",
      "Press, partners, abuse, spam, and sensitive topics",
    ],
    samples: [
      "They finish a job. A chatbot answers. An agent I care about has a task, tools, and a point where the work is done.",
      "I write that down before it starts. Innovation Philosophie, for me, is knowing what the work is and who remains accountable when the agent has finished.",
    ],
    send: "draft-only",
    dailyCap: 20,
    api: "X API v2, POST /2/tweets with in_reply_to_tweet_id. Pay-per-use credits.",
    ceiling:
      "About 100 posts per user per 15 minutes, plus an app-wide daily cap. A reply to someone who did not mention or quote the account can be rejected on self-serve access. Confirm that rule on docs.x.com before any send is switched on.",
    access: "OAuth for Pat's own X account. The desk never asks for a password.",
    metric: "Resonance is not given a number yet. Drafts he chooses to post are the only X activity this desk records.",
  },
  "pat-linkedin": {
    id: "pat-linkedin",
    label: "Pat Villaceran, personal LinkedIn",
    short: "Pat · LinkedIn",
    platform: "LinkedIn",
    phase: "later",
    speaksAs: "Pat, in the first person. Fuller than X, and not a copy of an X post.",
    subjects: ["His own work", "AI agents", "Innovation Philosophie"],
    handsOff: [
      "CITY JAM and the waitlist",
      "Dating and love",
      "The corporate music industry",
      "Press, partners, abuse, spam, and sensitive topics",
    ],
    samples: [
      "Start from the job you want finished, not from the model. I use Innovation Philosophie for that: what the work is, who is accountable, and where the agent should stop. The demo can wait.",
    ],
    send: "draft-only",
    dailyCap: 10,
    api: "LinkedIn Community Management comments API. Personal replies need w_member_social_feed, which LinkedIn grants only to approved apps.",
    ceiling:
      "Personal-profile replies are restricted. Member activity data, if it is ever stored, is limited to 48 hours under LinkedIn's rules.",
    access:
      "OAuth as Pat, and only after LinkedIn approves the app. Until then the desk prepares a draft and Pat posts it himself.",
    metric:
      "Resonance has no number yet. The proposed measure is comments that receive a human follow-up within seven days.",
  },
  "cityjam-instagram": {
    id: "cityjam-instagram",
    label: "CITY JAM on Instagram",
    short: "CITY JAM · Instagram",
    platform: "Instagram",
    phase: "later",
    speaksAs: "CITY JAM. Independent music and the app's consumer features.",
    subjects: ["Independent music", "CITY JAM's consumer features", "The waitlist, when someone asks how to join"],
    handsOff: [
      "AIFF",
      "AI agents and Innovation Philosophie",
      "Dating and love",
      "The corporate music industry",
      "Press, partners, abuse, spam, and sensitive topics",
    ],
    samples: [
      "Yes. Independent artists, and an app for finding them.",
      "The app is on a waitlist for now. CITY JAM is where you find music from artists who release on their own. You can add your name here: https://waitlist.cityjam.example/?utm_source=instagram",
    ],
    send: "mock",
    dailyCap: 25,
    api: "Instagram API, POST /{comment-id}/replies. Private replies are a different endpoint and stay off.",
    ceiling:
      "Call budget scales with impressions (4,800 times impressions in a rolling day). Private replies allow 750 an hour. This desk does not send private replies.",
    access:
      "Instagram Login, or an admin role on the connected Page. Permission instagram_business_manage_comments or instagram_manage_comments.",
    metric:
      "Instagram growth has no number yet. Measure followers, profile visits, and reach in Instagram Insights, weekly, against a baseline.",
  },
  "cityjam-linkedin": {
    id: "cityjam-linkedin",
    label: "CITY JAM LinkedIn Page",
    short: "CITY JAM · LinkedIn Page",
    platform: "LinkedIn",
    phase: "later",
    speaksAs: "The CITY JAM page. Use we only for the page, never for Pat.",
    subjects: ["Independent music", "CITY JAM's consumer features", "The waitlist, when someone asks how to join"],
    handsOff: [
      "AIFF",
      "Pat's personal views on agents",
      "Dating and love",
      "The corporate music industry",
      "Press, partners, abuse, spam, and sensitive topics",
    ],
    samples: [
      "It is on the waitlist for now. CITY JAM is the app for finding independent music, and you can add your name here: https://waitlist.cityjam.example/?utm_source=linkedin_company",
    ],
    send: "mock",
    dailyCap: 10,
    api: "LinkedIn Community Management, POST /rest/socialActions/{urn}/comments, with an organisation actor.",
    ceiling:
      "LinkedIn throttles heavy commenting. The developer app has to be approved. The page admin role is required.",
    access:
      "OAuth from a Page admin (Administrator, or the sponsored-content poster role). No personal password.",
    metric:
      "LinkedIn conversion has no number yet. Measure waitlist sign-ups with utm_source=linkedin_company.",
  },
  threads: {
    id: "threads",
    label: "CITY JAM on Threads",
    short: "CITY JAM · Threads",
    platform: "Threads",
    phase: "now",
    speaksAs: "CITY JAM on Threads. Independent music and the app's consumer features. Shorter than a LinkedIn reply.",
    subjects: [
      "Independent music",
      "CITY JAM's consumer features",
      "The waitlist, when someone asks how to join",
    ],
    handsOff: [
      "AIFF",
      "AI agents and Innovation Philosophie",
      "Dating and love",
      "The corporate music industry",
      "Press, partners, abuse, spam, and sensitive topics",
    ],
    samples: [
      "Yes. Artists who release on their own.",
      "The app is on a waitlist for now. If you want independent music as it is released, add your name here: https://waitlist.cityjam.example/?utm_source=threads",
    ],
    send: "mock",
    dailyCap: 40,
    api: "Threads Reply Management API, POST /{threads-reply-id}/replies, permission threads_manage_replies. This slice mock-publishes. It does not call the live API.",
    ceiling: "1,000 API replies in a rolling 24 hours. Posts are a separate quota of 250. This desk caps replies at 40 a day.",
    access: "The Threads account owner authorises the app. No password. Threadify can keep scheduling posts.",
    metric:
      "About 10,000 followers on this Threads account. The weekly count is read on the profile and in Threadify. This desk counts approved replies and waitlist links with utm_source=threads.",
  },
};

export const liveAccountIds = accountIds.filter((id) => accounts[id].phase === "now");

export function isCityJam(accountId: AccountId) {
  return (
    accountId === "cityjam-instagram" ||
    accountId === "cityjam-linkedin" ||
    accountId === "threads"
  );
}

export function isPat(accountId: AccountId) {
  return accountId === "pat-x" || accountId === "pat-linkedin";
}
