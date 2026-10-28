"use client";

import { useEffect, useRef } from "react";

// Scrolls its parent into view after the page loads, e.g. back to the week
// a booking was made from.
export function ScrollHere() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.parentElement?.scrollIntoView({ block: "start" });
  }, []);
  return <span ref={ref} hidden />;
}
