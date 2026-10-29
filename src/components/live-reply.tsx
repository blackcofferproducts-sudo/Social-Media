"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial = { reply: "", note: "", impact: "" };

export function LiveReply({ connected }: { connected: boolean }) {
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(initial);
    try {
      const response = await fetch("/api/live-reply", {
        method: "POST",
        cache: "no-store",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as typeof initial;
      setState({
        reply: result.reply ?? "",
        note: result.note ?? "",
        impact: result.impact ?? "",
      });
    } catch {
      setState({ ...initial, note: "The desk could not be reached. Try the reply again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live comment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Paste the post. Grok 4.7 writes the reply and it shows here.
        </p>
        <p className="text-sm leading-6">
          {connected ? "Grok 4.7 is connected." : "Grok 4.7 is not connected on this desk."}
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="live-post">Their post</Label>
            <Textarea id="live-post" name="post" required className="min-h-24" />
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">Where it sits</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="place" value="others" defaultChecked />
              On their post
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="place" value="own" />
              On our post
            </label>
          </fieldset>
          <Button type="submit" disabled={pending}>
            {pending ? "Writing the reply…" : "Get a reply"}
          </Button>
        </form>
        {state.note ? <p className="text-sm leading-6">{state.note}</p> : null}
        {state.reply ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-3">
            <p className="text-sm leading-6">{state.reply}</p>
            {state.impact ? (
              <p className="text-sm text-muted-foreground">Likely impact {state.impact}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
