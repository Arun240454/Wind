import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
// Generated from tests/fixture-pdf.tsx by `npm run fixtures`.
const PROFILE_PDF = path.join(process.cwd(), 'tests', 'fixtures', 'linkedin-profile.pdf');

const LINK_FILE = path.join(process.cwd(), '.dev-mail', 'last-link.txt');

async function waitForLink(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const link = await readFile(LINK_FILE, 'utf8').catch(() => '');
    if (link) return link;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('No magic link was written');
}

test('sign in → import → publish → download resume', async ({ page }) => {
  const id = Date.now().toString(36);
  await rm(LINK_FILE, { force: true });

  // Sign in with an emailed magic link.
  await page.goto('/login');
  await page.getByLabel('Email').fill(`e2e-${id}@example.com`);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.goto(await waitForLink());

  // Onboarding: choose a URL, import the LinkedIn profile PDF, review, save.
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel('Your full name').fill('Jordan Lee');
  await page.getByLabel('Portfolio URL').fill(`jordan-${id}`);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByTestId('import-file').setInputFiles({ name: 'Profile.pdf', mimeType: 'application/pdf', buffer: await readFile(PROFILE_PDF) });
  await expect(page.getByRole('heading', { name: 'Review what will be saved' })).toBeVisible();
  await expect(page.getByText('Senior Data Analyst · Northwind Analytics')).toBeVisible();
  await page.getByRole('button', { name: /^Save \d+ items$/ }).click();
  await page.getByRole('button', { name: 'Go to dashboard' }).click();

  // Dashboard → publish the portfolio.
  await expect(page.getByRole('heading', { name: 'Hi, Jordan' })).toBeVisible();
  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'Publish portfolio' }).click();
  await expect(page.getByText('Published')).toBeVisible();

  const publicPage = await page.context().newPage();
  await publicPage.goto(`/u/jordan-${id}`);
  await expect(publicPage.getByRole('heading', { name: 'Jordan Lee', level: 1 })).toBeVisible();
  await expect(publicPage.getByText('Northwind Analytics').first()).toBeVisible();

  // Resume: create, preview, download both formats.
  await page.goto('/resumes');
  await page.getByRole('button', { name: '+ New resume' }).click();
  await expect(page.getByTestId('resume-preview')).toContainText('Jan 2024 – Present');

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-pdf').click()]);
  expect(pdf.suggestedFilename()).toBe('Jordan-Lee-Resume.pdf');
  const [docx] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-docx').click()]);
  expect(docx.suggestedFilename()).toBe('Jordan-Lee-Resume.docx');

  // Cover letter from a template, with merge fields filled from the profile.
  await page.goto('/cover-letters');
  await page.getByLabel('Company').fill('Shopify');
  await page.getByRole('button', { name: 'Create letter' }).click();
  await expect(page.getByTestId('letter-preview')).toContainText('Shopify');
  await expect(page.getByTestId('letter-preview')).toContainText('Senior Data Analyst at Northwind Analytics');
});
