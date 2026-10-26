import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  type Earnings,
  type Gig,
  type Money,
  type PortfolioItem,
  type Retainer,
  money,
  localDate,
  dateLabel,
} from "@gigs/shared";
import { useWorkspace } from "./context";
import {
  Body,
  Button,
  Card,
  DateField,
  Empty,
  ErrorNotice,
  Field,
  H2,
  Loading,
  OpenLink,
  Page,
  Section,
  Select,
  Sheet,
  Title,
  s,
} from "./ui";
import { PaymentEditor } from "./gigs";
export function EarningsScreen() {
  const { api } = useWorkspace();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [edit, setEdit] = useState<Retainer | "new" | null>(null);
  const [receipt, setReceipt] = useState<Retainer | null>(null);
  const [paymentGig, setPaymentGig] = useState<Gig | null>(null);
  const data = useQuery({
    queryKey: ["earnings", month],
    queryFn: () => api<Earnings>(`/earnings?month=${month}`),
    enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
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
    <Page
      onRefresh={() => {
        data.refetch();
        gigs.refetch();
        retainers.refetch();
      }}
      refreshing={data.isRefetching || retainers.isRefetching}
    >
      <Title
        eyebrow="STEADY PROGRESS"
        title="Small wins add up."
        subtitle="What you’ve received, what’s pending, and your next milestone."
      />
      <Field
        label="Month (YYYY-MM)"
        value={month}
        onChangeText={setMonth}
        placeholder="2026-10"
        maxLength={7}
      />
      {!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? (
        <Body muted>Enter a month as YYYY-MM.</Body>
      ) : data.isPending ? (
        <Loading />
      ) : data.isError ? (
        <>
          <ErrorNotice error={data.error} />
          <Button onPress={() => data.refetch()}>Try again</Button>
        </>
      ) : (
        <>
          <Card soft>
            <Text style={s.eyebrow}>RECEIVED THIS MONTH</Text>
            <Text style={s.earned}>{money(data.data.received)}</Text>
            <Body>Goal: ₹10,000–15,000/month</Body>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Monthly earnings progress"
              accessibilityValue={{
                min: 0,
                max: 10000,
                now: Math.min(Number(data.data.received), 10000),
              }}
              style={s.track}
            >
              <View
                style={[
                  s.fill,
                  {
                    width: `${Math.min(Number(data.data.received) / 100, 100)}%`,
                  },
                ]}
              />
            </View>
            <Body muted>
              {Number(data.data.remaining_to_goal) > 0
                ? `${money(data.data.remaining_to_goal)} to ₹10,000`
                : "₹10,000 milestone reached"}
            </Body>
            <View style={s.divider} />
            <Body>Advances received: {money(data.data.advances)}</Body>
            <Body>Balances received: {money(data.data.balances)}</Body>
            <Body>Maintenance received: {money(data.data.maintenance)}</Body>
          </Card>
          <Card>
            <Text style={s.eyebrow}>OUTSTANDING NOW</Text>
            <Text style={s.businessName}>{money(data.data.pending)}</Text>
            <Body muted>
              {money(data.data.pending_websites)} in website payments
            </Body>
            <Body muted>
              {money(data.data.maintenance_due)} in maintenance currently due
            </Body>
          </Card>
          <Section title="Received this month">
            {data.data.payments.length ? (
              data.data.payments.map((p) => (
                <Card key={p.id}>
                  <Body>{p.business_name}</Body>
                  <Body muted>
                    {p.kind[0].toUpperCase() + p.kind.slice(1)} ·{" "}
                    {dateLabel(p.paid_at)}
                  </Body>
                  <H2>{money(p.amount)}</H2>
                </Card>
              ))
            ) : (
              <Body muted>No payments recorded for this month.</Body>
            )}
          </Section>
        </>
      )}
      <Section title="Website payments">
        {gigs.isPending ? (
          <Loading />
        ) : gigs.isError ? (
          <ErrorNotice error={gigs.error} />
        ) : gigs.data.length ? (
          gigs.data.map((g) => (
            <Card key={g.id}>
              <H2>{g.business_name}</H2>
              <Body>
                Quote:{" "}
                {g.quoted_price != null
                  ? money(g.quoted_price)
                  : "Not quoted yet"}
              </Body>
              <Body muted>Received: {money(g.total_received)}</Body>
              <Button secondary onPress={() => setPaymentGig(g)}>
                Edit payments
              </Button>
            </Card>
          ))
        ) : (
          <Body muted>No gigs yet. Website payments will appear here.</Body>
        )}
      </Section>
      <Section title="Maintenance retainers">
        <Body muted>
          Your guide is ₹1,000–2,500/month. Set the actual amount for each
          client.
        </Body>
        <Button secondary onPress={() => setEdit("new")}>
          Add retainer
        </Button>
        {retainers.isPending ? (
          <Loading />
        ) : retainers.isError ? (
          <ErrorNotice error={retainers.error} />
        ) : retainers.data.length ? (
          retainers.data.map((r) => (
            <Card key={r.id}>
              <View style={s.row}>
                <H2>{r.business_name}</H2>
                <Text style={s.pill}>{r.active ? "Active" : "Paused"}</Text>
              </View>
              <Body>{money(r.monthly_amount)} / month</Body>
              <Body muted>Next due {dateLabel(r.next_due_date)}</Body>
              <Button secondary onPress={() => setEdit(r)}>
                Edit retainer
              </Button>
              <Button onPress={() => setReceipt(r)}>Record payment</Button>
            </Card>
          ))
        ) : (
          <Empty title="No retainers yet">
            Add a client when you agree a monthly maintenance plan.
          </Empty>
        )}
      </Section>
      {edit && (
        <Sheet
          title={edit === "new" ? "Add maintenance retainer" : "Edit retainer"}
          onClose={() => setEdit(null)}
        >
          <RetainerForm
            item={edit === "new" ? undefined : edit}
            gigs={gigs.data || []}
            onClose={() => setEdit(null)}
          />
        </Sheet>
      )}
      {receipt && (
        <Sheet
          title={`Payment · ${receipt.business_name}`}
          onClose={() => setReceipt(null)}
        >
          <RetainerReceipt item={receipt} onClose={() => setReceipt(null)} />
        </Sheet>
      )}
      {paymentGig && (
        <Sheet
          title={`Payments · ${paymentGig.business_name}`}
          onClose={() => setPaymentGig(null)}
        >
          <PaymentEditor gig={paymentGig} onClose={() => setPaymentGig(null)} />
        </Sheet>
      )}
    </Page>
  );
}
function GigSelect({
  gigs,
  value,
  onChange,
}: {
  gigs: Gig[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select
      label="Related gig (optional)"
      value={value}
      onChange={onChange}
      options={[
        { value: "", label: "Standalone" },
        ...gigs.map((g) => ({ value: g.id, label: g.business_name })),
      ]}
    />
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
  const { api } = useWorkspace();
  const cache = useQueryClient();
  const [name, setName] = useState(item?.business_name || "");
  const [amount, setAmount] = useState(String(item?.monthly_amount || ""));
  const [due, setDue] = useState(item?.next_due_date || localDate());
  const [gigId, setGigId] = useState(item?.gig_id || "");
  const [active, setActive] = useState(item?.active ?? true);
  const save = useMutation({
    mutationFn: () =>
      api(item ? `/retainers/${item.id}` : "/retainers", {
        method: item ? "PATCH" : "POST",
        body: {
          business_name: name,
          monthly_amount: Number(amount),
          next_due_date: due,
          gig_id: gigId || null,
          active,
        },
      }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  return (
    <>
      <Field label="Business name" value={name} onChangeText={setName} />
      <Field
        label="Monthly amount (₹)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <DateField label="Next due date" value={due} onChange={setDue} />
      <GigSelect gigs={gigs} value={gigId} onChange={setGigId} />
      <View style={s.row}>
        <Body>Active retainer</Body>
        <Switch
          accessibilityLabel="Active retainer"
          value={active}
          onValueChange={setActive}
        />
      </View>
      <ErrorNotice error={save.error} />
      <Button
        disabled={save.isPending || !name.trim() || !Number(amount) || !due}
        onPress={() => save.mutate()}
      >
        Save retainer
      </Button>
    </>
  );
}
function RetainerReceipt({
  item,
  onClose,
}: {
  item: Retainer;
  onClose: () => void;
}) {
  const { api } = useWorkspace();
  const cache = useQueryClient();
  const [id] = useState(() => Crypto.randomUUID());
  const [amount, setAmount] = useState(String(item.monthly_amount));
  const [paid, setPaid] = useState(localDate());
  const history = useQuery({
    queryKey: ["retainer-payments", item.id],
    queryFn: () =>
      api<{ id: string; amount: Money; paid_at: string }[]>(
        `/retainers/${item.id}/payments`,
      ),
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/retainers/${item.id}/payments`, {
        method: "POST",
        body: { id, amount: Number(amount), paid_at: paid },
      }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  return (
    <>
      <Body muted>
        Record money already received. The next due date moves forward one month
        after saving.
      </Body>
      <Field
        label="Amount received (₹)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <DateField label="Paid date" value={paid} onChange={setPaid} paid />
      <ErrorNotice error={save.error} />
      <Button
        disabled={save.isPending || !Number(amount) || !paid}
        onPress={() => save.mutate()}
      >
        Record received payment
      </Button>
      <H2>Recorded payments</H2>
      {history.isPending ? (
        <Loading />
      ) : history.isError ? (
        <ErrorNotice error={history.error} />
      ) : history.data.length ? (
        history.data.map((p) => (
          <View key={p.id} style={s.fact}>
            <Body>{money(p.amount)}</Body>
            <Body muted>{dateLabel(p.paid_at)}</Body>
          </View>
        ))
      ) : (
        <Body muted>No payments recorded yet.</Body>
      )}
    </>
  );
}
export function PortfolioScreen() {
  const { api, openGig } = useWorkspace();
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
    <Page onRefresh={() => items.refetch()} refreshing={items.isRefetching}>
      <Title
        eyebrow="WORK YOU CAN SHARE"
        title="Let your work speak."
        subtitle="Real projects and honest demos. Ready to open on a call."
      />
      <Button onPress={() => setEdit("new")}>Add a link</Button>
      {items.isPending ? (
        <Loading />
      ) : items.isError ? (
        <>
          <ErrorNotice error={items.error} />
          <Button onPress={() => items.refetch()}>Try again</Button>
        </>
      ) : items.data.length ? (
        items.data.map((p) => (
          <Card key={p.id}>
            <Text style={s.pill}>
              {p.kind === "real_client" ? "Real client" : "Demo"}
            </Text>
            <H2>{p.title}</H2>
            <Body muted>{p.niche || "Niche not specified"}</Body>
            <OpenLink url={p.link}>Open website</OpenLink>
            <Button secondary onPress={() => setEdit(p)}>
              Edit portfolio link
            </Button>
            {p.gig_id && (
              <Button secondary onPress={() => openGig(p.gig_id!)}>
                View related gig
              </Button>
            )}
          </Card>
        ))
      ) : (
        <Empty title="Your work belongs here">
          Add a real client site or a clearly labelled demo.
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
    </Page>
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
  const { api } = useWorkspace();
  const cache = useQueryClient();
  const [title, setTitle] = useState(item?.title || "");
  const [niche, setNiche] = useState(item?.niche || "");
  const [link, setLink] = useState(item?.link || "");
  const [kind, setKind] = useState(item?.kind || "");
  const [gigId, setGigId] = useState(item?.gig_id || "");
  const save = useMutation({
    mutationFn: () =>
      api(item ? `/portfolio/${item.id}` : "/portfolio", {
        method: item ? "PATCH" : "POST",
        body: { title, niche, link, kind, gig_id: gigId || null },
      }),
    onSuccess: () => {
      cache.invalidateQueries();
      onClose();
    },
  });
  return (
    <>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Niche" value={niche} onChangeText={setNiche} />
      <Field
        label="Website link"
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://"
      />
      <Select
        label="Honest label"
        value={kind}
        onChange={setKind}
        options={[
          { value: "", label: "Choose the right label" },
          { value: "real_client", label: "Real client" },
          { value: "demo", label: "Demo" },
        ]}
      />
      <Body muted>
        Use Real client only for actual client work. A practice site is a Demo.
      </Body>
      <GigSelect gigs={gigs} value={gigId} onChange={setGigId} />
      <ErrorNotice error={save.error} />
      <Button
        disabled={save.isPending || !title.trim() || !link || !kind}
        onPress={() => save.mutate()}
      >
        Save portfolio link
      </Button>
    </>
  );
}
export function GigPortfolio({ id }: { id: string }) {
  const { api } = useWorkspace();
  const items = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => api<PortfolioItem[]>(`/portfolio?gig_id=${id}`),
  });
  if (items.isError) return <ErrorNotice error={items.error} />;
  if (!items.data?.length) return null;
  return (
    <Card>
      <H2>Portfolio & demos</H2>
      {items.data.map((p) => (
        <View key={p.id}>
          <Text style={s.pill}>
            {p.kind === "real_client" ? "Real client" : "Demo"}
          </Text>
          <OpenLink url={p.link}>{p.title}</OpenLink>
        </View>
      ))}
    </Card>
  );
}
