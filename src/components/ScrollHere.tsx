"use client";

import { useEffect, useRef } from "react";

// Scrolls the strip its parent sits in sideways so the parent is in the
// middle, e.g. the chosen day in the row of days.
export function ScrollHere() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const item = ref.current?.parentElement;
    const strip = item?.parentElement;
    if (item && strip) strip.scrollLeft = item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2;
  }, []);
  return <span ref={ref} hidden />;
}
