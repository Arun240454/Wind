import { z } from 'zod';
import { MONTH_PATTERN } from '@/lib/dates';

const text = (max: number) => z.string().trim().max(max);
const month = z.string().trim().regex(MONTH_PATTERN, 'Use YYYY-MM or YYYY');
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must start with http:// or https://');

export const experienceInput = z.object({
  company: text(200).min(1, 'Required'),
  title: text(200).min(1, 'Required'),
  location: text(200).default(''),
  startMonth: month.default(''),
  endMonth: month.nullable().default(null).transform((v) => (v === '' ? null : v)),
  bullets: z.array(text(1000)).max(30).default([]).transform((b) => b.filter(Boolean)),
});

export const educationInput = z.object({
  school: text(200).min(1, 'Required'),
  degree: text(200).default(''),
  field: text(200).default(''),
  startMonth: month.default(''),
  endMonth: month.nullable().default(null).transform((v) => (v === '' ? null : v)),
  notes: text(2000).default(''),
});

export const skillInput = z.object({
  name: text(100).min(1, 'Required'),
  category: text(100).default(''),
});

export const certificationInput = z.object({
  name: text(200).min(1, 'Required'),
  issuer: text(200).default(''),
  issuedMonth: month.default(''),
  url: optionalUrl.default(''),
});

export const projectInput = z.object({
  title: text(200).min(1, 'Required'),
  description: text(2000).default(''),
  url: optionalUrl.default(''),
  imageUrl: optionalUrl.default(''),
  tags: z.array(text(50)).max(20).default([]).transform((t) => t.filter(Boolean)),
});

export const SECTION_KEYS = ['about', 'experience', 'projects', 'skills', 'education', 'certifications'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const profileUpdate = z.object({
  headline: text(220).optional(),
  summary: text(4000).optional(),
  location: text(200).optional(),
  phone: text(50).optional(),
  website: optionalUrl.optional(),
  theme: z.enum(['classic', 'modern']).optional(),
  isPublic: z.boolean().optional(),
  unlisted: z.boolean().optional(),
  sectionVisibility: z.record(z.enum(SECTION_KEYS), z.boolean()).optional(),
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, '3–30 characters: letters, numbers and dashes')
  .refine((u) => !RESERVED_USERNAMES.has(u), 'That username is reserved');

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'app', 'dashboard', 'login', 'logout', 'settings', 'profile', 'portfolio', 'resumes',
  'cover-letters', 'onboarding', 'u', 'help', 'support', 'windsliter',
]);

export const RECORD_SCHEMAS = {
  experience: experienceInput,
  education: educationInput,
  skills: skillInput,
  certifications: certificationInput,
  projects: projectInput,
} as const;

export type RecordType = keyof typeof RECORD_SCHEMAS;
export const RECORD_TYPES = Object.keys(RECORD_SCHEMAS) as RecordType[];

export type ExperienceInput = z.infer<typeof experienceInput>;
export type EducationInput = z.infer<typeof educationInput>;
export type SkillInput = z.infer<typeof skillInput>;
export type CertificationInput = z.infer<typeof certificationInput>;
export type ProjectInput = z.infer<typeof projectInput>;
