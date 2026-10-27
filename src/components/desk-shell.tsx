import { DeskNav } from "@/components/desk-nav";
import { namesAreSet } from "@/lib/policy";
import { getDesk } from "@/lib/store";

export function DeskShell({ children }: { children: React.ReactNode }) {
  const desk = getDesk();
  const named = namesAreSet(desk.testerNames);
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                CITY JAM and Pat Villaceran
              </p>
              <p className="font-heading text-3xl leading-tight font-medium">Engagement assistant</p>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Plain speech, a clear goal, a reason to reply, and a point that holds. Testers score.
              Pat approves the exact text.
            </p>
          </div>
          <DeskNav />
        </div>
      </header>
      <div className="border-b border-border bg-muted/40">
        <p className="mx-auto max-w-6xl px-4 py-2 text-sm sm:px-6">
          A comment comes in, Grok 4.7 writes the reply, then it waits for a score and Pat&apos;s approval.
        </p>
      </div>
      {!named ? (
        <div className="border-b border-border bg-muted/60">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm sm:px-6">
            Tester names are not written down, so nothing can reach Pat.{" "}
            <a className="underline underline-offset-4" href="/limits">
              Write the two names on Limits.
            </a>
          </p>
        </div>
      ) : null}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
