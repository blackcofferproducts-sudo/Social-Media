"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCommentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EnterComment({ place }: { place: "others" | "own" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setNote("");
    try {
      const result = await saveCommentAction(new FormData(form));
      setNote(result.note);
      if (!result.ok) return;
      form.reset();
      if (result.place === "own") router.push("/?view=replies");
      else router.push("/");
      router.refresh();
    } catch {
      setNote("The comment was not saved. Try it again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter a comment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Paste a comment. The model writes the reply first. The comment and that reply are then
          saved and shown in the list below, and they wait for a score and Pat&apos;s approval.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="entered-comment">Their comment</Label>
            <Textarea id="entered-comment" name="comment" required className="min-h-24" />
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">Where it sits</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="place" value="others" defaultChecked={place !== "own"} />
              On their post
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="place" value="own" defaultChecked={place === "own"} />
              On our post
            </label>
          </fieldset>
          <Button type="submit" disabled={pending}>
            {pending ? "Writing the reply…" : "Get a reply"}
          </Button>
        </form>
        {note ? <p className="text-sm leading-6">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
