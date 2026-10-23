# Engagement assistant

A local desk for reviewing social replies for Pat Villaceran and CITY JAM. This build runs on Threads only. Testers score each reply. Pat approves the exact text. Nothing is sent to a live network. X, Instagram, and LinkedIn stay in the brief.

The brief is [docs/approach.md](docs/approach.md). Mock comments stand in for Threads, Instagram, X, and LinkedIn, so the desk can be used before any API permission exists.

## Run it

```bash
npm install
npm test
npm run dev
```

The desk is at http://127.0.0.1:43123.

`npm test` checks the handoff rules, the gold replies, the 5-out-of-6 pass mark, Pat's approval of the exact text, and the daily caps.

Scores and names are stored in `data/desk-state.json`. That file is local and is not committed. Deleting it restores the sample queue.

## What you can do

- Read the queue and open a comment.
- See whether the voice guide allows a reply, or the case must be handed to a person.
- Write the two tester names on Limits. Until those names are saved, Pat's approval stays shut.
- Score a reply, have Pat approve that text, then mock-publish a CITY JAM reply or record that Pat posted an X or personal LinkedIn draft himself.
- Edit the text after approval and watch the approval clear.
- Read Voices, Metrics, the Test pack, and Limits for the caps and the open gaps.

Threads replies are reviewed here. [Threadify](https://www.threadify.app/) can still schedule posts. The live Threads API is not called.

## Deployment

`npm run build` then `npm start` runs the desk on port 43123. The rehearsal state is a JSON file on disk. A serverless host will not keep those approvals. Connect a database before hosting it, and connect each platform with its own app authorisation rather than a password. No API credentials are required to run the local desk.
