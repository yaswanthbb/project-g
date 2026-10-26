import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Gig,
  type GigPatch,
  type Today,
  type Status,
  STATUSES,
  money,
  dateLabel,
  whatsappLink,
  localDate,
} from "@gigs/shared";
import { useWorkspace } from "./context";
import {
  Body,
  Button,
  Card,
  Copy,
  Empty,
  ErrorNotice,
  Field,
  GigCard,
  H2,
  Loading,
  OpenLink,
  Page,
  Pill,
  Progress,
  Section,
  Select,
  Sheet,
  Title,
  DateField,
  s,
} from "./ui";
import { GigPortfolio } from "./finance";
export function usePatch(id: string) {
  const { api } = useWorkspace();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: GigPatch) =>
      api<Gig>(`/gigs/${id}`, { method: "PATCH", body }),
    onSuccess: () => cache.invalidateQueries(),
  });
}
export function TodayScreen() {
  const { api, openGig } = useWorkspace();
  const cache = useQueryClient();
  const result = useQuery({
    queryKey: ["today"],
    queryFn: () => api<Today>("/today"),
  });
  const followup = useMutation({
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
      <Page>
        <ErrorNotice error={result.error} />
        <Button onPress={() => result.refetch()}>Try again</Button>
      </Page>
    );
  const data = result.data;
  const gig = data.current_gig;
  return (
    <Page onRefresh={() => result.refetch()} refreshing={result.isRefetching}>
      <Title
        eyebrow={dateLabel(data.date).toUpperCase()}
        title="One step at a time."
        subtitle="Your next move is ready. Let’s keep it simple."
      />
      <Section title="Do today">
        {gig ? (
          <Card soft>
            <Pill gig={gig} />
            <Body muted>{gig.business_name}</Body>
            <Text style={s.businessName}>
              {gig.status === "New"
                ? "Review this gig and make it yours."
                : data.next_step?.title || "Review your gig."}
            </Text>
            <Body>
              {gig.status === "New"
                ? gig.problem_noticed
                : data.next_step?.detail ||
                  "Open the gig for the exact instruction and everything you need."}
            </Body>
            <Progress gig={gig} />
            <Button onPress={() => openGig(gig.id)}>
              {gig.status === "New" ? "Review gig" : "Take the next step"} →
            </Button>
          </Card>
        ) : (
          <Empty title="Nothing due today">
            You’re all caught up. New gigs from Muse will appear here.
          </Empty>
        )}
      </Section>
      <Section title={`Follow-ups due · ${data.followups.length}`}>
        <Body muted>Day 3 · Day 7 · then stop</Body>
        <ErrorNotice error={followup.error} />
        {data.followups.length ? (
          data.followups.map((f) => (
            <Card key={`${f.gig_id}-${f.number}`}>
              <H2>{f.business_name}</H2>
              <Body muted>
                Follow-up {f.number} · {dateLabel(f.due_date)}
              </Body>
              <Button secondary onPress={() => openGig(f.gig_id)}>
                Open gig
              </Button>
              {[
                ["sent", "Sent follow-up"],
                ["replied", "Replied"],
                ["lost", "Mark Lost"],
              ].map(([action, label]) => (
                <Button
                  secondary
                  key={action}
                  disabled={followup.isPending}
                  onPress={() =>
                    followup.mutate({ id: f.gig_id, n: f.number, action })
                  }
                >
                  {label}
                </Button>
              ))}
            </Card>
          ))
        ) : (
          <Body muted>No follow-ups due. We’ll keep track of the dates.</Body>
        )}
      </Section>
      <Section title={`New gigs waiting · ${data.new_gigs.length}`}>
        {data.new_gigs.length ? (
          data.new_gigs.map((g) => (
            <Card key={g.id}>
              <Body>{g.business_name}</Body>
              <Body muted>
                {[g.business_type, g.city_area].filter(Boolean).join(" · ")}
              </Body>
              <Button secondary onPress={() => openGig(g.id)}>
                Review gig
              </Button>
            </Card>
          ))
        ) : (
          <Body muted>
            No new gigs yet. Your next opportunity will land here.
          </Body>
        )}
      </Section>
    </Page>
  );
}
export function AllScreen() {
  const { api, openGig } = useWorkspace();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const result = useQuery({
    queryKey: ["gigs", q, status],
    queryFn: () =>
      api<Gig[]>(
        `/gigs?q=${encodeURIComponent(q)}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
      ),
  });
  return (
    <Page onRefresh={() => result.refetch()} refreshing={result.isRefetching}>
      <Title
        eyebrow="YOUR OPPORTUNITIES"
        title="All gigs."
        subtitle="Every conversation starts somewhere."
      />
      <Field
        label="Search by business name"
        value={q}
        onChangeText={setQ}
        placeholder="Search business name…"
      />
      <Select
        label="Filter by status"
        value={status}
        onChange={setStatus}
        options={[
          { label: "All statuses", value: "" },
          ...STATUSES.map((value) => ({ label: value, value })),
        ]}
      />
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <>
          <ErrorNotice error={result.error} />
          <Button onPress={() => result.refetch()}>Try again</Button>
        </>
      ) : result.data.length ? (
        result.data.map((g) => (
          <GigCard key={g.id} gig={g} onPress={() => openGig(g.id)} />
        ))
      ) : (
        <Empty title={q || status ? "No matching gigs" : "No gigs yet"}>
          {q || status
            ? "Try another name or status."
            : "Gigs from Muse will appear here, ready for your review."}
        </Empty>
      )}
    </Page>
  );
}
export function GigScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { api } = useWorkspace();
  const result = useQuery({
    queryKey: ["gig", id],
    queryFn: () => api<Gig>(`/gigs/${id}`),
  });
  if (result.isPending) return <Loading />;
  if (result.isError)
    return (
      <Page>
        <Button secondary onPress={onBack}>
          ← All gigs
        </Button>
        <ErrorNotice error={result.error} />
        <Button onPress={() => result.refetch()}>Try again</Button>
      </Page>
    );
  return (
    <GigDetail
      key={id}
      gig={result.data}
      onBack={onBack}
      refresh={() => result.refetch()}
    />
  );
}
export function GigDetail({
  gig,
  onBack,
  refresh,
}: {
  gig: Gig;
  onBack: () => void;
  refresh: () => void;
}) {
  const { api } = useWorkspace();
  const cache = useQueryClient();
  const [sheet, setSheet] = useState<
    "call" | "pricing" | "edit" | "payments" | "Won" | "Paid advance" | null
  >(null);
  const [draft, setDraft] = useState({ original: gig.notes, value: gig.notes });
  const notes = draft.value === draft.original ? gig.notes : draft.value;
  const notesConflict =
    draft.value !== draft.original &&
    gig.notes !== draft.original &&
    gig.notes !== draft.value;
  const patch = usePatch(gig.id);
  const step = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api(`/gigs/${gig.id}/steps/${id}`, { method: "PATCH", body: { done } }),
    onSuccess: () => cache.invalidateQueries(),
  });
  function status(value: Status) {
    if (value === "Won" || value === "Paid advance") setSheet(value);
    else patch.mutate({ status: value });
  }
  return (
    <Page onRefresh={refresh}>
      <Button secondary onPress={onBack}>
        ← All gigs
      </Button>
      <View style={s.title}>
        <Pill gig={gig} />
        <Text accessibilityRole="header" style={s.h1}>
          {gig.business_name}
        </Text>
        <Body muted>
          {[gig.business_type, gig.city_area].filter(Boolean).join(" · ")}
        </Body>
      </View>
      <Select
        label="Gig status"
        value={gig.status}
        options={STATUSES.map((value) => ({ label: value, value }))}
        onChange={(value) => {
          if (!patch.isPending) status(value as Status);
        }}
      />
      <ErrorNotice error={patch.error} />
      <Button secondary onPress={() => setSheet("edit")}>
        Edit gig
      </Button>
      <View style={s.row}>
        <Button secondary onPress={() => setSheet("call")}>
          Call script
        </Button>
        <Button secondary onPress={() => setSheet("pricing")}>
          Pricing sheet
        </Button>
      </View>
      {gig.status === "New" && (
        <Card soft>
          <H2>
            {gig.skipped_at
              ? "You skipped this gig."
              : "Ready for your review."}
          </H2>
          <Body>
            Read the research. Edit anything you need, then approve before
            outreach.
          </Body>
          <Button
            disabled={patch.isPending}
            onPress={() => patch.mutate({ status: "Approved" })}
          >
            Approve
          </Button>
          <Button secondary onPress={() => setSheet("edit")}>
            Edit
          </Button>
          <Button
            secondary
            disabled={patch.isPending || !!gig.skipped_at}
            onPress={() => patch.mutate({ skipped: true })}
          >
            Skip
          </Button>
        </Card>
      )}
      <Card>
        <Text style={s.eyebrow}>THE OPPORTUNITY</Text>
        <H2>Problem noticed</H2>
        <Text style={s.businessName}>{gig.problem_noticed}</Text>
        <H2>Why it fits you</H2>
        <Body>{gig.why_it_fits}</Body>
        <Body muted>Source: {gig.source || "Not provided"}</Body>
        <Body>
          Suggested range:{" "}
          {gig.price_min != null ? money(gig.price_min) : "To discuss"} –{" "}
          {gig.price_max != null ? money(gig.price_max) : "To discuss"}
        </Body>
        {gig.demo_link && <OpenLink url={gig.demo_link}>Open demo</OpenLink>}
      </Card>
      <Card>
        <H2>The business</H2>
        <Body>{gig.contact_name || "Contact name not provided"}</Body>
        <Body muted>WhatsApp</Body>
        {gig.contact_whatsapp ? (
          gig.outreach_allowed ? (
            <OpenLink url={whatsappLink(gig.contact_whatsapp)}>
              {gig.contact_whatsapp}
            </OpenLink>
          ) : (
            <Body>{gig.contact_whatsapp}</Body>
          )
        ) : (
          <Body>Not provided</Body>
        )}
        <Body muted>Email</Body>
        {gig.contact_email ? (
          gig.outreach_allowed ? (
            <OpenLink url={`mailto:${gig.contact_email}`}>
              {gig.contact_email}
            </OpenLink>
          ) : (
            <Body>{gig.contact_email}</Body>
          )
        ) : (
          <Body>Not provided</Body>
        )}
        <Body muted>{gig.city_area || "Area not provided"}</Body>
      </Card>
      <Card>
        <H2>Your approach</H2>
        <Progress gig={gig} />
        <ErrorNotice error={step.error} />
        {gig.steps.map((item) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: item.done,
              disabled: step.isPending,
            }}
            accessibilityLabel={`${item.position}. ${item.title}`}
            key={item.id}
            disabled={step.isPending}
            onPress={() => step.mutate({ id: item.id, done: !item.done })}
            style={s.check}
          >
            <Text style={s.checkbox}>{item.done ? "☑" : "☐"}</Text>
            <View style={s.checkText}>
              <Text style={[s.body, item.done && s.done]}>
                {item.position}. {item.title}
              </Text>
              {item.detail && <Body muted>{item.detail}</Body>}
            </View>
          </Pressable>
        ))}
      </Card>
      <Card>
        <H2>Ready to reach out</H2>
        <Body muted>
          Copy, review, then send yourself. Copying won’t change the status.
        </Body>
        {!gig.outreach_allowed && (
          <Body>Approve this gig to unlock outreach.</Body>
        )}
        {[
          ["WhatsApp", gig.outreach_whatsapp],
          ["Email", gig.outreach_email],
        ].map(([label, message]) => (
          <View key={label} style={{ gap: 12, marginVertical: 12 }}>
            <H2>{label}</H2>
            <Body>
              {message || "No message provided. Add one in Edit gig."}
            </Body>
            <Copy
              label={`Copy ${label} message`}
              text={message || ""}
              disabled={!gig.outreach_allowed}
            />
          </View>
        ))}
      </Card>
      <Card>
        <H2>Your notes</H2>
        {notesConflict && (
          <>
            <Body>Notes changed on another device. Your draft is kept.</Body>
            <Body muted>Saved notes: {gig.notes || "Empty"}</Body>
            <Button
              secondary
              onPress={() =>
                setDraft({ original: gig.notes, value: gig.notes })
              }
            >
              Use saved notes
            </Button>
            <Button
              secondary
              onPress={() => setDraft({ ...draft, original: gig.notes })}
            >
              Keep my draft for saving
            </Button>
          </>
        )}
        <Field
          label="Gig notes"
          multiline
          value={notes}
          onChangeText={(value) =>
            setDraft({
              original:
                draft.value === draft.original ? gig.notes : draft.original,
              value,
            })
          }
          placeholder="Call details, replies, anything to remember…"
        />
        <Button
          secondary
          disabled={patch.isPending || notes === gig.notes}
          onPress={() =>
            patch.mutate(
              {
                notes,
                notes_original:
                  draft.value === draft.original ? gig.notes : draft.original,
              },
              {
                onSuccess: (saved) =>
                  setDraft({ original: saved.notes, value: saved.notes }),
              },
            )
          }
        >
          Save notes
        </Button>
        <Body muted>{notes === gig.notes ? "Saved" : "Unsaved changes"}</Body>
      </Card>
      <Card>
        <H2>Payments</H2>
        <Body>
          Quote:{" "}
          {gig.quoted_price != null
            ? money(gig.quoted_price)
            : "Not quoted yet"}
        </Body>
        <Body>
          Advance: {money(gig.advance_amount)} ·{" "}
          {dateLabel(gig.advance_paid_at)}
        </Body>
        <Body>
          Balance: {money(gig.balance_amount)} ·{" "}
          {dateLabel(gig.balance_paid_at)}
        </Body>
        <Body>Total received: {money(gig.total_received)}</Body>
        <Button secondary onPress={() => setSheet("payments")}>
          Edit payments
        </Button>
      </Card>
      <GigPortfolio id={gig.id} />
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
                    : sheet === "Paid advance"
                      ? "Record the advance"
                      : "Payment details"
          }
          onClose={() => setSheet(null)}
        >
          {sheet === "call" ? (
            <Body>{gig.call_script}</Body>
          ) : sheet === "pricing" ? (
            <Pricing gig={gig} />
          ) : sheet === "edit" ? (
            <GigEditor gig={gig} onClose={() => setSheet(null)} />
          ) : (
            <PaymentEditor
              gig={gig}
              status={sheet === "payments" ? undefined : sheet}
              onClose={() => setSheet(null)}
            />
          )}
        </Sheet>
      )}
    </Page>
  );
}
function Pricing({ gig }: { gig: Gig }) {
  return (
    <>
      <Text style={s.eyebrow}>THIS GIG</Text>
      <H2>
        {gig.price_min != null && gig.price_max != null
          ? `${money(gig.price_min)} – ${money(gig.price_max)}`
          : "Set the range after reviewing scope"}
      </H2>
      <H2>Price guides</H2>
      <Body>Basic site · about 5 pages: ₹8,000–15,000</Body>
      <Body>Landing page: ₹5,000–9,000</Body>
      <Body>Google Business Profile + website: ₹10,000–18,000</Body>
      <Body>Maintenance: ₹1,000–2,500/month</Body>
      <H2>Terms to share</H2>
      <Body>50% advance before building. Balance on delivery.</Body>
      <Body>2 revisions included; extra changes are paid.</Body>
      <Body>5–7 days for a basic site.</Body>
      <Body>Yearly domain and hosting renewal separate.</Body>
      <Body muted>
        Ask scope first. Give a range on the call, then the exact quote in
        writing.
      </Body>
    </>
  );
}
const editFields = [
  ["business_name", "Business name"],
  ["business_type", "Business type / niche"],
  ["city_area", "City / area"],
  ["contact_name", "Contact name"],
  ["contact_whatsapp", "WhatsApp number (include country code)"],
  ["contact_email", "Email"],
  ["source", "Source of lead"],
  ["demo_link", "Demo link"],
  ["price_min", "Price minimum (₹)"],
  ["price_max", "Price maximum (₹)"],
  ["problem_noticed", "Problem noticed"],
  ["why_it_fits", "Why it fits"],
  ["outreach_whatsapp", "WhatsApp message"],
  ["outreach_email", "Email message"],
  ["call_script", "Call script"],
] as const;
function GigEditor({ gig, onClose }: { gig: Gig; onClose: () => void }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      editFields.map(([key]) => [key, String(gig[key] ?? "")]),
    ),
  );
  const patch = usePatch(gig.id);
  function save() {
    const body: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(values))
      body[key] = key.startsWith("price_")
        ? value
          ? Number(value)
          : null
        : value ||
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
    patch.mutate(body as GigPatch, { onSuccess: onClose });
  }
  return (
    <>
      {editFields.map(([key, label], i) => (
        <Field
          key={key}
          label={label}
          value={values[key]}
          onChangeText={(value) => setValues((v) => ({ ...v, [key]: value }))}
          multiline={i >= 10}
          autoCapitalize={
            key === "contact_email" || key === "demo_link"
              ? "none"
              : "sentences"
          }
          keyboardType={
            key.startsWith("price_")
              ? "decimal-pad"
              : key === "contact_email"
                ? "email-address"
                : "default"
          }
        />
      ))}
      <ErrorNotice error={patch.error} />
      <Button disabled={patch.isPending} onPress={save}>
        Save changes
      </Button>
    </>
  );
}
export function PaymentEditor({
  gig,
  status,
  onClose,
}: {
  gig: Gig;
  status?: "Won" | "Paid advance";
  onClose: () => void;
}) {
  const [quote, setQuote] = useState(String(gig.quoted_price || ""));
  const [advance, setAdvance] = useState(
    String(gig.advance_amount ?? (Number(quote) / 2 || "")),
  );
  const [advanceDate, setAdvanceDate] = useState(
    gig.advance_paid_at || (status === "Paid advance" ? localDate() : ""),
  );
  const [balanceDate, setBalanceDate] = useState(gig.balance_paid_at || "");
  const patch = usePatch(gig.id);
  function save() {
    patch.mutate(
      {
        ...(status ? { status } : {}),
        quoted_price: quote ? Number(quote) : null,
        advance_amount: advance ? Number(advance) : null,
        ...(status !== "Won"
          ? {
              advance_paid_at: advanceDate || null,
              balance_paid_at: balanceDate || null,
            }
          : {}),
      },
      { onSuccess: onClose },
    );
  }
  return (
    <>
      <Body>
        {status === "Won"
          ? "Confirm the written quote. Collect the advance before building."
          : "Record payments received outside the app. Leave paid dates empty until you receive the money."}
      </Body>
      <Field
        label="Quoted price (₹)"
        value={quote}
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setQuote(value);
          if (!gig.advance_paid_at)
            setAdvance(String(Math.round(Number(value) * 50) / 100));
        }}
      />
      <Field
        label="Advance amount (₹) · defaults to 50%"
        value={advance}
        keyboardType="decimal-pad"
        onChangeText={setAdvance}
      />
      {status !== "Won" && (
        <DateField
          label="Advance paid date"
          value={advanceDate}
          onChange={setAdvanceDate}
          optional
          paid
        />
      )}
      <Body>
        Balance: {money(Math.max(0, Number(quote) - Number(advance)))}
      </Body>
      {!status && (
        <DateField
          label="Balance paid date"
          value={balanceDate}
          onChange={setBalanceDate}
          optional
          paid
        />
      )}
      <ErrorNotice error={patch.error} />
      <Button
        disabled={
          patch.isPending ||
          !Number(quote) ||
          !advance ||
          (status === "Paid advance" && !advanceDate)
        }
        onPress={save}
      >
        {status === "Won"
          ? "Confirm Won"
          : status === "Paid advance"
            ? "Save Paid advance"
            : "Save payment details"}
      </Button>
    </>
  );
}
