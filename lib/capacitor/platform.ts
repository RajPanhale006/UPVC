import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor Android/iOS shell (not mobile browser). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}
