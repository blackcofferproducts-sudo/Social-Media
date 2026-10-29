"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pullMusicAction } from "@/app/actions";

export function MusicIntake() {
  const router = useRouter();
  const [line, setLine] = useState("Checking Threads for music posts.");

  useEffect(() => {
    let stop = false;
    const run = async () => {
      while (!stop) {
        const pull = await pullMusicAction();
        if (stop) return;
        setLine(pull.note);
        router.refresh();
        if (pull.status === "done" || pull.status === "error") return;
        if (pull.status === "busy") await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [router]);

  return <p className="text-sm leading-6 text-muted-foreground">{line}</p>;
}
