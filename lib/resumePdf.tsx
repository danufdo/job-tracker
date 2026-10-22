import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";
import type { Resume } from "./resume";

Font.registerHyphenationCallback((w) => [w]); // never split words with hyphens

// Built-in PDF fonts (Times) need no font files and give a classic LaTeX-like look.
const st = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 34, paddingHorizontal: 42, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.25, color: "#111111" },
  head: { flexDirection: "row", alignItems: "center" },
  headText: { flex: 1 },
  headSpace: { width: 84 }, // = photo width + its left margin, so the text stays centred on the page
  photo: { width: 74, height: 74, marginLeft: 10, objectFit: "cover", borderRadius: 3 },
  name: { fontFamily: "Times-Bold", fontSize: 22, textAlign: "center", letterSpacing: 1 },
  title: { fontSize: 12, textAlign: "center", marginTop: 2 },
  contact: { fontSize: 10, textAlign: "center", marginTop: 4 },
  h: { fontFamily: "Times-Bold", fontSize: 11.5, letterSpacing: 1, marginTop: 12, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 0.7, borderBottomColor: "#111111" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Times-Bold" },
  ital: { fontFamily: "Times-Italic" },
  entry: { marginBottom: 7 },
  li: { flexDirection: "row", marginTop: 1.5, paddingLeft: 8 },
  dot: { width: 11 },
  liText: { flex: 1 },
  link: { color: "#0b3d91", textDecoration: "none" },
  refs: { flexDirection: "row", flexWrap: "wrap" },
  ref: { width: "50%", marginBottom: 6, paddingRight: 8 },
});

const range = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");
const mailto = (e: string) => `mailto:${e}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={st.h} minPresenceAhead={40}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function joined(parts: ReactNode[], sep = "  |  "): ReactNode[] {
  return parts.flatMap((p, i) => (i === 0 ? [p] : [sep, p]));
}

function ResumeDoc({ d, photo }: { d: Resume; photo?: Buffer }) {
  const line1: ReactNode[] = [d.phone, <Link key="e" src={mailto(d.email)} style={st.link}>{d.email}</Link>, ...(d.location ? [d.location] : [])];
  const line2: ReactNode[] = d.links.map((l, i) => <Link key={i} src={l.url} style={st.link}>{l.label || l.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</Link>);
  return (
    <Document title={`${d.name} – CV`} author={d.name}>
      <Page size="A4" style={st.page}>
        <View style={st.head}>
          {photo ? <View style={st.headSpace} /> : null}
          <View style={st.headText}>
            <Text style={photo && d.name.length > 21 ? [st.name, { fontSize: 18 }] : st.name}>{d.name.toUpperCase()}</Text>
            <Text style={st.title}>{d.title}</Text>
            <Text style={st.contact}>{joined(line1)}</Text>
            <Text style={st.contact}>{joined(line2)}</Text>
          </View>
          {photo ? <Image src={{ data: photo, format: "jpg" }} style={st.photo} /> : null}
        </View>

        <Section title="Professional Summary"><Text>{d.summary}</Text></Section>

        <Section title="Experience">
          {d.experience.map((j, i) => (
            <View key={i} style={st.entry}>
              <View wrap={false}>
                <View style={st.row}><Text style={st.bold}>{j.role}</Text><Text>{range(j.start, j.end)}</Text></View>
                <View style={st.row}><Text style={st.ital}>{j.company}</Text><Text style={st.ital}>{j.location}</Text></View>
              </View>
              {j.bullets.map((b, k) => (
                <View key={k} style={st.li} wrap={false}><Text style={st.dot}>•</Text><Text style={st.liText}>{b}</Text></View>
              ))}
            </View>
          ))}
        </Section>

        <Section title="Education">
          {d.education.map((e, i) => (
            <View key={i} style={st.entry} wrap={false}>
              <View style={st.row}><Text style={st.bold}>{e.degree}</Text><Text>{range(e.start, e.end)}</Text></View>
              <View style={st.row}><Text style={st.ital}>{e.school}</Text><Text style={st.ital}>{e.location}</Text></View>
              {e.details ? <Text style={{ marginTop: 1.5 }}>{e.details}</Text> : null}
            </View>
          ))}
        </Section>

        <Section title="Technical Skills">
          {d.skills.map((k, i) => (
            <Text key={i} style={{ marginBottom: 2 }}><Text style={st.bold}>{k.category}: </Text>{k.items}</Text>
          ))}
        </Section>

        {d.projects.length > 0 && (
          <Section title="Projects">
            {d.projects.map((p, i) => (
              <View key={i} style={st.entry} wrap={false}>
                <View style={st.row}>
                  <Text style={st.bold}>{p.name}</Text>
                  {p.url ? <Link src={p.url} style={st.link}>{p.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</Link> : <Text />}
                </View>
                {p.description ? <Text>{p.description}</Text> : null}
                {p.tech ? <Text><Text style={st.ital}>Tech: </Text>{p.tech}</Text> : null}
              </View>
            ))}
          </Section>
        )}

        {d.certifications.length > 0 && (
          <Section title="Certifications">
            {d.certifications.map((c, i) => (
              <View key={i} style={st.row} wrap={false}>
                <Text><Text style={st.bold}>{c.name}</Text>{c.issuer ? `, ${c.issuer}` : ""}</Text>
                <Text>{c.year}</Text>
              </View>
            ))}
          </Section>
        )}

        {d.references.length > 0 && (
          <Section title="References">
            <View style={st.refs}>
              {d.references.map((r, i) => (
                <View key={i} style={st.ref} wrap={false}>
                  <Text style={st.bold}>{r.name}</Text>
                  {r.title ? <Text>{r.title}</Text> : null}
                  {r.contact ? <Text>{r.contact}</Text> : null}
                </View>
              ))}
            </View>
          </Section>
        )}
      </Page>
    </Document>
  );
}

export async function renderResumePdf(data: Resume, photo?: Buffer): Promise<Buffer> {
  return renderToBuffer(ResumeDoc({ d: data, photo }) as ReactElement<DocumentProps>);
}
