import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { ResumeDocument } from './build';

export interface LetterDocument {
  name: string;
  contact: string[];
  date: string;
  paragraphs: string[];
  paper: 'LETTER' | 'A4';
}

// Helvetica is a standard PDF font: always available, embedded-free and parsed by every ATS.
const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 54, fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.35, color: '#111' },
  name: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headline: { fontSize: 11, marginBottom: 4 },
  contact: { fontSize: 10, color: '#333', marginBottom: 10 },
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
  entryTitle: { fontFamily: 'Helvetica-Bold' },
  entryMeta: { color: '#333' },
  bullet: { flexDirection: 'row', marginTop: 1.5 },
  bulletGlyph: { width: 10 },
  bulletText: { flex: 1 },
  paragraph: { marginBottom: 10 },
});

function Resume({ doc }: { doc: ResumeDocument }) {
  return (
    <Document title={`${doc.name} – Resume`} author={doc.name} creator="WindSliter" producer="WindSliter">
      <Page size={doc.paper} style={styles.page}>
        <Text style={styles.name}>{doc.name}</Text>
        {doc.headline ? <Text style={styles.headline}>{doc.headline}</Text> : null}
        <Text style={styles.contact}>{doc.contact.join('  |  ')}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.kind === 'text' ? (
              <Text>{section.text}</Text>
            ) : (
              section.entries.map((e, i) => (
                <View key={i} style={styles.entry} wrap={false}>
                  <Text>
                    <Text style={styles.entryTitle}>{e.title}</Text>
                    {e.org ? <Text>{`, ${e.org}`}</Text> : null}
                  </Text>
                  {e.location || e.dates ? (
                    <Text style={styles.entryMeta}>{[e.location, e.dates].filter(Boolean).join('  |  ')}</Text>
                  ) : null}
                  {e.bullets.map((b, j) => (
                    <View key={j} style={styles.bullet}>
                      <Text style={styles.bulletGlyph}>•</Text>
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function Letter({ doc }: { doc: LetterDocument }) {
  return (
    <Document title={`${doc.name} – Cover Letter`} author={doc.name} creator="WindSliter" producer="WindSliter">
      <Page size={doc.paper} style={{ ...styles.page, fontSize: 11, lineHeight: 1.5 }}>
        <Text style={styles.name}>{doc.name}</Text>
        <Text style={styles.contact}>{doc.contact.join('  |  ')}</Text>
        <Text style={styles.paragraph}>{doc.date}</Text>
        {doc.paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function renderResumePdf(doc: ResumeDocument): Promise<Buffer> {
  return renderToBuffer(<Resume doc={doc} />);
}

export function renderLetterPdf(doc: LetterDocument): Promise<Buffer> {
  return renderToBuffer(<Letter doc={doc} />);
}
