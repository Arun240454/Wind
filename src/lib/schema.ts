import { z } from 'zod/v4';

/**
 * What Claude returns for one upload. The same shape goes back to the server when the user
 * downloads, so no copy is ever stored. Contact fields Claude can't find in the file are empty
 * strings or empty arrays (structured outputs can't express "optional", and blanks are easy to skip).
 */
export const resultSchema = z.object({
  candidate: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()),
  }),
  coverLetter: z.object({
    greeting: z.string(),
    paragraphs: z.array(z.string()),
    closing: z.string(),
  }),
});

export type GenerationResult = z.infer<typeof resultSchema>;

/** The optional details the user can add to tailor the letter. Empty means "not given". */
export const jobSchema = z.object({
  company: z.string().trim().max(200).default(''),
  hiringManager: z.string().trim().max(200).default(''),
  jobDescription: z.string().trim().max(15_000).default(''),
});

export type JobDetails = z.infer<typeof jobSchema>;

export const downloadSchema = z.object({
  format: z.enum(['pdf', 'docx']),
  result: resultSchema,
});
