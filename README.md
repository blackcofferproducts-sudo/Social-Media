# Engagement assistant

A local desk for reviewing social replies for Pat Villaceran and CITY JAM. It drafts comments on other people's posts across Threads, Instagram, X, and LinkedIn, and it still replies on CITY JAM's own Threads posts. Testers score each text. Pat approves the exact wording. Nothing is sent to a live network.

The brief is [docs/approach.md](docs/approach.md). The queue reads recent public music posts from Threads. It does not invent comments, and it does not publish to Threads, Instagram, X, or LinkedIn.

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

Music posts come from the Threads keyword search. Add a Threads user token and restart the desk:

```bash
THREADS_ACCESS_TOKEN=your-threads-user-token
```

Create the token in a Meta app that has the Threads use case. Grant `threads_basic` and `threads_keyword_search`. The Graph API Explorer can issue the token while you are testing. Until Meta approves `threads_keyword_search`, the search only returns posts from the connected account. Optional `THREADS_SEARCH_QUERY` replaces the default word `music`. The token is not committed.

`npm test` checks the handoff rules, the gold replies, the 5-out-of-6 pass mark, Pat's approval of the exact text, and the daily caps.

On this machine, scores and names are also written to `data/desk-state.json`. That file is local and is not committed. Deleting it clears the file copy. Comments you save in the browser stay in that browser until you clear site data.

## What you can do

- Paste a comment on the queue. The model writes the reply first, then the comment and that reply are saved and listed below. Pat's approval stays the same.
- The queue also asks Threads for recent public posts that match `music`. Nothing is published back to Threads.
- Open the queue. It starts on other people's posts. Switch to replies on our own Threads posts when you want those.
- See whether the voice guide allows a reply, or the case must be handed to a person.
- Write the two tester names on Limits. Until those names are saved, Pat's approval stays shut.
- Score communication, engagement, and rationality. The goal for that comment is fixed on the card. Have Pat approve that text, then mock-publish a CITY JAM reply or record that Pat posted an X or personal LinkedIn draft himself.
- Edit the text after approval and watch the approval clear.
- Read Voices, Metrics, the Test pack, and Limits for the caps and the open gaps.

Threads replies are reviewed here. [Threadify](https://www.threadify.app/) can still schedule posts. The desk reads music posts from Threads and does not publish replies there.

## Deploy on Vercel

This is a Next.js app. Publish it from Cursor, or import the repository in Vercel with the default Next.js settings. `npm run build` is the production build.

After the project exists, add these environment variables for Production and Preview. Do not commit them.

- `CURSOR_API_KEY` — the Cursor key from `.env.local`. Live replies stay on the sheet voice until this is set.
- `XAI_API_KEY` — optional. When it is set, the desk calls Grok on xAI instead.
- `GROK_MODEL` — optional. Defaults to `grok-4.7`.
- `CURSOR_REPLY_MODEL` — optional override for the Cursor model id.
- `THREADS_ACCESS_TOKEN` — Threads user token with `threads_basic` and `threads_keyword_search`. Music posts stay empty until this is set.
- `THREADS_SEARCH_QUERY` — optional. Defaults to `music`.

A reply usually takes 15 to 40 seconds. The pages and the live-reply route allow 60 seconds. A plan that stops functions at 10 seconds will cut the reply off.

Saved comments, replies, scores, and tester names stay in the browser (`localStorage`). A refresh on the deployed site keeps them. They are not shared with another browser or device. The server file is only a local copy when the disk can be written. Vercel does not keep that file.

`npm start` still runs the built desk locally on port 43123. No social API credentials are required. Connect each platform with its own app authorisation rather than a password.
