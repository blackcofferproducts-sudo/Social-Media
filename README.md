# Engagement assistant

A local desk for reviewing social replies for Pat Villaceran and CITY JAM. It drafts comments on other people's posts across Threads, Instagram, X, and LinkedIn, and it still replies on CITY JAM's own Threads posts. Testers score each text. Pat approves the exact wording. Nothing is sent to a live network.

The brief is [docs/approach.md](docs/approach.md). Mock comments stand in for Threads, Instagram, X, and LinkedIn, so the desk can be used before any API permission exists.

## Run it

```bash
npm install
npm test
npm run dev
```

The desk is at http://127.0.0.1:43123.

When a comment comes in, Grok 4.7 writes the reply, then the desk waits for a score and Pat's approval. Put your xAI key in `.env.local` and restart the desk:

```bash
XAI_API_KEY=your-key-from-console.x.ai
```

The model name is `grok-4.7`. You can override it with `GROK_MODEL`. Until an xAI key is set, a Cursor key in the same file stands in:

```bash
CURSOR_API_KEY=your-cursor-api-key
```

That call uses a Cursor model (Grok if the account lists one, otherwise Composer), from an empty folder, with no tools, so it cannot edit this project. Override the model id with `CURSOR_REPLY_MODEL`. With neither key, the sheet voice stands in and the score and Pat's approval still work. Keys stay on the server. They are not written into a reply.

`npm test` checks the handoff rules, the gold replies, the 5-out-of-6 pass mark, Pat's approval of the exact text, and the daily caps.

Scores and names are stored in `data/desk-state.json`. That file is local and is not committed. Deleting it restores the sample queue.

## What you can do

- Paste a live post and comment at the top of the queue, then get a reply.
- Open the queue. It starts on other people's posts. Switch to replies on our own Threads posts when you want those.
- See whether the voice guide allows a reply, or the case must be handed to a person.
- Write the two tester names on Limits. Until those names are saved, Pat's approval stays shut.
- Score communication, engagement, and rationality. The goal for that comment is fixed on the card. Have Pat approve that text, then mock-publish a CITY JAM reply or record that Pat posted an X or personal LinkedIn draft himself.
- Edit the text after approval and watch the approval clear.
- Read Voices, Metrics, the Test pack, and Limits for the caps and the open gaps.

Threads replies are reviewed here. [Threadify](https://www.threadify.app/) can still schedule posts. The live Threads API is not called.

## Deploy on Vercel

This is a Next.js app. Publish it from Cursor, or import the repository in Vercel with the default Next.js settings. `npm run build` is the production build.

After the project exists, add these environment variables for Production and Preview. Do not commit them.

- `CURSOR_API_KEY` — the Cursor key from `.env.local`. Live replies stay on the sheet voice until this is set.
- `XAI_API_KEY` — optional. When it is set, the desk calls Grok on xAI instead.
- `GROK_MODEL` — optional. Defaults to `grok-4.7`.
- `CURSOR_REPLY_MODEL` — optional override for the Cursor model id.

A reply usually takes 15 to 40 seconds. The pages and the live-reply route allow 60 seconds. A plan that stops functions at 10 seconds will cut the reply off.

Scores and approvals are written to `data/desk-state.json` when that folder can be written. On Vercel the app disk is read-only, so the desk uses a file in the function's temporary folder instead. That copy belongs to one running instance and disappears when the function goes idle. It is enough to rehearse the gate. A database is the next step if an approval has to survive a restart.

`npm start` still runs the built desk locally on port 43123. No social API credentials are required. Connect each platform with its own app authorisation rather than a password.
