import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WindSliter – AI career summary and cover letter',
  description: 'Upload your LinkedIn profile or resume and get an AI-written career summary and cover letter to download.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
