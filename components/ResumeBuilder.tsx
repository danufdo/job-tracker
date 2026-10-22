"use client";
import { useEffect, useState } from "react";
import { generateResume, saveResumeDraft } from "@/app/(app)/resume/actions";
import { blank, type Resume } from "@/lib/resume";
import { useBusy } from "./Busy";

const field = "w-full min-w-0 rounded border border-line bg-white px-3 py-2";
const btn = "inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate-700";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 text-sm text-slate-700 ${className}`}><span>{label}</span>{children}</label>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded border border-line bg-white p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {hint && <p className="mb-3 text-sm text-slate-600">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

// A repeatable list of cards with add / remove.
function Group<T>({ items, onChange, make, min = 0, addLabel, render }: {
  items: T[]; onChange: (next: T[]) => void; make: () => T; min?: number; addLabel: string;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded border border-line bg-slate-50 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">{render(it, (p) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x))))}</div>
          {items.length > min && (
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="mt-2 text-sm text-rose-700 underline">Remove</button>
          )}
        </div>
      ))}
      <div><button type="button" onClick={() => onChange([...items, make()])} className="text-sm text-accent underline">+ {addLabel}</button></div>
    </div>
  );
}

export default function ResumeBuilder({ initial, hasFile, generatedAt }: { initial: Resume; hasFile: boolean; generatedAt: string | null }) {
  const { withBusy, fail } = useBusy();
  const [d, setD] = useState<Resume>(initial);
  const [file, setFile] = useState(hasFile);
  const [when, setWhen] = useState<string | null>(generatedAt);
  const [whenText, setWhenText] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { setWhenText(when ? new Date(when).toLocaleString() : ""); }, [when]); // client-side, so server and browser HTML match

  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => setD((p) => ({ ...p, [k]: v }));
  const text = (k: "name" | "title" | "phone" | "email" | "location") => ({ value: d[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value) });

  function saveDraft() {
    setNote(""); setErr("");
    void withBusy("Saving draft…", async () => {
      const r = await saveResumeDraft(d);
      if (r.error) setErr(r.error); else setNote("Draft saved.");
    });
  }
  function generate(e: React.FormEvent) {
    e.preventDefault();
    setNote(""); setErr("");
    void withBusy("Generating CV…", async () => {
      const r = await generateResume(d);
      if (r.error) { setErr(r.error); return; }
      setFile(true); setWhen(r.generatedAt ?? null); setNote("Your CV is ready. Use Download PDF to save it.");
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Resume Builder</h1>
          {whenText && <p className="mt-1 text-sm text-slate-600">Last generated {whenText}</p>}
        </div>
        {file && <a href="/api/resume" className={btn}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></svg>
          Download PDF</a>}
      </header>

      {fail && <p role="alert" className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{fail}</p>}

      <form onSubmit={generate}>
        <Section title="Basic details">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <Field label="Full name" className="sm:col-span-3"><input required maxLength={100} className={field} {...text("name")} /></Field>
            <Field label="Professional title" className="sm:col-span-3"><input required maxLength={120} placeholder="e.g. Software Engineer" className={field} {...text("title")} /></Field>
            <Field label="Phone" className="sm:col-span-2"><input required type="tel" maxLength={40} className={field} {...text("phone")} /></Field>
            <Field label="Email" className="sm:col-span-2"><input required type="email" maxLength={200} className={field} {...text("email")} /></Field>
            <Field label="Location (optional)" className="sm:col-span-2"><input maxLength={120} placeholder="City, Country" className={field} {...text("location")} /></Field>
          </div>
        </Section>

        <Section title="Links" hint="LinkedIn, GitHub, portfolio. Full URLs, at least one.">
          <Group items={d.links} onChange={(v) => set("links", v)} make={blank.link} min={1} addLabel="Add link" render={(l, up) => (<>
            <Field label="Label" className="sm:col-span-2"><input maxLength={40} value={l.label} onChange={(e) => up({ label: e.target.value })} placeholder="LinkedIn" className={field} /></Field>
            <Field label="URL" className="sm:col-span-4"><input required type="url" maxLength={300} value={l.url} onChange={(e) => up({ url: e.target.value })} placeholder="https://…" className={field} /></Field>
          </>)} />
        </Section>

        <Section title="Professional summary">
          <textarea required rows={4} maxLength={1500} value={d.summary} onChange={(e) => set("summary", e.target.value)} aria-label="Professional summary" className={field} />
        </Section>

        <Section title="Experience">
          <Group items={d.experience} onChange={(v) => set("experience", v)} make={blank.job} min={1} addLabel="Add experience" render={(j, up) => (<>
            <Field label="Role" className="sm:col-span-3"><input required maxLength={150} value={j.role} onChange={(e) => up({ role: e.target.value })} className={field} /></Field>
            <Field label="Company" className="sm:col-span-3"><input required maxLength={150} value={j.company} onChange={(e) => up({ company: e.target.value })} className={field} /></Field>
            <Field label="Location" className="sm:col-span-2"><input maxLength={120} value={j.location} onChange={(e) => up({ location: e.target.value })} className={field} /></Field>
            <Field label="Start" className="sm:col-span-2"><input maxLength={30} value={j.start} onChange={(e) => up({ start: e.target.value })} placeholder="Jan 2022" className={field} /></Field>
            <Field label="End" className="sm:col-span-2"><input maxLength={30} value={j.end} onChange={(e) => up({ end: e.target.value })} placeholder="Present" className={field} /></Field>
            <Field label="Achievements (one bullet point per line)" className="sm:col-span-6">
              <textarea rows={4} value={j.bullets.join("\n")} onChange={(e) => up({ bullets: e.target.value.split("\n") })} className={field} />
            </Field>
          </>)} />
        </Section>

        <Section title="Education">
          <Group items={d.education} onChange={(v) => set("education", v)} make={blank.edu} min={1} addLabel="Add education" render={(x, up) => (<>
            <Field label="Degree / qualification" className="sm:col-span-3"><input required maxLength={150} value={x.degree} onChange={(e) => up({ degree: e.target.value })} className={field} /></Field>
            <Field label="School" className="sm:col-span-3"><input required maxLength={150} value={x.school} onChange={(e) => up({ school: e.target.value })} className={field} /></Field>
            <Field label="Location" className="sm:col-span-2"><input maxLength={120} value={x.location} onChange={(e) => up({ location: e.target.value })} className={field} /></Field>
            <Field label="Start" className="sm:col-span-2"><input maxLength={30} value={x.start} onChange={(e) => up({ start: e.target.value })} className={field} /></Field>
            <Field label="End" className="sm:col-span-2"><input maxLength={30} value={x.end} onChange={(e) => up({ end: e.target.value })} className={field} /></Field>
            <Field label="Details (optional)" className="sm:col-span-6"><input maxLength={400} value={x.details} onChange={(e) => up({ details: e.target.value })} placeholder="GPA, honours, relevant modules…" className={field} /></Field>
          </>)} />
        </Section>

        <Section title="Technical skills" hint="Group skills by category, separated by commas.">
          <Group items={d.skills} onChange={(v) => set("skills", v)} make={blank.skill} min={1} addLabel="Add skill group" render={(k, up) => (<>
            <Field label="Category" className="sm:col-span-2"><input required maxLength={60} value={k.category} onChange={(e) => up({ category: e.target.value })} placeholder="Languages" className={field} /></Field>
            <Field label="Skills" className="sm:col-span-4"><input required maxLength={400} value={k.items} onChange={(e) => up({ items: e.target.value })} placeholder="TypeScript, Python, SQL" className={field} /></Field>
          </>)} />
        </Section>

        <h2 className="mb-3 mt-8 font-display text-xl font-bold">Optional sections</h2>

        <Section title="Certifications">
          <Group items={d.certifications} onChange={(v) => set("certifications", v)} make={blank.cert} addLabel="Add certification" render={(c, up) => (<>
            <Field label="Name" className="sm:col-span-3"><input required maxLength={150} value={c.name} onChange={(e) => up({ name: e.target.value })} className={field} /></Field>
            <Field label="Issuer" className="sm:col-span-2"><input maxLength={120} value={c.issuer} onChange={(e) => up({ issuer: e.target.value })} className={field} /></Field>
            <Field label="Year" className="sm:col-span-1"><input maxLength={20} value={c.year} onChange={(e) => up({ year: e.target.value })} className={field} /></Field>
          </>)} />
        </Section>

        <Section title="Projects">
          <Group items={d.projects} onChange={(v) => set("projects", v)} make={blank.project} addLabel="Add project" render={(p, up) => (<>
            <Field label="Name" className="sm:col-span-3"><input required maxLength={120} value={p.name} onChange={(e) => up({ name: e.target.value })} className={field} /></Field>
            <Field label="URL" className="sm:col-span-3"><input type="url" maxLength={300} value={p.url} onChange={(e) => up({ url: e.target.value })} placeholder="https://…" className={field} /></Field>
            <Field label="Description" className="sm:col-span-6"><input maxLength={500} value={p.description} onChange={(e) => up({ description: e.target.value })} className={field} /></Field>
            <Field label="Tech used" className="sm:col-span-6"><input maxLength={200} value={p.tech} onChange={(e) => up({ tech: e.target.value })} className={field} /></Field>
          </>)} />
        </Section>

        <Section title="References" hint="Up to four.">
          <Group items={d.references} onChange={(v) => set("references", v.slice(0, 4))} make={blank.ref} addLabel="Add reference" render={(r, up) => (<>
            <Field label="Name" className="sm:col-span-2"><input required maxLength={100} value={r.name} onChange={(e) => up({ name: e.target.value })} className={field} /></Field>
            <Field label="Title & company" className="sm:col-span-2"><input maxLength={150} value={r.title} onChange={(e) => up({ title: e.target.value })} className={field} /></Field>
            <Field label="Email or phone" className="sm:col-span-2"><input maxLength={200} value={r.contact} onChange={(e) => up({ contact: e.target.value })} className={field} /></Field>
          </>)} />
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded bg-accent px-4 py-2 font-medium text-white">Generate CV</button>
          <button type="button" onClick={saveDraft} className="rounded border border-line bg-white px-4 py-2 font-medium hover:bg-slate-50">Save draft</button>
          {file && <a href="/api/resume" className="text-accent underline">Download PDF</a>}
          {note && <p role="status" className="text-sm text-emerald-800">{note}</p>}
          {err && <p role="alert" className="text-sm text-rose-700">{err}</p>}
        </div>
      </form>
    </main>
  );
}
