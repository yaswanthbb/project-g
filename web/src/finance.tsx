import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowUpRight } from "lucide-react";
import {
  type Earnings,
  type Gig,
  type PortfolioItem,
  type Retainer,
  type Money,
  money,
  dateLabel,
  localDate,
} from "@gigs/shared";
import { api } from "./api";
import { PageTitle } from "./App";
import { Empty, ErrorNotice, Field, LinkOut, Loading, Sheet } from "./ui";
import { PaymentEditor } from "./payments";
export function EarningsPage() {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [retainer, setRetainer] = useState<Retainer | "new" | null>(null);
  const [receipt, setReceipt] = useState<Retainer | null>(null);
  const [gig, setGig] = useState<Gig | null>(null);
  const totals = useQuery({
    queryKey: ["earnings", month],
    queryFn: () => api<Earnings>(`/earnings?month=${month}`),
  });
  const gigs = useQuery({
    queryKey: ["gigs"],
    queryFn: () => api<Gig[]>("/gigs"),
  });
  const retainers = useQuery({
    queryKey: ["retainers"],
    queryFn: () => api<Retainer[]>("/retainers"),
  });
  return (
    <div className="page">
      <PageTitle
        eyebrow="STEADY PROGRESS"
        title="Small wins add up."
        subtitle="What you’ve received, what’s pending, and your next milestone."
      />
      <div className="section-heading">
        <h2>Earnings</h2>
        <Field label="Month">
          <input
            type="month"
            value={month}
            required
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </Field>
      </div>
      {totals.isPending ? (
        <Loading />
      ) : totals.isError ? (
        <>
          <ErrorNotice error={totals.error} />
          <button className="button" onClick={() => totals.refetch()}>
            Try again
          </button>
        </>
      ) : (
        <>
          <section className="earnings-hero">
            <span className="eyebrow">RECEIVED THIS MONTH</span>
            <div className="earned-amount">{money(totals.data.received)}</div>
            <div className="goal-label">
              <span>Goal: ₹10,000–15,000/month</span>
              <strong>
                {Number(totals.data.remaining_to_goal) > 0
                  ? `${money(totals.data.remaining_to_goal)} to ₹10,000`
                  : "₹10,000 milestone reached"}
              </strong>
            </div>
            <progress
              value={Math.min(Number(totals.data.received), 10000)}
              max={10000}
              aria-label="Monthly earnings progress"
            />
            <div className="earnings-breakdown">
              <div>
                <span>Advances received</span>
                <strong>{money(totals.data.advances)}</strong>
              </div>
              <div>
                <span>Balances received</span>
                <strong>{money(totals.data.balances)}</strong>
              </div>
              <div>
                <span>Maintenance received</span>
                <strong>{money(totals.data.maintenance)}</strong>
              </div>
            </div>
          </section>
          <section className="pending-bar">
            <div>
              <span className="eyebrow">OUTSTANDING NOW</span>
              <h2>{money(totals.data.pending)}</h2>
            </div>
            <p>
              {money(totals.data.pending_websites)} in website payments
              <br />
              {money(totals.data.maintenance_due)} in maintenance currently due
            </p>
          </section>
          <section className="panel">
            <h2>Received this month</h2>
            {totals.data.payments.length ? (
              <div className="receipt-list">
                {totals.data.payments.map((p) => (
                  <div className="receipt-row" key={p.id}>
                    <div>
                      <strong>{p.business_name}</strong>
                      <small>
                        {p.kind[0].toUpperCase() + p.kind.slice(1)} ·{" "}
                        {dateLabel(p.paid_at)}
                      </small>
                    </div>
                    <strong>{money(p.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="quiet-empty">
                No payments recorded for this month.
              </p>
            )}
          </section>
        </>
      )}
      <section className="today-section">
        <div className="section-heading">
          <h2>Website payments</h2>
          <span className="section-caption">
            RECORD PAYMENTS RECEIVED ELSEWHERE
          </span>
        </div>
        {gigs.isPending ? (
          <Loading />
        ) : gigs.isError ? (
          <ErrorNotice error={gigs.error} />
        ) : gigs.data.length ? (
          <div className="panel">
            {gigs.data.map((g) => (
              <div className="receipt-row" key={g.id}>
                <div>
                  <Link to={`/gigs/${g.id}`} className="text-link">
                    {g.business_name}
                    <ArrowUpRight size={15} />
                  </Link>
                  <small>
                    Quote{" "}
                    {g.quoted_price != null ? money(g.quoted_price) : "not set"}{" "}
                    · Received {money(g.total_received)}
                  </small>
                </div>
                <button
                  className="button secondary small"
                  onClick={() => setGig(g)}
                >
                  Edit payments
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="quiet-empty">
            No gigs yet. Your website payments will appear here.
          </p>
        )}
      </section>
      <section className="today-section">
        <div className="section-heading">
          <h2>Maintenance retainers</h2>
          <button
            className="button secondary small"
            onClick={() => setRetainer("new")}
          >
            <Plus size={16} />
            Add retainer
          </button>
        </div>
        <p className="muted section-intro">
          Your guide is ₹1,000–2,500/month. Set the actual amount for each
          client.
        </p>
        {retainers.isPending ? (
          <Loading />
        ) : retainers.isError ? (
          <ErrorNotice error={retainers.error} />
        ) : retainers.data.length ? (
          <div className="panel">
            {retainers.data.map((r) => (
              <div className="retainer-row" key={r.id}>
                <div>
                  <h3>
                    {r.business_name}
                    <span className="pill">
                      {r.active ? "Active" : "Paused"}
                    </span>
                  </h3>
                  <p>
                    {money(r.monthly_amount)} / month · Next due{" "}
                    {dateLabel(r.next_due_date)}
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="button secondary small"
                    onClick={() => setRetainer(r)}
                  >
                    Edit
                  </button>
                  <button
                    className="button small"
                    onClick={() => setReceipt(r)}
                  >
                    Record payment
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No retainers yet">
            Add a client when you agree a monthly maintenance plan.
          </Empty>
        )}
      </section>
      {retainer && (
        <Sheet
          title={
            retainer === "new" ? "Add maintenance retainer" : "Edit retainer"
          }
          onClose={() => setRetainer(null)}
        >
          <RetainerForm
            item={retainer === "new" ? undefined : retainer}
            gigs={gigs.data || []}
            onClose={() => setRetainer(null)}
          />
        </Sheet>
      )}
      {receipt && (
        <Sheet
          title={`Record payment · ${receipt.business_name}`}
          onClose={() => setReceipt(null)}
        >
          <RetainerReceipt item={receipt} onClose={() => setReceipt(null)} />
        </Sheet>
      )}
      {gig && (
        <Sheet
          title={`Payments · ${gig.business_name}`}
          onClose={() => setGig(null)}
        >
          <PaymentEditor gig={gig} onClose={() => setGig(null)} />
        </Sheet>
      )}
    </div>
  );
}
function RetainerForm({
  item,
  gigs,
  onClose,
}: {
  item?: Retainer;
  gigs: Gig[];
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api(item ? `/retainers/${item.id}` : "/retainers", {
        method: item ? "PATCH" : "POST",
        body,
      }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save.mutate({
      business_name: d.get("business_name"),
      monthly_amount: Number(d.get("monthly_amount")),
      next_due_date: d.get("next_due_date"),
      gig_id: d.get("gig_id") || null,
      active: d.get("active") === "on",
    });
  }
  return (
    <form onSubmit={submit}>
      <Field label="Business name">
        <input
          name="business_name"
          required
          defaultValue={item?.business_name}
        />
      </Field>
      <Field label="Monthly amount (₹)">
        <input
          name="monthly_amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={item?.monthly_amount}
        />
      </Field>
      <Field label="Next due date">
        <input
          name="next_due_date"
          type="date"
          required
          defaultValue={item?.next_due_date || localDate()}
        />
      </Field>
      <GigSelect gigs={gigs} value={item?.gig_id} />
      <label className="checkbox-field">
        <input
          name="active"
          type="checkbox"
          defaultChecked={item?.active ?? true}
        />
        Active retainer
      </label>
      <ErrorNotice error={save.error} />
      <button className="button" disabled={save.isPending}>
        Save retainer
      </button>
    </form>
  );
}
function RetainerReceipt({
  item,
  onClose,
}: {
  item: Retainer;
  onClose: () => void;
}) {
  const [id] = useState(() => crypto.randomUUID());
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api(`/retainers/${item.id}/payments`, { method: "POST", body }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  const history = useQuery({
    queryKey: ["retainer-payments", item.id],
    queryFn: () =>
      api<{ id: string; amount: Money; paid_at: string }[]>(
        `/retainers/${item.id}/payments`,
      ),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save.mutate({
      id,
      amount: Number(d.get("amount")),
      paid_at: d.get("paid_at"),
    });
  }
  return (
    <>
      <form onSubmit={submit}>
        <p className="muted section-intro">
          Record money you already received. The next due date moves forward one
          month after saving.
        </p>
        <Field label="Amount received (₹)">
          <input
            type="number"
            min="0.01"
            step="0.01"
            name="amount"
            required
            defaultValue={item.monthly_amount}
          />
        </Field>
        <Field label="Paid date">
          <input
            type="date"
            name="paid_at"
            required
            max={localDate()}
            defaultValue={localDate()}
          />
        </Field>
        <ErrorNotice error={save.error} />
        <button className="button" disabled={save.isPending}>
          {save.isPending ? "Recording…" : "Record received payment"}
        </button>
      </form>
      <h3 className="history-title">Recorded payments</h3>
      {history.isError ? (
        <ErrorNotice error={history.error} />
      ) : history.data?.length ? (
        history.data.map((p) => (
          <div className="receipt-row" key={p.id}>
            <span>{dateLabel(p.paid_at)}</span>
            <strong>{money(p.amount)}</strong>
          </div>
        ))
      ) : (
        <p className="muted">No payments recorded yet.</p>
      )}
    </>
  );
}
export function PortfolioPage() {
  const [edit, setEdit] = useState<PortfolioItem | "new" | null>(null);
  const items = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api<PortfolioItem[]>("/portfolio"),
  });
  const gigs = useQuery({
    queryKey: ["gigs"],
    queryFn: () => api<Gig[]>("/gigs"),
  });
  return (
    <div className="page">
      <PageTitle
        eyebrow="WORK YOU CAN SHARE"
        title="Let your work speak."
        subtitle="Real projects and honest demos. Ready to open on a call."
      />
      <div className="section-heading">
        <h2>Your portfolio</h2>
        <button className="button" onClick={() => setEdit("new")}>
          <Plus size={17} />
          Add a link
        </button>
      </div>
      {items.isPending ? (
        <Loading />
      ) : items.isError ? (
        <>
          <ErrorNotice error={items.error} />
          <button className="button" onClick={() => items.refetch()}>
            Try again
          </button>
        </>
      ) : items.data.length ? (
        <div className="gig-grid">
          {items.data.map((item) => (
            <article className="portfolio-card panel" key={item.id}>
              <span
                className={`pill ${item.kind === "real_client" ? "real-client" : "status-new"}`}
              >
                {item.kind === "real_client" ? "Real client" : "Demo"}
              </span>
              <h2>{item.title}</h2>
              <p className="muted">{item.niche || "Niche not specified"}</p>
              <div className="card-bottom">
                <LinkOut href={item.link}>Open website</LinkOut>
                <button
                  className="button secondary small"
                  onClick={() => setEdit(item)}
                >
                  Edit
                </button>
              </div>
              {item.gig_id && (
                <Link className="text-link" to={`/gigs/${item.gig_id}`}>
                  View related gig
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Your work belongs here">
          Add a real client site or a clearly labelled demo to share with
          prospects.
        </Empty>
      )}
      {edit && (
        <Sheet
          title={edit === "new" ? "Add portfolio link" : "Edit portfolio link"}
          onClose={() => setEdit(null)}
        >
          <PortfolioForm
            item={edit === "new" ? undefined : edit}
            gigs={gigs.data || []}
            onClose={() => setEdit(null)}
          />
        </Sheet>
      )}
    </div>
  );
}
function PortfolioForm({
  item,
  gigs,
  onClose,
}: {
  item?: PortfolioItem;
  gigs: Gig[];
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api(item ? `/portfolio/${item.id}` : "/portfolio", {
        method: item ? "PATCH" : "POST",
        body,
      }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save.mutate({
      title: d.get("title"),
      niche: d.get("niche"),
      link: d.get("link"),
      kind: d.get("kind"),
      gig_id: d.get("gig_id") || null,
    });
  }
  return (
    <form onSubmit={submit}>
      <Field label="Title">
        <input name="title" required defaultValue={item?.title} />
      </Field>
      <Field label="Niche">
        <input name="niche" defaultValue={item?.niche} />
      </Field>
      <Field label="Website link">
        <input
          name="link"
          type="url"
          required
          defaultValue={item?.link}
          placeholder="https://"
        />
      </Field>
      <Field label="Honest label">
        <select name="kind" required defaultValue={item?.kind || ""}>
          <option value="" disabled>
            Choose the right label
          </option>
          <option value="real_client">Real client</option>
          <option value="demo">Demo</option>
        </select>
      </Field>
      <p className="muted section-intro">
        Use Real client only for actual client work. A practice site is a Demo.
      </p>
      <GigSelect gigs={gigs} value={item?.gig_id} />
      <ErrorNotice error={save.error} />
      <button className="button" disabled={save.isPending}>
        Save portfolio link
      </button>
    </form>
  );
}
function GigSelect({ gigs, value }: { gigs: Gig[]; value?: string | null }) {
  return (
    <Field label="Related gig (optional)">
      <select name="gig_id" defaultValue={value || ""}>
        <option value="">Standalone</option>
        {gigs.map((g) => (
          <option key={g.id} value={g.id}>
            {g.business_name}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function GigPortfolio({ id }: { id: string }) {
  const items = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => api<PortfolioItem[]>(`/portfolio?gig_id=${id}`),
  });
  if (items.isError) return <ErrorNotice error={items.error} />;
  if (!items.data?.length) return null;
  return (
    <section className="panel">
      <h2>Portfolio & demos</h2>
      {items.data.map((p) => (
        <div className="related-portfolio" key={p.id}>
          <span className="pill">
            {p.kind === "real_client" ? "Real client" : "Demo"}
          </span>
          <LinkOut href={p.link}>{p.title}</LinkOut>
        </div>
      ))}
    </section>
  );
}
