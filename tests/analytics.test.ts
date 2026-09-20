import { expect, it } from "vitest";
import { sanitizeAnalyticsEvent } from "../src/core/analytics/events";

it("excludes authentication callbacks from analytics", () => {
  expect(sanitizeAnalyticsEvent({
    type: "pageview",
    url: "https://gaav-bajar.vercel.app/auth/callback?code=private",
  })).toBeNull();
});

it("removes query parameters and fragments from page views", () => {
  expect(sanitizeAnalyticsEvent({
    type: "pageview",
    url: "https://gaav-bajar.vercel.app/?phone=private#access_token=private",
  })).toEqual({ type: "pageview", url: "https://gaav-bajar.vercel.app/" });
});
