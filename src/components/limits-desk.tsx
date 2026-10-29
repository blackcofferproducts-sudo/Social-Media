"use client";

import { useState, type FormEvent } from "react";
import { saveNamesOnDesk } from "@/app/actions";
import { useDesk } from "@/components/desk-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountIds, accounts } from "@/lib/accounts";
import { capSummary } from "@/lib/desk";
import { namesAreSet } from "@/lib/policy";

export function LimitsDesk() {
  const { desk, deskRef, commit, ready } = useDesk();
  const named = namesAreSet(desk.testerNames);
  const caps = capSummary(desk);
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNote("");
    try {
      const next = await saveNamesOnDesk(deskRef.current, new FormData(event.currentTarget));
      commit(next);
      setNote("Names saved in this browser.");
    } catch {
      setNote("The names were not saved. Try again.");
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tester names</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="testerA">Tester A</Label>
              <Input
                id="testerA"
                name="testerA"
                defaultValue={desk.testerNames.a}
                key={`a-${ready}-${desk.testerNames.a}`}
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="testerB">Tester B</Label>
              <Input
                id="testerB"
                name="testerB"
                defaultValue={desk.testerNames.b}
                key={`b-${ready}-${desk.testerNames.b}`}
                autoComplete="name"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit">Save names</Button>
              <p className="text-sm text-muted-foreground">
                {named
                  ? "Both names are written down. They filter replies. They do not approve them."
                  : "Until two different names are saved, Pat's approval stays shut."}
                {note ? ` ${note}` : ""}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {[...accountIds]
          .sort((a, b) => (accounts[a].phase === accounts[b].phase ? 0 : accounts[a].phase === "now" ? -1 : 1))
          .map((id) => {
            const account = accounts[id];
            const usage = caps.find((row) => row.account.id === id);
            return (
              <Card key={id}>
                <CardHeader>
                  <CardTitle>
                    {account.phase === "later" ? "Later · " : ""}
                    {account.label} · {usage?.sent ?? 0} / {account.dailyCap} today
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm leading-6">
                  <p>{account.api}</p>
                  <p className="text-muted-foreground">{account.ceiling}</p>
                  <p className="text-muted-foreground">{account.access}</p>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </>
  );
}
