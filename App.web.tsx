import { Analytics } from "@vercel/analytics/react";
import MarketApp from "./src/application/MarketApp";
import { sanitizeAnalyticsEvent } from "./src/core/analytics/events";

export default function App() {
  return (
    <>
      <MarketApp />
      {!__DEV__ && !window.location.pathname.startsWith("/auth/") && (
        <Analytics beforeSend={sanitizeAnalyticsEvent} />
      )}
    </>
  );
}
