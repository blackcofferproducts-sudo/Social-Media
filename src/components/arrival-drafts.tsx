"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { draftNextAction } from "@/app/actions";

export function ArrivalDrafts({
  focusId,
  scope,
  once,
}: {
  focusId?: string;
  scope?: "others" | "replies";
  once?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    const run = async () => {
      let focus = focusId;
      while (!stop) {
        const status = await draftNextAction(focus, scope);
        focus = undefined;
        if (stop || status === "done") return;
        router.refresh();
        if (once && status !== "busy") return;
        if (status === "busy") await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [focusId, once, router, scope]);
  return null;
}
