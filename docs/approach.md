# Engagement assistant

This is the project brief. It replaces any earlier notes. LinkedIn is spelled LinkedIn. Where an older note said "sensable", the word is sensible.

The desk reviews replies for Pat Villaceran and for CITY JAM. It runs on mock comments. It does not call a social network, and it does not ask for a password.

## Current slice

Everything already decided stays in this brief. The desk now also drafts comments on other people's posts, on Threads, Instagram, X, and LinkedIn. A comment on someone else's post carries no link. Replies on CITY JAM's own Threads posts remain. The live slice for those replies is Threads only. CITY JAM speaks there: independent music and the app's consumer features. A reply is mock-published only after both testers pass it and Pat approves that exact text. The cap is 40 replies a day, under the Threads ceiling of 1,000. X, Instagram, and LinkedIn are in the queue when the task is a comment on someone else's post. Their own-post replies stay written below for a later slice. Threadify can still schedule Threads posts. This desk reviews and mock-publishes the replies. Follower totals are still read on the profile and in Threadify. Waitlist links from this desk use `utm_source=threads`.

## What working means

A reply is working when both named testers pass it and Pat Villaceran approves that exact text. A metric is working when it moves in the source named below. The 50,000 waitlist places and the 10,000 Threads followers are company targets. This desk is accountable for the replies Pat approved, and for the links those replies carried.

| Metric | Target | What a test moves | How it is measured |
| --- | --- | --- | --- |
| CITY JAM waitlist | 50,000 sign-ups, with 10,000 to 12,000 in the first seven days | An approved CITY JAM reply that explains how to join, using one approved link | Waitlist count by day and by UTM source: `threads`, `instagram`, `linkedin_company`, `x` |
| Threads followers | About 10,000 on the account Pat names | Threadify posts and scheduling | Weekly follower count on that profile, and in Threadify |
| Instagram growth | No number yet | CITY JAM comment replies | Instagram Insights: followers, profile visits, and reach, weekly against a baseline |
| LinkedIn resonance | No number or definition yet | Drafts Pat posts on his personal profile | Proposed measure: comments with a human follow-up within seven days |
| LinkedIn conversion | No number yet | CITY JAM Page replies that carry the approved link | Waitlist sign-ups with `utm_source=linkedin_company` |

Internal targets stay out of public replies.

## Accounts and voices

There is a voice guide per account, not one shared brand voice.

| Account | Speaks as | May answer | Send |
| --- | --- | --- | --- |
| Pat Villaceran on X | Pat, first person, short | His work, AI agents, Innovation Philosophie | Draft only. Pat posts it himself. Cap 20 a day. |
| Pat's personal LinkedIn | Pat, first person, fuller than X | The same subjects | Draft only. API send stays off. Cap 10 a day. |
| CITY JAM on Instagram | CITY JAM | Independent music and the app's consumer features | Mock publish after approval. Cap 25 a day. |
| CITY JAM LinkedIn Page | The page | The same CITY JAM subjects | Mock publish after approval. Cap 10 a day. |
| CITY JAM on Threads | CITY JAM, shorter than LinkedIn | Independent music and the app | This slice. Mock publish after approval. Cap 40 a day. |

Music maps to CITY JAM. Dating and love has no brand, so those comments are handed to a person. The corporate music industry has no brand, and it sits outside the CITY JAM voice, so those comments are handed over too. AIFF is outside the CITY JAM voice.

A public reply never names HINABI, KURATA, or HINA.BAND, and never shares those profiles. One such leak fails the test round.

## Approval

Testers score. They do not approve. Nothing is posted or sent unless Pat approved that exact text. If the text changes, both testers score it again and Pat approves it again. Until a written scope names another lead and the accounts they may approve, only Pat's approval counts.

Every public comment is held to four things. Communication: one plain point in that account's voice. Goal: on someone else's post, a reply from them; on our post, an answer, with the waitlist link only when they asked how to join. Engagement: one question they can answer, unless the link is the next step. Rationality: only what their post supports, with no follower target and no promised result.

The pass mark is 5 out of 6, with no hard fail. Testers score communication, engagement, and rationality, each from 0 to 2. The goal is fixed for the case. A draft that fights it fails before scoring. Other hard fails are British English, stock AI phrasing, the blocklist, an invented fact, the wrong voice, an unapproved link, and a reply where the case requires a handoff. Both testers must pass. With the tester names blank, nothing reaches Pat.

## Threadify

[Threadify](https://www.threadify.app/) can keep scheduling and publishing Threads posts. This slice does not replace that. Reply review for Threads lives in this desk. Instagram, X, and LinkedIn stay in the brief until the next slice. The 10,000-follower count is still the one number on the Threads profile and in Threadify. Waitlist links keep separate UTM sources, and this desk's links use `threads`.

## Access

Each platform uses its official app authorisation, or a Page admin role.

- Instagram: Instagram API, `POST /{comment-id}/replies`. Private replies stay off.
- X: X API v2, `POST /2/tweets` with `in_reply_to_tweet_id`, paid credits. Sending stays off until the self-serve reply rule is confirmed on docs.x.com.
- LinkedIn Page: Community Management comments API, organisation actor, page admin.
- LinkedIn personal: `w_member_social_feed`, which LinkedIn grants only to approved apps. Sends stay at zero.
- Threads: Reply Management API, permission `threads_manage_replies`, ceiling 1,000 replies in 24 hours. This slice mock-publishes and does not call the live API.

Cursor, for the people building the desk, needs Premium on The X Subscription ($30 a month) or a Teams seat at that tier, because Cloud Agents are not on Free or Plus. A legacy Pro plan also includes them. Who pays is not named. They sign in through Cursor's own login.

## Momentive hive

Momentive hive is not defined in this project. It has no role until someone writes what it is, who is in it, and what it owns.

## Still open before sign-off

- A definition of Momentive hive.
- The Threads account that owns the 10,000 followers, and Pat's yes on the Threadify split.
- The brand for dating and love, the brand for the corporate music industry, and any LinkedIn page other than CITY JAM.
- Numbers for Instagram growth, LinkedIn resonance, and LinkedIn conversion.
- The two testers' names, saved on the Limits page.
- Who pays for Cursor, and who pays for X API credits.
