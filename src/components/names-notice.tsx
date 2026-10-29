"use client";

import { useDesk } from "@/components/desk-provider";
import { namesAreSet } from "@/lib/policy";

export function NamesNotice({ initialNamed }: { initialNamed: boolean }) {
  const { desk, ready } = useDesk();
  const named = ready ? namesAreSet(desk.testerNames) : initialNamed;
  if (named) return null;
  return (
    <div className="border-b border-border bg-muted/60">
      <p className="mx-auto max-w-6xl px-4 py-2 text-sm sm:px-6">
        Tester names are not written down, so nothing can reach Pat.{" "}
        <a className="underline underline-offset-4" href="/limits">
          Write the two names on Limits.
        </a>
      </p>
    </div>
  );
}
