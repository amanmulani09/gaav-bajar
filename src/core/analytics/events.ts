import type { BeforeSendEvent } from "@vercel/analytics";

export function sanitizeAnalyticsEvent(event: BeforeSendEvent) {
  const url = new URL(event.url);
  if (url.pathname.startsWith("/auth/")) return null;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}
