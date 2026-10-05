import { paragraphsToDoc } from './fill';

export interface CoverLetterTemplate {
  key: string;
  name: string;
  description: string;
  paragraphs: string[];
}

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  {
    key: 'concise',
    name: 'Concise',
    description: 'Four short paragraphs. Works for most applications.',
    paragraphs: [
      'Dear {{hiringManager}},',
      "I'm applying for the {{role}} position at {{company}}. As {{recentRole}}, I've built a track record I believe maps directly to what your team needs.",
      'My strongest area is {{topSkill}}. In my current role I have used it to ship work that made a measurable difference for users and the business, and I would bring the same focus to {{company}}.',
      "I'd welcome the chance to talk about how I can contribute. Thank you for your time and consideration.",
      'Sincerely,',
      '{{name}}',
    ],
  },
  {
    key: 'story',
    name: 'Story',
    description: 'Opens with a short story about a result. Good for product and design roles.',
    paragraphs: [
      'Dear {{hiringManager}},',
      'The moment I knew I wanted to work on problems like the ones {{company}} solves was when [describe a specific moment or result in one or two sentences].',
      "That experience shaped how I work today as {{recentRole}}. I lean on {{topSkill}} to turn ambiguous problems into shipped results, and I'm excited by the chance to do that as your next {{role}}.",
      "What draws me to {{company}} specifically is [one concrete reason: a product, a value, a recent launch]. I'd love to bring that energy to the team.",
      'Thank you for reading. I look forward to the conversation.',
      'Best regards,',
      '{{name}}',
    ],
  },
  {
    key: 'career-switch',
    name: 'Career switch',
    description: 'Connects past experience to a new field. Good for career changers.',
    paragraphs: [
      'Dear {{hiringManager}},',
      "I'm writing to apply for the {{role}} role at {{company}}. My background is a little different from most applicants, and I think that's a strength.",
      'As {{recentRole}}, I developed skills that transfer directly: [skill one], [skill two] and {{topSkill}}. I have since [course, project or certification] to build depth in this field.',
      "I'm looking for a team where a fresh perspective is valued, and {{company}} stands out for [reason]. I'd be glad to show what I can do.",
      'Thank you for your consideration.',
      'Sincerely,',
      '{{name}}',
    ],
  },
];

export function templateDoc(key: string) {
  const t = COVER_LETTER_TEMPLATES.find((t) => t.key === key) ?? COVER_LETTER_TEMPLATES[0];
  return { template: t, doc: paragraphsToDoc(t.paragraphs) };
}
