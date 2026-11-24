"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addLeadActivityAction, updateLeadAction } from "@/app/admin/actions";
import { inputClass } from "@/components/admin/editor/field";
import { formatAdminDate } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

type Values = { stage_id: string; assigned_to: string; priority: string; next_follow_up_at: string; lost_reason: string };
type Activity = { id: string; type: string; body: string | null; metadata: Record<string, string | null>; actor: string | null; created_at: string };

const toLocal = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const typeLabel: Record<string, string> = {
  note: "Note",
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  stage_change: "Stage changed",
  assignment: "Assigned",
  system: "System",
};

export function LeadWorkPanel({
  leadId,
  canUpdate,
  canAssignOthers,
  me,
  stages,
  staff,
  initial,
  activities,
  stageNames,
  staffNames,
}: {
  leadId: string;
  canUpdate: boolean;
  canAssignOthers: boolean;
  me: string;
  stages: { id: string; name: string; kind: string }[];
  staff: { id: string; name: string }[];
  initial: Values;
  activities: Activity[];
  stageNames: Record<string, string>;
  staffNames: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [note, setNote] = useState({ type: "call", body: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof Values, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const stageKind = stages.find((s) => s.id === values.stage_id)?.kind;
  const assignable = canAssignOthers ? staff : staff.filter((s) => s.id === me);

  const save = () =>
    start(async () => {
      const r = await updateLeadAction(leadId, values);
      setMsg(r.ok ? { ok: true, text: "Lead updated." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  const addNote = () =>
    start(async () => {
      const r = await addLeadActivityAction(leadId, note);
      if (r.ok) {
        setNote({ ...note, body: "" });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });

  const describe = (a: Activity) => {
    if (a.type === "stage_change") return `${stageNames[a.metadata.from ?? ""] ?? "—"} → ${stageNames[a.metadata.to ?? ""] ?? "—"}`;
    if (a.type === "assignment") return a.metadata.to ? `to ${staffNames[a.metadata.to] ?? "someone"}` : "Unassigned";
    return a.body;
  };

  return (
    <>
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-semibold">Work this lead</h2>
        <fieldset disabled={!canUpdate || pending} className="mt-4 space-y-4">
          <label className="block text-body-sm font-medium">
            Stage
            <select value={values.stage_id} onChange={(e) => set("stage_id", e.target.value)} className={cn(inputClass, "mt-1.5")}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {stageKind === "lost" && (
            <label className="block text-body-sm font-medium">
              Why was it lost?
              <input value={values.lost_reason} onChange={(e) => set("lost_reason", e.target.value)} placeholder="Price, dates, booked elsewhere…" className={cn(inputClass, "mt-1.5")} />
            </label>
          )}
          <label className="block text-body-sm font-medium">
            Assigned to
            <select value={values.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className={cn(inputClass, "mt-1.5")}>
              <option value="">Unassigned</option>
              {assignable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === me ? `${s.name} (me)` : s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-body-sm font-medium">
              Priority
              <select value={values.priority} onChange={(e) => set("priority", e.target.value)} className={cn(inputClass, "mt-1.5")}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-body-sm font-medium">
              Follow up
              <input
                type="datetime-local"
                value={toLocal(values.next_follow_up_at)}
                onChange={(e) => set("next_follow_up_at", e.target.value ? new Date(e.target.value).toISOString() : "")}
                className={cn(inputClass, "mt-1.5")}
              />
            </label>
          </div>
          {msg && <p className={cn("rounded-lg px-3 py-2 text-body-sm", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{msg.text}</p>}
          <button type="button" onClick={save} className="w-full rounded-xl bg-ink py-2.5 text-body-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Saving…" : "Update lead"}
          </button>
        </fieldset>
        {!canUpdate && <p className="mt-3 text-caption text-muted">This lead belongs to someone else.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-semibold">Timeline</h2>
        {canUpdate && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-1.5">
              {["call", "whatsapp", "email", "meeting", "note"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNote({ ...note, type: t })}
                  className={cn("rounded-lg px-2.5 py-1 text-caption font-medium", note.type === t ? "bg-ink text-white" : "bg-[#f1efe9] text-muted")}
                >
                  {typeLabel[t]}
                </button>
              ))}
            </div>
            <textarea
              value={note.body}
              onChange={(e) => setNote({ ...note, body: e.target.value })}
              rows={3}
              placeholder="What happened? e.g. Called, wants Dec dates, sending quote tomorrow"
              className={cn(inputClass, "py-2")}
            />
            <button type="button" onClick={addNote} disabled={pending || !note.body.trim()} className="rounded-xl border border-line-strong px-3 py-1.5 text-body-sm font-medium disabled:opacity-40">
              Add to timeline
            </button>
          </div>
        )}
        <ol className="mt-5 space-y-4 border-l border-line pl-4">
          {activities.length === 0 && <li className="text-body-sm text-muted">No activity yet.</li>}
          {activities.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-brand-navy" />
              <p className="text-caption text-muted">
                <span className="font-semibold text-ink">{typeLabel[a.type] ?? a.type}</span> · {a.actor ?? "System"} · {formatAdminDate(a.created_at, true)}
              </p>
              {describe(a) && <p className="mt-0.5 whitespace-pre-wrap text-body-sm">{describe(a)}</p>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
