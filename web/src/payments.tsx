import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Gig, money, dateLabel, localDate } from "@gigs/shared";
import { api } from "./api";
import { ErrorNotice, Field, Sheet } from "./ui";
export function GigPayments({ gig }: { gig: Gig }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Payments</h2>
        <button
          className="button secondary small"
          onClick={() => setOpen(true)}
        >
          Edit payments
        </button>
      </div>
      <dl className="payment-facts">
        <dt>Quoted price</dt>
        <dd>
          {gig.quoted_price != null
            ? money(gig.quoted_price)
            : "Not quoted yet"}
        </dd>
        <dt>Advance</dt>
        <dd>
          {money(gig.advance_amount)}
          <small>{dateLabel(gig.advance_paid_at)}</small>
        </dd>
        <dt>Balance</dt>
        <dd>
          {money(gig.balance_amount)}
          <small>{dateLabel(gig.balance_paid_at)}</small>
        </dd>
        <dt>Total received</dt>
        <dd>
          <strong>{money(gig.total_received)}</strong>
        </dd>
      </dl>
      <p className="muted">
        50% advance before building. Payments happen outside this app.
      </p>
      {open && (
        <Sheet
          title={`Payments · ${gig.business_name}`}
          onClose={() => setOpen(false)}
        >
          <PaymentEditor gig={gig} onClose={() => setOpen(false)} />
        </Sheet>
      )}
    </section>
  );
}
export function PaymentEditor({
  gig,
  onClose,
}: {
  gig: Gig;
  onClose: () => void;
}) {
  const [quote, setQuote] = useState(String(gig.quoted_price || ""));
  const [advance, setAdvance] = useState(
    String(gig.advance_amount ?? (Number(quote) / 2 || "")),
  );
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api(`/gigs/${gig.id}`, { method: "PATCH", body }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save.mutate({
      quoted_price: quote ? Number(quote) : null,
      advance_amount: advance ? Number(advance) : null,
      advance_paid_at: d.get("advance_date") || null,
      balance_paid_at: d.get("balance_date") || null,
    });
  }
  return (
    <form onSubmit={submit}>
      <p className="muted">
        Record money received outside the app. Leave a paid date empty until it
        is received.
      </p>
      <Field label="Quoted price (₹)">
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={quote}
          onChange={(e) => {
            setQuote(e.target.value);
            if (!gig.advance_paid_at)
              setAdvance(String(Math.round(Number(e.target.value) * 50) / 100));
          }}
        />
      </Field>
      <Field label="Advance amount (₹)">
        <input
          type="number"
          min="0"
          step="0.01"
          required
          max={Number(quote) || undefined}
          value={advance}
          onChange={(e) => setAdvance(e.target.value)}
        />
      </Field>
      <Field label="Advance paid date">
        <input
          name="advance_date"
          type="date"
          max={localDate()}
          defaultValue={gig.advance_paid_at || ""}
        />
      </Field>
      <p className="balance-preview">
        Balance:{" "}
        <strong>{money(Math.max(0, Number(quote) - Number(advance)))}</strong>
      </p>
      <Field label="Balance paid date">
        <input
          name="balance_date"
          type="date"
          max={localDate()}
          defaultValue={gig.balance_paid_at || ""}
        />
      </Field>
      <ErrorNotice error={save.error} />
      <button className="button" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save payment details"}
      </button>
    </form>
  );
}
