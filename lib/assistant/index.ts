export * from "./types";
export * from "./permissions";
export * from "./audit";
export * from "./parse-local";
export * from "./execute";

export const ASSISTANT_OFFLINE_MESSAGE =
  "AI Assistant requires an internet connection for advanced parsing. Manual estimation and basic voice commands remain available offline.";

export const SUGGESTED_COMMANDS = [
  "Create Window",
  "Create Door",
  "Calculate Cutting",
  "Workshop Cost",
  "Customer Rate",
  "Generate PDF",
] as const;
