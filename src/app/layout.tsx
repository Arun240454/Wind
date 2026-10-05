import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'WindSliter – LinkedIn portfolio and ATS resume', template: '%s · WindSliter' },
  description: 'Turn your LinkedIn profile into a portfolio site, an ATS-ready resume and a cover letter in minutes.',
  metadataBase: new URL(process.env.AUTH_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
