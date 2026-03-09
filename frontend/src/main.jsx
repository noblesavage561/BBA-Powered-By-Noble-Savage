import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

async function runResetRefreshIfRequested() {
  if (typeof window === "undefined") {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const shouldReset = currentUrl.searchParams.get("reset") === "1";
  if (!shouldReset) {
    return;
  }

  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Ignore storage access failures.
  }

  if ("caches" in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    } catch {
      // Ignore Cache API failures.
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Ignore service worker cleanup failures.
    }
  }

  currentUrl.searchParams.delete("reset");
  currentUrl.searchParams.set("v", String(Date.now()));
  window.location.replace(currentUrl.toString());
}

runResetRefreshIfRequested();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
