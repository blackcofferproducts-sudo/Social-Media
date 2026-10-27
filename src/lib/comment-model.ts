// Voice fitted to the 56-row sheet. A reply should sound like a person on Threads.
// Missing facts are said as "I don't have that", never as a rule the account is enforcing.

const ROBOTIC = [
  /\bi won['’]t\b/i,
  /\bi will not\b/i,
  /rather than a guess/i,
  /easy to follow/i,
  /for that slot/i,
  /that['’]s a lot for/i,
  /playing it anyway/i,
  /\bi['’]d be happy\b/i,
  /\bcertainly\b/i,
  /\bdelve\b/i,
  /\bas an ai\b/i,
  /let me know if you need/i,
  /worth noting/i,
];

export function roboticPhrase(draft: string) {
  for (const pattern of ROBOTIC) {
    const match = draft.match(pattern);
    if (match) return match[0];
  }
  return null;
}
