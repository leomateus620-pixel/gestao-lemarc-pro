export type LemarcModule = "os" | "wire_trays";

const STORAGE_KEY = "lemarc.preferred-module";

export const moduleHome: Record<LemarcModule, "/dashboard" | "/leitos"> = {
  os: "/dashboard",
  wire_trays: "/leitos",
};

export function readPreferredModule(): LemarcModule | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "os" || value === "wire_trays" ? value : null;
}

export function storePreferredModule(module: LemarcModule) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, module);
}

export function moduleFromPath(path: string | null | undefined): LemarcModule | null {
  if (!path) return null;
  return path.startsWith("/leitos") ? "wire_trays" : path.startsWith("/") ? "os" : null;
}

export function safeInternalDestination(path: string | null | undefined, module: LemarcModule) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return moduleHome[module];
  if (path === "/login" || path.startsWith("/login?") || path.startsWith("/login#")) {
    return moduleHome[module];
  }
  const pathModule = moduleFromPath(path);
  return pathModule === module ? path : moduleHome[module];
}
