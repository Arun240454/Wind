import type Anthropic from '@anthropic-ai/sdk';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { ApiError } from '@/lib/api';

// Vercel rejects request bodies over 4.5 MB before they reach the app, so stay under that.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const MAX_ZIP_ENTRIES = 300;

/**
 * CSVs from LinkedIn's data export that describe the person's career. Everything else in the
 * archive (messages, connections, invitations, ad data…) is private and irrelevant, so it is
 * never read or sent to the model.
 */
const LINKEDIN_CSVS = [
  'profile',
  'profile summary',
  'positions',
  'education',
  'skills',
  'certifications',
  'projects',
  'languages',
  'honors',
  'courses',
  'publications',
  'volunteering',
  'recommendations_received',
  'email addresses',
  'phonenumbers',
];

type Block = Anthropic.Beta.BetaContentBlockParam;

const bad = (message: string) => new ApiError(400, 'UNSUPPORTED_FILE', message);

/**
 * Turns an uploaded file into content blocks for Claude. PDFs go in as-is (Claude reads them
 * natively, layout included), so a LinkedIn "Save to PDF" export or any PDF resume works
 * without a hand-written parser. Nothing is written to disk.
 */
export async function fileToContent(file: File): Promise<Block[]> {
  if (file.size === 0) throw bad('The file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw bad('The file is larger than 4 MB.');

  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (name.endsWith('.pdf') || isPdf(bytes)) {
    if (!isPdf(bytes)) throw bad('That file is not a readable PDF.');
    return [
      {
        type: 'document',
        title: file.name,
        source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') },
      },
    ];
  }

  if (name.endsWith('.docx')) {
    let text: string;
    try {
      text = (await mammoth.extractRawText({ buffer: bytes })).value;
    } catch {
      throw bad('That file is not a readable Word document.');
    }
    return [textDocument(file.name, text)];
  }

  if (name.endsWith('.zip')) return [textDocument(file.name, await linkedInExportText(bytes))];

  if (name.endsWith('.txt') || name.endsWith('.md')) return [textDocument(file.name, bytes.toString('utf8'))];

  throw bad('Upload a PDF, Word (.docx), text file, or the LinkedIn data export (.zip).');
}

function isPdf(bytes: Buffer) {
  return bytes.subarray(0, 5).toString('latin1') === '%PDF-';
}

function textDocument(title: string, text: string): Block {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length < 30) throw bad('No readable text was found in that file.');
  if (clean.length > MAX_TEXT_CHARS) throw bad('That file has too much text. Upload just your resume or profile.');
  return { type: 'document', title, source: { type: 'text', media_type: 'text/plain', data: clean } };
}

async function linkedInExportText(bytes: Buffer): Promise<string> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw bad('That file is not a readable ZIP archive.');
  }
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > MAX_ZIP_ENTRIES) throw bad('That ZIP has too many files to be a LinkedIn export.');

  const wanted = entries.filter((f) => {
    const base = f.name.split('/').pop()!.toLowerCase();
    return base.endsWith('.csv') && LINKEDIN_CSVS.includes(base.slice(0, -4));
  });
  if (wanted.length === 0) {
    throw bad('No profile files (Profile.csv, Positions.csv…) were found. Upload the ZIP from LinkedIn → Settings → Data privacy → Get a copy of your data.');
  }

  const parts: string[] = [];
  for (const f of wanted) {
    const text = (await f.async('string')).replace(/^﻿/, '').trim();
    if (text) parts.push(`=== ${f.name.split('/').pop()} ===\n${text}`);
  }
  return parts.join('\n\n');
}
