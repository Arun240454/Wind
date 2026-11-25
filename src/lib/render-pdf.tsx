import { Document, Page, StyleSheet, Text, renderToBuffer } from '@react-pdf/renderer';
import { contactLine, letterDate, type GenerationResult } from '@/lib/output';

// Helvetica is a standard PDF font: always available and needs no embedding.
const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 54, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#111' },
  // An explicit line height: inheriting the page's relative one lets the next line overlap the name.
  name: { fontSize: 20, lineHeight: 1.2, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  contact: { fontSize: 9.5, color: '#333', marginBottom: 12 },
  paragraph: { marginBottom: 10 },
});

function Letter({ r }: { r: GenerationResult }) {
  const { candidate: c, coverLetter: l } = r;
  const contact = contactLine(c);
  return (
    <Document title={`${c.name || 'Cover'} – Cover Letter`} author={c.name} creator="WindSliter" producer="WindSliter">
      <Page size="A4" style={styles.page}>
        {c.name ? <Text style={styles.name}>{c.name}</Text> : null}
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}
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

export function renderLetterPdf(r: GenerationResult): Promise<Buffer> {
  return renderToBuffer(<Letter r={r} />);
}
