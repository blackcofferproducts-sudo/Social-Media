"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { liveReplyAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial = { reply: "", note: "", impact: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Writing the reply…" : "Get a reply"}
    </Button>
  );
}

export function LiveReply() {
  const [state, action] = useActionState(liveReplyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live comment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Paste the post and the comment. Grok 4.7 writes the reply and it shows here.
        </p>
        <form action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="live-post">Their post</Label>
            <Textarea id="live-post" name="post" required className="min-h-24" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="live-comment">Their comment</Label>
            <Textarea id="live-comment" name="comment" required className="min-h-24" />
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
          <SubmitButton />
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
