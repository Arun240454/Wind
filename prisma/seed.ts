/**
 * Seeds a public demo account so reviewers can see /u/demo without signing in.
 * Safe to re-run: it replaces the demo user's data.
 */
import { PrismaClient } from '@prisma/client';
import { templateDoc } from '../src/lib/cover-letter/templates';

const db = new PrismaClient();

async function main() {
  await db.user.deleteMany({ where: { username: 'demo' } });

  const user = await db.user.create({
    data: {
      email: 'demo@windsliter.dev',
      emailVerified: new Date(),
      name: 'Alex Morgan',
      username: 'demo',
      profile: {
        create: {
          headline: 'Senior Frontend Engineer · React, TypeScript, Design Systems',
          summary:
            'Frontend engineer with 8 years of experience building fast, accessible web apps. I lead design-system work, mentor engineers and care about the details users notice: load time, keyboard support and clear copy.',
          location: 'Austin, Texas',
          website: 'https://example.com',
          theme: 'modern',
          isPublic: true,
          experiences: {
            create: [
              {
                company: 'Brightline Health',
                title: 'Senior Frontend Engineer',
                location: 'Remote',
                startMonth: '2022-03',
                endMonth: null,
                sortOrder: 0,
                bullets: [
                  'Led the migration of a 120-screen patient portal to Next.js, cutting median page load from 3.8 s to 1.2 s.',
                  'Built a shared React design system used by 6 product teams, reducing UI bugs reported by QA by 35%.',
                  'Mentored 4 engineers; two were promoted within a year.',
                ],
              },
              {
                company: 'Cartwheel Commerce',
                title: 'Frontend Engineer',
                location: 'Austin, Texas',
                startMonth: '2018-06',
                endMonth: '2022-02',
                sortOrder: 1,
                bullets: [
                  'Rebuilt checkout as a single-page flow, raising conversion by 9%.',
                  'Introduced automated accessibility testing in CI, reaching WCAG 2.1 AA across all customer pages.',
                ],
              },
              {
                company: 'Pixel & Co.',
                title: 'Junior Web Developer',
                location: 'Dallas, Texas',
                startMonth: '2016-07',
                endMonth: '2018-05',
                sortOrder: 2,
                bullets: ['Shipped 30+ marketing sites for small businesses using WordPress and vanilla JavaScript.'],
              },
            ],
          },
          educations: {
            create: [{ school: 'University of Texas at Austin', degree: 'B.S.', field: 'Computer Science', startMonth: '2012', endMonth: '2016' }],
          },
          skills: {
            create: ['React', 'TypeScript', 'Next.js', 'Accessibility', 'Design Systems', 'Node.js', 'GraphQL', 'Testing (Playwright, Vitest)'].map(
              (name, sortOrder) => ({ name, sortOrder })
            ),
          },
          certifications: {
            create: [{ name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', issuedMonth: '2023-05' }],
          },
          projects: {
            create: [
              {
                title: 'a11y-lint',
                description: 'Open-source ESLint plugin that catches 40+ accessibility issues in JSX. 1.2k GitHub stars.',
                url: 'https://github.com/',
                tags: ['TypeScript', 'ESLint', 'Open source'],
                sortOrder: 0,
              },
              {
                title: 'Budget Buddy',
                description: 'Offline-first personal finance PWA with sync, built to learn IndexedDB and service workers.',
                tags: ['React', 'PWA', 'IndexedDB'],
                sortOrder: 1,
              },
            ],
          },
        },
      },
      resumes: { create: [{ name: 'Frontend roles', selections: { sections: { projects: true } } }] },
    },
  });

  const { doc } = templateDoc('concise');
  await db.coverLetter.create({
    data: { userId: user.id, name: 'Acme – Concise', templateKey: 'concise', content: doc as object, fields: { company: 'Acme', role: 'Staff Frontend Engineer', hiringManager: '' } },
  });

  console.log('Seeded demo user → http://localhost:3000/u/demo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
