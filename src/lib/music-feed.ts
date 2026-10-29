import type { Fixture } from "./fixture";

/** Live comments only. This list stays empty so the desk does not invent posts. */
export const musicFeed: Fixture[] = [];

export function nextMusicComment(seenIds: string[]) {
  const seen = new Set(seenIds);
  return musicFeed.find((item) => item.category === "music" && !seen.has(item.id));
}
