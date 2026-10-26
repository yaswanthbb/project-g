import { GigPayments } from "./payments";
import { GigPortfolio } from "./finance";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Phone,
  FileText,
  MapPin,
  Pencil,
  Search,
} from "lucide-react";
import {
  type Gig,
  type GigPatch,
  type Today,
  type Status,
  STATUSES,
  money,
  dateLabel,
  localDate,
  whatsappLink,
} from "@gigs/shared";
import { api } from "./api";
import { PageTitle } from "./App";
import {
  CopyButton,
  Empty,
  ErrorNotice,
  Field,
  LinkOut,
  Loading,
  Pill,
  Progress,
  Sheet,
} from "./ui";
export function useGigMutation(id: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (patch: GigPatch) =>
      api<Gig>(`/gigs/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => cache.invalidateQueries(),
  });
}
export function GigCard({ gig }: { gig: Gig }) {
  return (
    <Link to={`/gigs/${gig.id}`} className="gig-card">
      <div className="card-top">
        <span className="business-avatar">{gig.business_name[0]}</span>
        <Pill gig={gig} />
      </div>
      <h3>{gig.business_name}</h3>
      <p className="muted">
        {[gig.business_type, gig.city_area].filter(Boolean).join(" · ") ||
          "Business details awaiting research"}
      </p>
      <p>{gig.problem_noticed}</p>
      <div className="card-bottom">
        <Progress gig={gig} />
        <ArrowUpRight size={20} />
      </div>
    </Link>
  );
}
export function TodayPage() {
  const result = useQuery({
    queryKey: ["today"],
    queryFn: () => api<Today>("/today"),
  });
  const cache = useQueryClient();
  const action = useMutation({
    mutationFn: ({
      id,
      n,
      action,
    }: {
      id: string;
      n: number;
      action: string;
    }) =>
      api(`/gigs/${id}/followups/${n}`, { method: "PATCH", body: { action } }),
    onSuccess: () => cache.invalidateQueries(),
  });
  if (result.isPending) return <Loading />;
  if (result.isError)
    return (
      <div className="page">
        <ErrorNotice error={result.error} />
        <button className="button" onClick={() => result.refetch()}>
          Try again
        </button>
      </div>
    );
  const data = result.data;
  const gig = data.current_gig;
  return (
    <div className="page today">
      <PageTitle
        eyebrow={dateLabel(data.date).toUpperCase()}
        title="One step at a time."
        subtitle="Your next move is ready. Let’s keep it simple."
      />
      <section className="today-section">
        <div className="section-heading">
          <h2>Do today</h2>
          <span className="section-caption">YOUR NEXT STEP</span>
        </div>
        {gig ? (
          <div className="next-action">
            <div>
              <div className="flex">
                <Pill gig={gig} />
                <span className="muted">{gig.business_name}</span>
              </div>
              <h2>
                {gig.status === "New"
                  ? "Review this gig and make it yours."
                  : data.next_step?.title || "Review your gig."}
              </h2>
              <p>
                {gig.status === "New"
                  ? gig.problem_noticed
                  : data.next_step?.detail ||
                    "Open the gig for the exact instruction and everything you need."}
              </p>
              <Link className="button" to={`/gigs/${gig.id}`}>
                {gig.status === "New" ? "Review gig" : "Take the next step"}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="next-action-side">
              <span className="step-number">
                {String(data.next_step?.position || 1).padStart(2, "0")}
              </span>
              <Progress gig={gig} />
            </div>
          </div>
        ) : (
          <Empty title="Nothing due today">
            You’re all caught up. New gigs from Muse will appear here.
          </Empty>
        )}
      </section>
      <section className="today-section">
        <div className="section-heading">
          <h2>
            Follow-ups due{" "}
            <span className="count">{data.followups.length}</span>
          </h2>
          <span className="section-caption">DAY 3 · DAY 7 · THEN STOP</span>
        </div>
        <ErrorNotice error={action.error} />
        {data.followups.length ? (
          <div className="followup-list">
            {data.followups.map((f) => (
              <div className="followup" key={`${f.gig_id}-${f.number}`}>
                <div>
                  <Link to={`/gigs/${f.gig_id}`}>
                    <h3>
                      {f.business_name}
                      <ArrowUpRight size={15} />
                    </h3>
                  </Link>
                  <p className="muted">
                    Follow-up {f.number} · {dateLabel(f.due_date)}
                  </p>
                </div>
                <div className="actions">
                  {[
                    ["sent", "Sent follow-up"],
                    ["replied", "Replied"],
                    ["lost", "Mark Lost"],
                  ].map(([act, label]) => (
                    <button
                      className="button secondary small"
                      disabled={action.isPending}
                      key={act}
                      onClick={() =>
                        action.mutate({
                          id: f.gig_id,
                          n: f.number,
                          action: act,
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="quiet-empty">
            No follow-ups due. We’ll keep track of the dates.
          </p>
        )}
      </section>
      <section className="today-section">
        <div className="section-heading">
          <h2>
            New gigs waiting{" "}
            <span className="count">{data.new_gigs.length}</span>
          </h2>
          <Link to="/gigs" className="text-link">
            All gigs <ArrowRight size={16} />
          </Link>
        </div>
        {data.new_gigs.length ? (
          <div className="waiting-list">
            {data.new_gigs.map((g) => (
              <div className="waiting-row" key={g.id}><div><h3>{g.business_name}</h3><p className="muted">{[g.business_type,g.city_area].filter(Boolean).join(" · ")}</p></div><Link className="button secondary small" to={`/gigs/${g.id}`}>Review gig <ArrowRight size={16}/></Link></div>
            ))}
          </div>
        ) : (
          <p className="quiet-empty">
            No new gigs yet. Your next opportunity will land here.
          </p>
        )}
      </section>
    </div>
  );
}
export function AllGigsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const result = useQuery({
    queryKey: ["gigs", q, status],
    queryFn: () =>
      api<Gig[]>(
        `/gigs?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`.replace(
          /&status=$/,
          "",
        ),
      ),
  });
  return (
    <div className="page">
      <PageTitle
        eyebrow="YOUR OPPORTUNITIES"
        title="All gigs."
        subtitle="Every conversation starts somewhere."
      />
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search by business name"
            placeholder="Search business name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <>
          <ErrorNotice error={result.error} />
          <button onClick={() => result.refetch()} className="button">
            Try again
          </button>
        </>
      ) : result.data.length ? (
        <div className="gig-grid">
          {result.data.map((g) => (
            <GigCard gig={g} key={g.id} />
          ))}
        </div>
      ) : (
        <Empty title={q || status ? "No matching gigs" : "No gigs yet"}>
          {q || status
            ? "Try a different name or status."
            : "Gigs researched by Muse will appear here, ready for you to review."}
        </Empty>
      )}
    </div>
  );
}
export function GigPage() {
  const { id } = useParams();
  const result = useQuery({
    queryKey: ["gig", id],
    queryFn: () => api<Gig>(`/gigs/${id}`),
  });
  if (result.isPending) return <Loading />;
  if (result.isError)
    return (
      <div className="page">
        <Link to="/gigs" className="back">
          <ArrowLeft size={16} />
          All gigs
        </Link>
        <ErrorNotice error={result.error} />
        <button className="button" onClick={() => result.refetch()}>
          Try again
        </button>
      </div>
    );
  return <GigDetail key={result.data.id} gig={result.data} />;
}
export function GigDetail({ gig }: { gig: Gig }) {
  const [sheet, setSheet] = useState<
    "call" | "pricing" | "edit" | "Won" | "Paid advance" | null
  >(null);
  const [draft, setDraft] = useState({original:gig.notes,value:gig.notes});
  const notes = draft.value === draft.original ? gig.notes : draft.value;
  const notesConflict = draft.value !== draft.original && gig.notes !== draft.original && gig.notes !== draft.value;
  const patch = useGigMutation(gig.id);
  const cache = useQueryClient();
  const step = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api(`/gigs/${gig.id}/steps/${id}`, { method: "PATCH", body: { done } }),
    onSuccess: () => cache.invalidateQueries(),
  });
  function status(value: Status) {
    if (value === "Won" || value === "Paid advance") {
      setSheet(value);
    } else patch.mutate({ status: value });
  }
  return (
    <div className="page detail-page">
      <Link className="back" to="/gigs">
        <ArrowLeft size={16} />
        All gigs
      </Link>
      <header className="gig-heading">
        <div>
          <div className="flex">
            <Pill gig={gig} />
            <span className="eyebrow">YOUR OPPORTUNITY</span>
          </div>
          <h1>{gig.business_name}</h1>
          <p className="muted">
            <MapPin size={16} />
            {[gig.business_type, gig.city_area].filter(Boolean).join(" · ") ||
              "Location not provided"}
          </p>
        </div>
        <button className="button secondary" onClick={() => setSheet("edit")}>
          <Pencil size={16} />
          Edit gig
        </button>
      </header>
      <ErrorNotice error={patch.error} />
      <div className="gig-toolbar">
        <label className="status-control">
          Status
          <select
            aria-label="Gig status"
            value={gig.status}
            disabled={patch.isPending}
            onChange={(e) => status(e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button className="button secondary" onClick={() => setSheet("call")}>
            <Phone size={17} />
            Call script
          </button>
          <button
            className="button secondary"
            onClick={() => setSheet("pricing")}
          >
            <FileText size={17} />
            Pricing sheet
          </button>
        </div>
      </div>
      {gig.status === "New" && (
        <div className="approval-bar">
          <div>
            <strong>
              {gig.skipped_at
                ? "You skipped this gig."
                : "A new opportunity, ready for your review."}
            </strong>
            <p>
              Read the research. Edit anything you need, then approve before
              outreach.
            </p>
          </div>
          <div className="actions">
            <button
              className="button"
              disabled={patch.isPending}
              onClick={() => patch.mutate({ status: "Approved" })}
            >
              Approve
            </button>
            <button
              className="button secondary"
              onClick={() => setSheet("edit")}
            >
              Edit
            </button>
            <button
              className="button ghost"
              disabled={patch.isPending || !!gig.skipped_at}
              onClick={() => patch.mutate({ skipped: true })}
            >
              Skip
            </button>
          </div>
        </div>
      )}
      <div className="detail-grid">
        <div className="detail-primary">
          <section className="panel research">
            <span className="eyebrow">THE OPPORTUNITY</span>
            <h2>Problem noticed</h2>
            <p className="large-copy">{gig.problem_noticed}</p>
            <h3>Why it fits you</h3>
            <p>{gig.why_it_fits}</p>
            {gig.demo_link && <LinkOut href={gig.demo_link}>Open demo</LinkOut>}
            <div className="research-footer">
              <span>Source: {gig.source || "Not provided"}</span>
              <strong>
                {gig.price_min != null || gig.price_max != null
                  ? `${gig.price_min != null ? money(gig.price_min) : "Price to discuss"} – ${gig.price_max != null ? money(gig.price_max) : "Price to discuss"}`
                  : "Price range to be set"}
              </strong>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Your approach</h2>
              <Progress gig={gig} />
            </div>
            <ErrorNotice error={step.error} />
            <ol className="checklist">
              {gig.steps.map((s) => (
                <li key={s.id} className={s.done ? "done" : ""}>
                  <label>
                    <input
                      type="checkbox"
                      checked={s.done}
                      disabled={step.isPending}
                      onChange={(e) =>
                        step.mutate({ id: s.id, done: e.target.checked })
                      }
                    />
                    <span className="step-position">
                      {String(s.position).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      {s.detail && <small>{s.detail}</small>}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2>Ready to reach out</h2>
            <p className="muted">
              Copy, review, then send yourself. Copying won’t change the status.
            </p>
            {!gig.outreach_allowed && (
              <p className="approval-hint">
                Approve this gig to unlock outreach.
              </p>
            )}
            {[
              ["WhatsApp", gig.outreach_whatsapp],
              ["Email", gig.outreach_email],
            ].map(([label, message]) => (
              <div className="message" key={label}>
                <div className="section-heading">
                  <h3>{label}</h3>
                  <CopyButton
                    label={`Copy ${label} message`}
                    text={message || ""}
                    disabled={!gig.outreach_allowed}
                  />
                </div>
                <p>{message || "No message provided. Add one in Edit gig."}</p>
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>Your notes</h2>
            {notesConflict && <div className="hint"><p>Notes changed on another device. Your draft is kept.</p><p>Saved notes: {gig.notes || "Empty"}</p><button className="button secondary small" onClick={()=>setDraft({original:gig.notes,value:gig.notes})}>Use saved notes</button><button className="button secondary small" onClick={()=>setDraft({...draft,original:gig.notes})}>Keep my draft for saving</button></div>}
            <textarea
              aria-label="Gig notes"
              rows={4}
              value={notes}
              onChange={(e) => setDraft({original:draft.value===draft.original ? gig.notes:draft.original,value:e.target.value})}
              placeholder="Call details, replies, anything to remember…"
            />
            <div className="notes-footer">
              <span className="muted" role="status">
                {patch.isSuccess && notes === gig.notes
                  ? "Saved"
                  : notes !== gig.notes
                    ? "Unsaved changes"
                    : "Only for this gig"}
              </span>
              <button
                className="button secondary"
                disabled={patch.isPending || notes === gig.notes}
                onClick={() => patch.mutate({ notes, notes_original:draft.value===draft.original ? gig.notes:draft.original },{onSuccess:saved=>setDraft({original:saved.notes,value:saved.notes})})}
              >
                Save notes
              </button>
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <GigPortfolio id={gig.id} />
          <GigPayments gig={gig} />
          <section className="panel">
            <span className="eyebrow">THE BUSINESS</span>
            <h2>{gig.contact_name || "Contact details"}</h2>
            <dl className="contact-list">
              <dt>WhatsApp</dt>
              <dd>
                {gig.contact_whatsapp ? (
                  gig.outreach_allowed ? (
                    <LinkOut href={whatsappLink(gig.contact_whatsapp)}>
                      {gig.contact_whatsapp}
                    </LinkOut>
                  ) : (
                    gig.contact_whatsapp
                  )
                ) : (
                  "Not provided"
                )}
              </dd>
              <dt>Email</dt>
              <dd>
                {gig.contact_email ? (
                  gig.outreach_allowed ? (
                    <a href={`mailto:${gig.contact_email}`}>
                      {gig.contact_email}
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    gig.contact_email
                  )
                ) : (
                  "Not provided"
                )}
              </dd>
              <dt>Area</dt>
              <dd>{gig.city_area || "Not provided"}</dd>
            </dl>
          </section>
          <section className="panel terms-note">
            <MessageCircle size={22} />
            <h3>Keep it personal.</h3>
            <p>
              One thoughtful message. A clear offer. Follow up on Day 3 and Day
              7, then let it rest.
            </p>
            {gig.sent_at && <small>First sent {dateLabel(gig.sent_at)}</small>}
          </section>
        </aside>
      </div>
      {sheet && (
        <Sheet
          title={
            sheet === "call"
              ? "Your call script"
              : sheet === "pricing"
                ? "Pricing & terms"
                : sheet === "edit"
                  ? "Edit gig"
                  : sheet === "Won"
                    ? "Agree the quote"
                    : "Record the advance"
          }
          onClose={() => setSheet(null)}
        >
          {sheet === "call" ? (
            <p className="script">{gig.call_script}</p>
          ) : sheet === "pricing" ? (
            <Pricing gig={gig} />
          ) : sheet === "edit" ? (
            <EditGig gig={gig} onClose={() => setSheet(null)} />
          ) : (
            <PaymentPrompt
              gig={gig}
              status={sheet}
              onClose={() => setSheet(null)}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}
export function Pricing({ gig }: { gig: Gig }) {
  return (
    <div>
      <p className="eyebrow">THIS GIG</p>
      <h3>
        {gig.price_min != null && gig.price_max != null
          ? `${money(gig.price_min)} – ${money(gig.price_max)}`
          : "Set the range after reviewing scope"}
      </h3>
      <h3>Price guides</h3>
      <dl className="price-guides">
        <dt>Basic site · about 5 pages</dt>
        <dd>₹8,000–15,000</dd>
        <dt>Landing page</dt>
        <dd>₹5,000–9,000</dd>
        <dt>Google Business Profile + website</dt>
        <dd>₹10,000–18,000</dd>
        <dt>Maintenance / month</dt>
        <dd>₹1,000–2,500</dd>
      </dl>
      <h3>Terms to share</h3>
      <ul className="terms">
        <li>
          <strong>50% advance before building.</strong>
        </li>
        <li>Balance on delivery.</li>
        <li>2 revisions included; extra changes are paid.</li>
        <li>5–7 days for a basic site.</li>
        <li>Yearly domain and hosting renewal separate.</li>
      </ul>
      <p className="hint">
        Ask scope first. Give a range on the call, then the exact quote in
        writing.
      </p>
    </div>
  );
}
function EditGig({ gig, onClose }: { gig: Gig; onClose: () => void }) {
  const patch = useGigMutation(gig.id);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body: Record<string, string | number | null> = {};
    for (const [key, value] of data) {
      const s = String(value);
      body[key] = key.startsWith("price_")
        ? s
          ? Number(s)
          : null
        : s ||
          ([
            "contact_name",
            "contact_whatsapp",
            "contact_email",
            "demo_link",
            "outreach_email",
            "call_script",
          ].includes(key)
            ? null
            : "");
    }
    patch.mutate(body as GigPatch, { onSuccess: onClose });
  }
  return (
    <form onSubmit={submit}>
      {(
        [
          ["business_name", "Business name"],
          ["business_type", "Business type / niche"],
          ["city_area", "City / area"],
          ["contact_name", "Contact name"],
          ["contact_whatsapp", "WhatsApp number (include country code)"],
          ["contact_email", "Email"],
          ["source", "Source of lead"],
          ["demo_link", "Demo link"],
          ["price_min", "Price range · minimum (₹)"],
          ["price_max", "Price range · maximum (₹)"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            name={key}
            defaultValue={String(gig[key] ?? "")}
            required={key === "business_name"}
            type={
              key.startsWith("price_")
                ? "number"
                : key === "demo_link"
                  ? "url"
                  : key === "contact_email"
                    ? "email"
                    : "text"
            }
            min={0}
            step={key.startsWith("price_") ? "0.01" : undefined}
          />
        </Field>
      ))}
      {(
        [
          ["problem_noticed", "Problem noticed"],
          ["why_it_fits", "Why it fits"],
          ["outreach_whatsapp", "WhatsApp message"],
          ["outreach_email", "Email message"],
          ["call_script", "Call script"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          <textarea
            name={key}
            defaultValue={gig[key] || ""}
            rows={3}
            required={key === "problem_noticed" || key === "why_it_fits"}
          />
        </Field>
      ))}
      <ErrorNotice error={patch.error} />
      <button className="button" disabled={patch.isPending}>
        {patch.isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
function PaymentPrompt({
  gig,
  status,
  onClose,
}: {
  gig: Gig;
  status: "Won" | "Paid advance";
  onClose: () => void;
}) {
  const [quote, setQuote] = useState(String(gig.quoted_price || ""));
  const [advance, setAdvance] = useState(
    String(gig.advance_amount || Number(quote) / 2 || ""),
  );
  const patch = useGigMutation(gig.id);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    patch.mutate(
      {
        status,
        quoted_price: Number(quote),
        advance_amount: Number(advance),
        ...(status === "Paid advance"
          ? { advance_paid_at: String(data.get("date")) }
          : {}),
      },
      { onSuccess: onClose },
    );
  }
  return (
    <form onSubmit={submit}>
      <p>
        {status === "Won"
          ? "Confirm the written quote. Collect the advance before building."
          : "Record the payment you received outside the app."}
      </p>
      <Field label="Quoted price (₹)">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={quote}
          required
          onChange={(e) => {
            setQuote(e.target.value);
            setAdvance(String(Math.round(Number(e.target.value) * 50) / 100));
          }}
        />
      </Field>
      <Field label="Advance amount (₹) · defaults to 50%">
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={Number(quote) || undefined}
          required
          value={advance}
          onChange={(e) => setAdvance(e.target.value)}
        />
      </Field>
      {status === "Paid advance" && (
        <Field label="Advance paid date">
          <input
            name="date"
            type="date"
            required
            max={localDate()}
            defaultValue={localDate()}
          />
        </Field>
      )}
      <ErrorNotice error={patch.error} />
      <button className="button" disabled={patch.isPending}>
        {status === "Won" ? "Confirm Won" : "Save Paid advance"}
      </button>
    </form>
  );
}
