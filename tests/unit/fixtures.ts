import type { GenerationResult } from '@/lib/schema';

export const sampleResult: GenerationResult = {
  candidate: {
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    phone: '',
    location: 'Toronto, Canada',
    links: ['linkedin.com/in/jordanlee'],
  },
  coverLetter: {
    greeting: 'Dear Priya Sharma,',
    paragraphs: ['First paragraph about impact.', 'Second paragraph about fit.'],
    closing: 'Sincerely,',
  },
};
