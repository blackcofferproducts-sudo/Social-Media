import type { AccountId } from "./accounts";
import type { Category, Place, Signal } from "./policy";

export type TrainingNote = {
  sheetId: string;
  sheetCategory: string;
  intent: string;
  nearest: string[];
};

export type Fixture = {
  id: string;
  accountId: AccountId;
  author: string;
  post: string;
  comment: string;
  category: Category;
  signal: Signal;
  expected: "reply" | "handoff";
  suggestedDraft: string;
  place?: Place;
  training?: TrainingNote;
};

export function placeOf(fixture: Fixture): Place {
  return fixture.place ?? "own";
}
