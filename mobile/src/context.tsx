import { createContext, useContext } from "react";
import { createApi } from "@gigs/shared";
export type Api = ReturnType<typeof createApi>;
export type Screen =
  | { name: "today" | "all" | "earnings" | "portfolio" | "settings" }
  | { name: "gig"; id: string };
export const Workspace = createContext<{
  api: Api;
  openGig: (id: string) => void;
  logout: () => Promise<void>;
} | null>(null);
export function useWorkspace() {
  const context = useContext(Workspace);
  if (!context) throw new Error("Workspace unavailable");
  return context;
}
