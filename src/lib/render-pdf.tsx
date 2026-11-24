import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { contactLine, letterDate, type GenerationResult } from '@/lib/output';

// Helvetica is a standard PDF font: always available and needs no embedding.
const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 54, fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.4, color: '#111' },
  // An explicit line height: inheriting the page's relative one lets the next line overlap the name.
  name: { fontSize: 20, lineHeight: 1.2, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  headline: { fontSize: 11, marginBottom: 4 },
  contact: { fontSize: 9.5, color: '#333', marginBottom: 12 },
  heading: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: '#999',
  },
  entry: { marginBottom: 6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  meta: { color: '#444' },
  bullet: { flexDirection: 'row', marginTop: 1.5 },
  glyph: { width: 10 },
  bulletText: { flex: 1 },
  paragraph: { marginBottom: 10 },
});

function Bullets({ items }: { items: string[] }) {
  return items.map((b, i) => (
    <View key={i} style={styles.bullet}>
      <Text style={styles.glyph}>•</Text>
      <Text style={styles.bulletText}>{b}</Text>
    </View>
  ));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

function Summary({ r }: { r: GenerationResult }) {
  const { candidate: c, summary: s } = r;
  return (
    <Document title={`${c.name || 'Career'} – Summary`} author={c.name} creator="WindSliter" producer="WindSliter">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{c.name || 'Career Summary'}</Text>
        {c.headline ? <Text style={styles.headline}>{c.headline}</Text> : null}
        <Text style={styles.contact}>{contactLine(c)}</Text>

        <Section title="Overview">
          <Text>{s.overview}</Text>
          {s.experienceLevel ? <Text style={[styles.meta, { marginTop: 4 }]}>{s.experienceLevel}</Text> : null}
        </Section>
        {s.strengths.length ? (
          <Section title="Key strengths">
            <Bullets items={s.strengths} />
          </Section>
        ) : null}
        {s.keySkills.length ? (
          <Section title="Skills">
            <Text>{s.keySkills.join(', ')}</Text>
          </Section>
        ) : null}
        {s.experience.length ? (
          <Section title="Experience">
            {s.experience.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <Text>
                  <Text style={styles.bold}>{e.title}</Text>
                  {e.company ? <Text>{`, ${e.company}`}</Text> : null}
                </Text>
                {e.dates ? <Text style={styles.meta}>{e.dates}</Text> : null}
                <Bullets items={e.highlights} />
              </View>
            ))}
          </Section>
        ) : null}
        {s.education.length ? (
          <Section title="Education">
            {s.education.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <Text style={styles.bold}>{e.degree || e.school}</Text>
                <Text style={styles.meta}>{[e.degree ? e.school : '', e.dates].filter(Boolean).join('  |  ')}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        {s.certifications.length ? (
          <Section title="Certifications">
            <Bullets items={s.certifications} />
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}

function Letter({ r }: { r: GenerationResult }) {
  const { candidate: c, coverLetter: l } = r;
  return (
    <Document title={`${c.name || 'Cover'} – Cover Letter`} author={c.name} creator="WindSliter" producer="WindSliter">
      <Page size="A4" style={{ ...styles.page, fontSize: 11, lineHeight: 1.5 }}>
        {c.name ? <Text style={styles.name}>{c.name}</Text> : null}
        <Text style={styles.contact}>{contactLine(c)}</Text>
        <Text style={styles.paragraph}>{letterDate()}</Text>
        <Text style={styles.paragraph}>{l.greeting}</Text>
        {l.paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
        <Text>{l.closing}</Text>
        {c.name ? <Text>{c.name}</Text> : null}
      </Page>
    </Document>
  );
}

export function renderSummaryPdf(r: GenerationResult): Promise<Buffer> {
  return renderToBuffer(<Summary r={r} />);
}

export function renderLetterPdf(r: GenerationResult): Promise<Buffer> {
  return renderToBuffer(<Letter r={r} />);
}
