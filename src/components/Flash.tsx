import { FlashMessage } from "./FlashMessage";
import { readFlash } from "@/lib/flash";
import { ESITI } from "@/lib/messages";

// The outcome of the last action, if it hasn't been shown yet (see src/lib/flash.ts).
export async function Flash() {
  const flash = await readFlash();
  const msg = flash && ESITI[flash.code];
  if (!msg) return null;
  return <FlashMessage key={flash.id} id={flash.id} ok={msg.ok} text={msg.text} />;
}
