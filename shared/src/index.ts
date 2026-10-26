export const STATUSES = [
  "New",
  "Approved",
  "Sent",
  "Replied",
  "Call booked",
  "Won",
  "Paid advance",
  "Delivered",
  "Lost",
] as const;
export type Status = (typeof STATUSES)[number];
export type Money = number | string;
export type Step = {
  id: string;
  gig_id: string;
  position: number;
  title: string;
  detail: string | null;
  done: boolean;
  done_at: string | null;
};
export type Gig = {
  id: string;
  business_name: string;
  business_type: string;
  city_area: string;
  contact_name: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  source: string;
  problem_noticed: string;
  why_it_fits: string;
  demo_link: string | null;
  price_min: Money | null;
  price_max: Money | null;
  outreach_whatsapp: string;
  outreach_email: string | null;
  call_script: string;
  status: Status;
  skipped_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  followup_1_due: string | null;
  followup_2_due: string | null;
  followup_1_done_at: string | null;
  followup_2_done_at: string | null;
  quoted_price: Money | null;
  advance_amount: Money | null;
  advance_paid_at: string | null;
  balance_amount: Money | null;
  balance_paid_at: string | null;
  total_received: Money;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  steps: Step[];
  completed_steps: number;
  total_steps: number;
  outreach_allowed: boolean;
};
export type GigPatch = Partial<
  Pick<
    Gig,
    | "business_name"
    | "business_type"
    | "city_area"
    | "contact_name"
    | "contact_whatsapp"
    | "contact_email"
    | "source"
    | "problem_noticed"
    | "why_it_fits"
    | "demo_link"
    | "price_min"
    | "price_max"
    | "outreach_whatsapp"
    | "outreach_email"
    | "call_script"
    | "notes"
    | "status"
    | "quoted_price"
    | "advance_amount"
    | "advance_paid_at"
    | "balance_paid_at"
  >
> & { skipped?: boolean; notes_original?: string };
export type Followup = {
  gig_id: string;
  business_name: string;
  number: number;
  due_date: string;
};
export type Today = {
  date: string;
  current_gig: Gig | null;
  next_step: Pick<Step, "id" | "title" | "detail" | "position"> | null;
  followups: Followup[];
  new_gigs: Gig[];
};
export const money = (value: Money | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
export const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(
        new Date(value.length === 10 ? value + "T12:00:00+05:30" : value),
      )
    : "Not recorded";
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const whatsappLink = (number: string) =>
  "https://wa.me/" + number.replace(/[^0-9]/g, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function createApi(
  base: string,
  token: () => string | null,
  onUnauthorized: () => void,
) {
  return async function request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const session = token();
      const response = await fetch(base.replace(/\/$/, "") + "/api" + path, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session}` } : {}),
          ...options.headers,
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({
        detail: "Could not read the response — refresh and try again",
      }));
      if (!response.ok) {
        if (
          response.status === 401 &&
          session &&
          session === token() &&
          path !== "/auth/change-password"
        )
          onUnauthorized();
        const details = data.errors
          ?.map(
            (e: { field: string; message: string }) =>
              `${e.field}: ${e.message}`,
          )
          .join(". ");
        throw new ApiError(
          details ||
            (typeof data.detail === "string"
              ? data.detail
              : "Could not save — try again"),
          response.status,
        );
      }
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        options.method && options.method !== "GET"
          ? "Could not confirm the save — refresh to check before trying again"
          : "Could not load — check your connection and try again",
        0,
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export type PortfolioItem = {
  id: string;
  title: string;
  niche: string;
  link: string;
  kind: "real_client" | "demo";
  gig_id: string | null;
  created_at: string;
};
export type Retainer = {
  id: string;
  business_name: string;
  gig_id: string | null;
  monthly_amount: Money;
  next_due_date: string;
  active: boolean;
};
export type Payment = {
  id: string;
  business_name: string;
  kind: "advance" | "balance" | "maintenance";
  amount: Money;
  paid_at: string;
};
export type Earnings = {
  month: string;
  advances: Money;
  balances: Money;
  maintenance: Money;
  received: Money;
  pending_websites: Money;
  maintenance_due: Money;
  pending: Money;
  goal_min: number;
  goal_max: number;
  remaining_to_goal: Money;
  payments: Payment[];
  outstanding_gigs: { id: string; business_name: string; amount: Money }[];
};
