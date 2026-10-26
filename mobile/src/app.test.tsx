import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { type Gig, type Today } from "@gigs/shared";
import App, { cache as appCache } from "../App";
import { Workspace, type Api } from "./context";
import { GigDetail, PaymentEditor } from "./gigs";
import { PortfolioScreen } from "./finance";

const fixture: Gig = {
  id: "test-gig",
  business_name: "TEST ONLY — Lotus Studio",
  business_type: "salon",
  city_area: "Pune",
  contact_name: null,
  contact_whatsapp: null,
  contact_email: null,
  source: "Test",
  problem_noticed: "No website",
  why_it_fits: "A simple local business site",
  demo_link: null,
  price_min: 8000,
  price_max: 15000,
  outreach_whatsapp: "Hello from a test",
  outreach_email: "Test email",
  call_script: "Ask scope first; give a range then a written quote.",
  status: "New",
  skipped_at: null,
  approved_at: null,
  sent_at: null,
  followup_1_due: null,
  followup_2_due: null,
  followup_1_done_at: null,
  followup_2_done_at: null,
  quoted_price: null,
  advance_amount: null,
  advance_paid_at: null,
  balance_amount: null,
  balance_paid_at: null,
  total_received: 0,
  notes: "",
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  created_by: "muse",
  steps: [
    {
      id: "step-1",
      gig_id: "test-gig",
      position: 1,
      title: "Read and approve",
      detail: null,
      done: false,
      done_at: null,
    },
  ],
  completed_steps: 0,
  total_steps: 1,
  outreach_allowed: false,
};
const testCaches: QueryClient[] = [];
beforeEach(() => appCache.setDefaultOptions({queries:{retry:false,gcTime:0},mutations:{gcTime:0}}));
afterEach(async () => {
  await cleanup();
  appCache.clear();
  for (const cache of testCaches) cache.clear();
  testCaches.length = 0;
  jest.clearAllMocks();
});
function wrap(element: React.ReactNode, api: Api) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: {gcTime:0} },
  });
  testCaches.push(cache);
  return render(
    <QueryClientProvider client={cache}>
      <Workspace.Provider
        value={{ api, openGig: jest.fn(), logout: jest.fn() }}
      >
        {element}
      </Workspace.Provider>
    </QueryClientProvider>,
  );
}
test("native wrong password stays on Login; correct password opens Today and stores session", async () => {
  const requests: string[] = [];
  const today: Today = {
    date: "2026-10-26",
    current_gig: null,
    next_step: null,
    followups: [],
    new_gigs: [],
  };
  globalThis.fetch = jest.fn(async (url: unknown, options?: unknown) => {
    const path = String(url);
    requests.push(path);
    const body = JSON.parse(
      String((options as { body?: string })?.body || "{}"),
    );
    const wrong =
      path.endsWith("/auth/login") && body.password !== "test-password";
    const data = path.endsWith("/auth/login")
      ? wrong
        ? { detail: "Wrong password, try again" }
        : { token: "native-test-session" }
      : today;
    return {
      ok: !wrong,
      status: wrong ? 401 : 200,
      json: async () => data,
    } as Response;
  });
  await render(<App />);
  await fireEvent.changeText(await screen.findByLabelText("Password"), "bad");
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(
    await screen.findByText("Wrong password, try again"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("One step at a time.")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "test-password",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Nothing due today")).toBeOnTheScreen();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    "gig-session",
    "native-test-session",
  );
  expect(requests.some((path) => path.endsWith("/api/today"))).toBe(true);
});
test("outreach is disabled for New and copy never changes status", async () => {
  const api = jest.fn(async (path: string) =>
    path.startsWith("/portfolio") ? [] : fixture,
  ) as unknown as Api;
  await wrap(
    <GigDetail gig={fixture} onBack={() => {}} refresh={() => {}} />,
    api,
  );
  expect(
    screen.getByRole("button", { name: "Copy WhatsApp message" }),
  ).toBeDisabled();
  await cleanup();
  await wrap(
    <GigDetail
      gig={{ ...fixture, status: "Approved", outreach_allowed: true }}
      onBack={() => {}}
      refresh={() => {}}
    />,
    api,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Copy WhatsApp message" }),
  );
  expect(await screen.findByText("Copied")).toBeOnTheScreen();
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Hello from a test");
  expect(api).not.toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ method: "PATCH" }),
  );
});
test("Won defaults advance to half the quote and submits the required fields", async () => {
  const api = jest.fn(async () => fixture) as unknown as Api;
  await wrap(
    <PaymentEditor gig={fixture} status="Won" onClose={() => {}} />,
    api,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Quoted price (₹)"),
    "12000",
  );
  expect(
    screen.getByLabelText("Advance amount (₹) · defaults to 50%"),
  ).toHaveProp("value", "6000");
  await fireEvent.press(screen.getByRole("button", { name: "Confirm Won" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/gigs/test-gig", {
      method: "PATCH",
      body: { status: "Won", quoted_price: 12000, advance_amount: 6000 },
    }),
  );
});
test("portfolio labels actual client work separately from demos", async () => {
  const api = jest.fn(async (path: string) =>
    path === "/gigs"
      ? []
      : [
          {
            id: "demo",
            title: "TEST demo",
            niche: "salon",
            link: "https://example.com",
            kind: "demo",
            gig_id: null,
          },
          {
            id: "real",
            title: "TEST client",
            niche: "shop",
            link: "https://example.com",
            kind: "real_client",
            gig_id: null,
          },
        ],
  ) as unknown as Api;
  await wrap(<PortfolioScreen />, api);
  expect(await screen.findByText("Demo")).toBeOnTheScreen();
  expect(await screen.findByText("Real client")).toBeOnTheScreen();
});
