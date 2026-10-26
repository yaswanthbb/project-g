import { createApi } from "@gigs/shared";
export const SESSION_KEY = "gig-session";
export const api = createApi(
  import.meta.env.VITE_API_URL || "http://localhost:8000",
  () => localStorage.getItem(SESSION_KEY),
  () => {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("session-changed"));
  },
);
