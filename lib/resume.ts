export type ResumeLink = { label: string; url: string };
export type Job = { role: string; company: string; location: string; start: string; end: string; bullets: string[] };
export type Edu = { degree: string; school: string; location: string; start: string; end: string; details: string };
export type SkillGroup = { category: string; items: string };
export type Project = { name: string; url: string; description: string; tech: string };
export type Cert = { name: string; issuer: string; year: string };
export type Ref = { name: string; title: string; contact: string };
export type Resume = {
  name: string; title: string; phone: string; email: string; location: string; summary: string;
  links: ResumeLink[]; experience: Job[]; education: Edu[]; skills: SkillGroup[];
  projects: Project[]; certifications: Cert[]; references: Ref[];
};

export const blank = {
  link: (): ResumeLink => ({ label: "", url: "" }),
  job: (): Job => ({ role: "", company: "", location: "", start: "", end: "", bullets: [""] }),
  edu: (): Edu => ({ degree: "", school: "", location: "", start: "", end: "", details: "" }),
  skill: (): SkillGroup => ({ category: "", items: "" }),
  project: (): Project => ({ name: "", url: "", description: "", tech: "" }),
  cert: (): Cert => ({ name: "", issuer: "", year: "" }),
  ref: (): Ref => ({ name: "", title: "", contact: "" }),
};

export const emptyResume = (): Resume => ({
  name: "", title: "", phone: "", email: "", location: "", summary: "",
  links: [blank.link()], experience: [blank.job()], education: [blank.edu()], skills: [blank.skill()],
  projects: [], certifications: [], references: [],
});

const s = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "";
const list = (v: unknown, max: number): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.slice(0, max) : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
const some = (o: Record<string, string | string[]>) => Object.values(o).some((x) => (Array.isArray(x) ? x.length > 0 : x !== ""));
const isUrl = (u: string) => /^https?:\/\/\S+$/i.test(u);

// Cleans whatever the browser sent into a Resume. With strict=false (saving a draft) it only trims and caps lengths;
// with strict=true (generating the PDF) it also enforces every required field.
export function sanitize(raw: unknown, strict: boolean): { data: Resume } | { error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d: Resume = {
    name: s(r.name, 100), title: s(r.title, 120), phone: s(r.phone, 40), email: s(r.email, 200),
    location: s(r.location, 120), summary: s(r.summary, 1500),
    links: list(r.links, 8).map((x) => ({ label: s(x.label, 40), url: s(x.url, 300) })).filter(some),
    experience: list(r.experience, 15).map((x) => ({
      role: s(x.role, 150), company: s(x.company, 150), location: s(x.location, 120), start: s(x.start, 30), end: s(x.end, 30),
      bullets: (Array.isArray(x.bullets) ? x.bullets.slice(0, 12) : []).map((b) => s(b, 400)).filter(Boolean),
    })).filter(some),
    education: list(r.education, 8).map((x) => ({
      degree: s(x.degree, 150), school: s(x.school, 150), location: s(x.location, 120), start: s(x.start, 30), end: s(x.end, 30), details: s(x.details, 400),
    })).filter(some),
    skills: list(r.skills, 12).map((x) => ({ category: s(x.category, 60), items: s(x.items, 400) })).filter(some),
    projects: list(r.projects, 8).map((x) => ({ name: s(x.name, 120), url: s(x.url, 300), description: s(x.description, 500), tech: s(x.tech, 200) })).filter(some),
    certifications: list(r.certifications, 12).map((x) => ({ name: s(x.name, 150), issuer: s(x.issuer, 120), year: s(x.year, 20) })).filter(some),
    references: list(r.references, 4).map((x) => ({ name: s(x.name, 100), title: s(x.title, 150), contact: s(x.contact, 200) })).filter(some),
  };
  if (!strict) return { data: d };

  const missing: string[] = [];
  (["name", "title", "phone", "email", "summary"] as const).forEach((k) => { if (!d[k]) missing.push(k); });
  if (missing.length) return { error: `Please fill in: ${missing.join(", ")}.` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return { error: "That email address doesn’t look valid." };
  if (!d.links.length) return { error: "Add at least one link (LinkedIn, GitHub or portfolio)." };
  if (d.links.some((l) => !isUrl(l.url))) return { error: "Every link must be a full URL starting with http:// or https://." };
  if (!d.experience.length || d.experience.some((j) => !j.role || !j.company)) return { error: "Add at least one experience, and give each a role and company." };
  if (!d.education.length || d.education.some((e) => !e.degree || !e.school)) return { error: "Add at least one education entry, with a degree and school." };
  if (!d.skills.length || d.skills.some((k) => !k.category || !k.items)) return { error: "Add at least one technical skills group, with a category and its skills." };
  if (d.projects.some((p) => !p.name || (p.url && !isUrl(p.url)))) return { error: "Each project needs a name, and its URL (if any) must start with http:// or https://." };
  if (d.certifications.some((c) => !c.name)) return { error: "Each certification needs a name." };
  if (d.references.some((x) => !x.name)) return { error: "Each reference needs a name." };

  // The PDF uses built-in fonts, which cover Latin text only. Say so rather than printing blanks.
  const bad = JSON.stringify(d).match(/[^\u0000-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]/u);
  if (bad) return { error: `The character “${bad[0]}” can’t be printed in the PDF yet. Please use Latin characters only.` };
  return { data: d };
}

// Used when loading a saved draft into the form: makes sure the required lists show at least one empty entry.
export function prepare(raw: unknown): Resume {
  const res = sanitize(raw, false);
  const d = "data" in res ? res.data : emptyResume();
  if (!d.links.length) d.links = [blank.link()];
  if (!d.experience.length) d.experience = [blank.job()];
  else d.experience = d.experience.map((j) => ({ ...j, bullets: j.bullets.length ? j.bullets : [""] }));
  if (!d.education.length) d.education = [blank.edu()];
  if (!d.skills.length) d.skills = [blank.skill()];
  return d;
}
