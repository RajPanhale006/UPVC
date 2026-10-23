import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim().replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.shivshakti.upvcworkshop",
  appName: "Shivshakti ProERP",
  webDir: "out",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    ...(serverUrl ? { url: serverUrl } : {}),
  },
};

export default config;
