import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';

/**
 * A profile PDF laid out like LinkedIn's "Save to PDF": a narrow sidebar and a main column,
 * with LinkedIn's font sizes (name 26, section headings 15.75, company 12, title 11.5, body 10.5).
 */
const gray = '#555';
const H = ({ children }: { children: string }) => <Text style={{ fontSize: 15.75, marginTop: 14, marginBottom: 6 }}>{children}</Text>;
const SideH = ({ children }: { children: string }) => <Text style={{ fontSize: 13, marginTop: 12, marginBottom: 4 }}>{children}</Text>;
const Body = ({ children, color }: { children: string; color?: string }) => <Text style={{ fontSize: 10.5, color }}>{children}</Text>;

function Profile() {
  return (
    <Document>
      <Page size="LETTER" style={{ flexDirection: 'row', padding: 36, fontFamily: 'Helvetica' }}>
        <View style={{ width: 150, marginRight: 30 }}>
          <SideH>Contact</SideH>
          <Body>jordan@example.com</Body>
          <Body>www.linkedin.com/in/jordanlee (LinkedIn)</Body>
          <SideH>Top Skills</SideH>
          <Body>SQL</Body>
          <Body>Python</Body>
          <Body>Tableau</Body>
          <SideH>Languages</SideH>
          <Body>English (Native or Bilingual)</Body>
          <SideH>Certifications</SideH>
          <Body>Google Data Analytics Certificate</Body>
          <Body>Tableau Desktop Specialist</Body>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26 }}>Jordan Lee</Text>
          <Text style={{ fontSize: 12, marginTop: 4 }}>Data Analyst | SQL, Python, Tableau | Turning data into decisions</Text>
          <Body color={gray}>Toronto, Ontario, Canada</Body>

          <H>Summary</H>
          <Body>
            Analyst who turns messy data into decisions. I build dashboards that teams actually use, and I like explaining numbers in plain words to
            people who don&apos;t live in spreadsheets.
          </Body>

          <H>Experience</H>
          <Text style={{ fontSize: 12 }}>Northwind Analytics</Text>
          <Body color={gray}>3 years 7 months</Body>
          <Text style={{ fontSize: 11.5, marginTop: 4 }}>Senior Data Analyst</Text>
          <Body color={gray}>January 2024 - Present (1 year 10 months)</Body>
          <Body color={gray}>Toronto, Ontario, Canada</Body>
          <Body>• Built a Tableau sales dashboard used weekly by 40 account managers.</Body>
          <Body>• Automated a monthly reporting process in Python, saving 12 hours a month for the finance team and cutting errors.</Body>
          <Text style={{ fontSize: 11.5, marginTop: 8 }}>Data Analyst</Text>
          <Body color={gray}>April 2022 - December 2023 (1 year 9 months)</Body>
          <Body color={gray}>Toronto, Ontario, Canada</Body>
          <Body>Partnered with finance to define 15 shared KPI definitions that are now used across the company in every quarterly business review.</Body>

          <Text style={{ fontSize: 12, marginTop: 10 }}>Maple Retail Group</Text>
          <Text style={{ fontSize: 11.5 }}>Junior Analyst</Text>
          <Body color={gray}>June 2020 - March 2022 (1 year 10 months)</Body>
          <Body color={gray}>Mississauga, Ontario, Canada</Body>
          <Body>Wrote SQL queries for store performance reports.</Body>

          <H>Education</H>
          <Text style={{ fontSize: 12 }}>University of Toronto</Text>
          <Body color={gray}>Bachelor of Science - BS, Statistics · (2016 - 2020)</Body>
        </View>
        <Text fixed style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: gray }}>
          Page 1 of 1
        </Text>
      </Page>
    </Document>
  );
}

export function buildFixturePdf(): Promise<Buffer> {
  return renderToBuffer(<Profile />);
}
