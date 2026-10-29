"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pullMusicAction } from "@/app/actions";
import { useDesk } from "@/components/desk-provider";

export function MusicIntake() {
  const router = useRouter();
  const { deskRef, commit } = useDesk();
  const [line, setLine] = useState("Checking Threads for music posts.");

  useEffect(() => {
    let stop = false;
    const run = async () => {
      while (!stop) {
        try {
          const pull = await pullMusicAction(deskRef.current);
          if (stop) return;
          commit(pull.desk);
          setLine(pull.note);
          router.refresh();
          if (pull.status === "done" || pull.status === "error") return;
          if (pull.status === "busy") await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch {
          if (!stop) setLine("Threads could not be checked.");
          return;
        }
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [commit, deskRef, router]);

  return <p className="text-sm leading-6 text-muted-foreground">{line}</p>;
}
