/**
 * Boot handoff signal. The boot splash fires this when it clears, so gated
 * landing animations (e.g. the v2 hero intro) start on the handoff instead of
 * playing hidden behind the overlay.
 *
 * Kept in its own tiny module so consumers (the hero) don't pull the whole
 * BootLoader component into their chunk just to read the event name.
 *
 * Late-subscriber safe: window.__aiyuBootReady stays set, so anything that
 * mounts after the handoff can check the flag instead of missing the event.
 */
export const BOOT_READY_EVENT = "aiyu:boot-ready";

export function signalBootReady() {
  if (typeof window === "undefined") return;
  if (window.__aiyuBootReady) return;
  window.__aiyuBootReady = true;
  window.dispatchEvent(new Event(BOOT_READY_EVENT));
}

export function isBootReady() {
  return typeof window !== "undefined" && window.__aiyuBootReady === true;
}
