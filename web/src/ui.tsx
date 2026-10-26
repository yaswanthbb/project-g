import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, X, ArrowUpRight, LoaderCircle } from "lucide-react";
import { type Gig } from "@gigs/shared";
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="error">
      {error instanceof Error ? error.message : "Could not load — try again"}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <p>Loading your gigs…</p>
      <small>The first load may take a moment.</small>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">✓</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Pill({ gig }: { gig: Gig }) {
  return (
    <span
      className={`pill status-${gig.status.replaceAll(" ", "-").toLowerCase()}`}
    >
      {gig.skipped_at ? "Skipped · New" : gig.status}
    </span>
  );
}
export function Progress({ gig }: { gig: Gig }) {
  return (
    <div className="progress-wrap">
      <span>
        {gig.completed_steps} of {gig.total_steps} done
      </span>
      <progress
        aria-label="Checklist progress"
        value={gig.completed_steps}
        max={gig.total_steps || 1}
      />
    </div>
  );
}
export function LinkOut({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="link-out" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={16} />
    </a>
  );
}
export function CopyButton({
  text,
  disabled,
  label,
}: {
  text: string;
  disabled?: boolean;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError("");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy — select and copy the message manually");
    }
  }
  return (
    <>
      <button
        className="button small secondary"
        disabled={disabled || !text}
        onClick={copy}
        aria-label={label}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="sheet-title">
      <header>
        <h2 id="sheet-title">{title}</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X />
        </button>
      </header>
      <div className="sheet-content">{children}</div>
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
