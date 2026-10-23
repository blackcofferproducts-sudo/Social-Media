import type { Category, Signal } from "./policy";

export const categoryLabel: Record<Category, string> = {
  music: "Music · CITY JAM",
  "dating-love": "Dating / love · no brand yet",
  "corporate-music": "Corporate music industry · no brand yet",
  agents: "AI agents and Innovation Philosophie · Pat",
  other: "Outside the voice guides",
};

export const signalLabel: Record<Signal, string> = {
  ordinary: "Ordinary",
  hostile: "Hostile",
  spam: "Spam",
  sensitive: "Sensitive",
  journalist: "Journalist",
  partner: "Potential partner",
};
