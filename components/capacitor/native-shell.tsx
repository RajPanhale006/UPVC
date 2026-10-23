"use client";

import { useEffect } from "react";

/** Applies native Android/iOS tweaks when running inside Capacitor. */
export function NativeShell() {
  useEffect(() => {
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        document.documentElement.classList.add("capacitor-native");
        document.body.classList.add(`platform-${Capacitor.getPlatform()}`);

        if (Capacitor.getPlatform() === "android") {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0f172a" });
        }

        const host = window.location.hostname;
        const loadsFromHostedSite =
          host.length > 0 &&
          !/^(localhost|127\.0\.0\.1)$/i.test(host) &&
          !host.endsWith(".localhost");

        if (loadsFromHostedSite) {
          const { App } = await import("@capacitor/app");
          await App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) window.location.reload();
          });
        }
      } catch {
        // Web or plugin unavailable — no-op.
      }
    })();
  }, []);

  return null;
}
