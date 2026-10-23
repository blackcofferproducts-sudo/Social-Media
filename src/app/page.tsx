import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { accounts, accountIds } from "@/lib/accounts";
import { fixtures } from "@/lib/fixtures";
import { categoryLabel, signalLabel } from "@/lib/labels";
import { gateFor, getDesk } from "@/lib/store";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account } = await searchParams;
  const selected = accountIds.find((id) => id === account);
  const desk = getDesk();
  const rows = fixtures.filter((fixture) => !selected || fixture.accountId === selected);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Queue</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Mock comments only. Threads stays with Threadify. X and Pat&apos;s personal LinkedIn can
          be drafted here, then posted by Pat. Instagram and the CITY JAM LinkedIn Page can be
          mock-published after his approval.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Filter href="/" current={!selected} label="All accounts" />
        {accountIds.map((id) => (
          <Filter
            key={id}
            href={`/?account=${id}`}
            current={selected === id}
            label={accounts[id].short}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((fixture) => {
          const gate = gateFor(desk, fixture.id);
          return (
            <li key={fixture.id}>
              <Link
                href={`/comments/${fixture.id}`}
                className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{accounts[fixture.accountId].short}</Badge>
                    <Badge variant="outline">{signalLabel[fixture.signal]}</Badge>
                  </div>
                  <p className="text-sm leading-6">{fixture.comment}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabel[fixture.category]}</p>
                </div>
                <p className="max-w-xs shrink-0 text-sm text-muted-foreground sm:text-right">
                  {gate?.headline}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Filter({ href, label, current }: { href: string; label: string; current: boolean }) {
  return (
    <Link
      href={href}
      className={
        current
          ? "rounded-md bg-primary px-2.5 py-1 text-sm text-primary-foreground"
          : "rounded-md px-2.5 py-1 text-sm text-muted-foreground ring-1 ring-border"
      }
    >
      {label}
    </Link>
  );
}
