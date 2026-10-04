import JSZip from 'jszip';
import Papa from 'papaparse';
import { parseLinkedInDate } from '@/lib/dates';
import type {
  CertificationInput,
  EducationInput,
  ExperienceInput,
  ProjectInput,
  SkillInput,
} from '@/lib/validation/profile';

export const MAX_ZIP_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 200; // a full LinkedIn archive has ~40–120 files
export const MAX_CSV_BYTES = 5 * 1024 * 1024;

export interface ImportedProfile {
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: string;
}

export interface CanonicalImport {
  profile: ImportedProfile;
  experience: ExperienceInput[];
  education: EducationInput[];
  skills: SkillInput[];
  certifications: CertificationInput[];
  projects: ProjectInput[];
  /** Files we read, and CSVs we did not recognise (reported, never fatal). */
  filesRead: string[];
  unknownFiles: string[];
}

export class ImportError extends Error {}

type Row = Record<string, string>;

/** Lowercase, alphanumeric-only header key so "Started On" / "started_on" / "StartedOn" all match. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function field(row: Row, ...names: string[]): string {
  for (const name of names) {
    const v = row[norm(name)];
    if (v !== undefined && v !== null) return String(v).trim();
  }
  return '';
}

/**
 * Parses a LinkedIn CSV. Some export files start with a few "Notes:" lines before the
 * header, so we skip ahead to the first line that contains `expectedHeader`.
 */
export function parseCsv(text: string, expectedHeader: string): Row[] {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => norm(l).includes(norm(expectedHeader)));
  const body = headerIndex > 0 ? lines.slice(headerIndex).join('\n') : clean;

  const result = Papa.parse<Record<string, string>>(body, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: norm,
  });
  return result.data;
}

/** Splits a LinkedIn description into resume bullets. */
export function toBullets(description: string): string[] {
  return description
    .split(/\r?\n|(?:^|\s)[•▪◦]\s+/)
    .map((l) => l.replace(/^\s*[-*•▪◦–]\s*/, '').trim())
    .filter(Boolean);
}

const KNOWN_FILES = {
  'profile.csv': 'First Name',
  'positions.csv': 'Company Name',
  'education.csv': 'School Name',
  'skills.csv': 'Name',
  'certifications.csv': 'Name',
  'projects.csv': 'Title',
} as const;

type KnownFile = keyof typeof KNOWN_FILES;

/** Maps parsed CSV rows (keyed by file name) to the canonical profile. Pure — no I/O. */
export function mapExport(files: Partial<Record<KnownFile, Row[]>>): Omit<CanonicalImport, 'filesRead' | 'unknownFiles'> {
  const p = files['profile.csv']?.[0] ?? {};
  const profile: ImportedProfile = {
    firstName: field(p, 'First Name'),
    lastName: field(p, 'Last Name'),
    headline: field(p, 'Headline'),
    summary: field(p, 'Summary'),
    location: field(p, 'Geo Location', 'Location'),
  };

  const experience = (files['positions.csv'] ?? [])
    .map((r) => ({
      company: field(r, 'Company Name', 'Company'),
      title: field(r, 'Title'),
      location: field(r, 'Location'),
      startMonth: parseLinkedInDate(field(r, 'Started On', 'Start Date')),
      endMonth: parseLinkedInDate(field(r, 'Finished On', 'End Date')) || null,
      bullets: toBullets(field(r, 'Description')),
    }))
    .filter((e) => e.company && e.title);

  const education = (files['education.csv'] ?? [])
    .map((r) => ({
      school: field(r, 'School Name', 'School'),
      degree: field(r, 'Degree Name', 'Degree'),
      field: field(r, 'Field Of Study', 'Field'),
      startMonth: parseLinkedInDate(field(r, 'Start Date', 'Started On')),
      endMonth: parseLinkedInDate(field(r, 'End Date', 'Finished On')) || null,
      notes: field(r, 'Notes'),
    }))
    .filter((e) => e.school);

  const seenSkills = new Set<string>();
  const skills = (files['skills.csv'] ?? [])
    .map((r) => ({ name: field(r, 'Name', 'Skill'), category: '' }))
    .filter((s) => {
      const key = s.name.toLowerCase();
      if (!s.name || seenSkills.has(key)) return false;
      seenSkills.add(key);
      return true;
    });

  const certifications = (files['certifications.csv'] ?? [])
    .map((r) => {
      const url = field(r, 'Url', 'URL');
      return {
        name: field(r, 'Name'),
        issuer: field(r, 'Authority', 'Issuer'),
        issuedMonth: parseLinkedInDate(field(r, 'Started On', 'Issued On')),
        url: /^https?:\/\//i.test(url) ? url : '',
      };
    })
    .filter((c) => c.name);

  const projects = (files['projects.csv'] ?? [])
    .map((r) => {
      const url = field(r, 'Url', 'URL');
      return {
        title: field(r, 'Title'),
        description: field(r, 'Description'),
        url: /^https?:\/\//i.test(url) ? url : '',
        imageUrl: '',
        tags: [] as string[],
      };
    })
    .filter((p) => p.title);

  return { profile, experience, education, skills, certifications, projects };
}

/**
 * Reads a LinkedIn data export ZIP entirely in memory. Enforces size and entry limits so a
 * hostile archive (zip bomb) can't exhaust memory. Nothing is written to disk.
 */
export async function parseLinkedInExport(data: ArrayBuffer | Uint8Array): Promise<CanonicalImport> {
  if (data.byteLength > MAX_ZIP_BYTES) throw new ImportError('The file is larger than 10 MB.');

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new ImportError('That file is not a valid ZIP archive.');
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length === 0) throw new ImportError('The ZIP archive is empty.');
  if (entries.length > MAX_ZIP_ENTRIES) throw new ImportError(`The archive has more than ${MAX_ZIP_ENTRIES} files.`);

  const files: Partial<Record<KnownFile, Row[]>> = {};
  const filesRead: string[] = [];
  const unknownFiles: string[] = [];

  for (const entry of entries) {
    const base = entry.name.split('/').pop()!.toLowerCase();
    if (!base.endsWith('.csv')) continue;
    if (!(base in KNOWN_FILES)) {
      unknownFiles.push(entry.name.split('/').pop()!);
      continue;
    }
    // JSZip exposes the declared uncompressed size; refuse anything suspiciously large.
    const declared = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (declared > MAX_CSV_BYTES) throw new ImportError(`${base} is unexpectedly large.`);

    const text = await entry.async('string');
    if (text.length > MAX_CSV_BYTES) throw new ImportError(`${base} is unexpectedly large.`);

    const key = base as KnownFile;
    files[key] = parseCsv(text, KNOWN_FILES[key]);
    filesRead.push(entry.name.split('/').pop()!);
  }

  if (filesRead.length === 0) {
    throw new ImportError(
      'No LinkedIn profile files were found. Upload the ZIP that LinkedIn emails you from Settings → Data privacy → Get a copy of your data.'
    );
  }

  return { ...mapExport(files), filesRead, unknownFiles };
}
