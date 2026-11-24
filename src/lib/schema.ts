import { z } from 'zod/v4';

/**
 * What Claude returns for one upload. The same shape goes back to the server when the user
 * downloads, so no copy is ever stored. Fields Claude can't find in the file are empty strings
 * or empty arrays (structured outputs can't express "optional", and blanks are easy to skip).
 */
export const resultSchema = z.object({
  candidate: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()),
  }),
  summary: z.object({
    overview: z.string(),
    experienceLevel: z.string(),
    keySkills: z.array(z.string()),
    experience: z.array(
      z.object({
        title: z.string(),
        company: z.string(),
        dates: z.string(),
        highlights: z.array(z.string()),
      })
    ),
    education: z.array(z.object({ school: z.string(), degree: z.string(), dates: z.string() })),
    certifications: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  coverLetter: z.object({
    greeting: z.string(),
    paragraphs: z.array(z.string()),
    closing: z.string(),
  }),
});

export type GenerationResult = z.infer<typeof resultSchema>;

export const jobSchema = z.object({
  company: z.string().trim().max(200).default(''),
  role: z.string().trim().max(200).default(''),
  jobDescription: z.string().trim().max(15_000).default(''),
});

export type JobDetails = z.infer<typeof jobSchema>;

export const downloadSchema = z.object({
  kind: z.enum(['summary', 'cover-letter']),
  format: z.enum(['pdf', 'docx']),
  result: resultSchema,
});
