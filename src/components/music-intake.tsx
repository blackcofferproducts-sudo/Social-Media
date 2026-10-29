"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pullMusicAction } from "@/app/actions";

export function MusicIntake() {
  const router = useRouter();
  const [line, setLine] = useState("Checking for music comments.");

  useEffect(() => {
    let stop = false;
    const run = async () => {
      while (!stop) {
        const status = await pullMusicAction();
        if (stop) return;
        if (status === "done") {
          setLine(
            "No music comments are waiting. When one arrives, it is drafted, scored, and waits for Pat's approval.",
          );
          router.refresh();
          return;
        }
        setLine(
          status === "worked"
            ? "A music comment has a reply. Fetching the next one."
            : "Fetching the next music comment.",
        );
        router.refresh();
        if (status === "busy") await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [router]);

  return <p className="text-sm leading-6 text-muted-foreground">{line}</p>;
}
