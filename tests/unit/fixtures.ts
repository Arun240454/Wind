import type { GenerationResult } from '@/lib/schema';

export const sampleResult: GenerationResult = {
  candidate: {
    name: 'Jordan Lee',
    headline: 'Data Analyst | SQL, Python, Tableau',
    email: 'jordan@example.com',
    phone: '',
    location: 'Toronto, Canada',
    links: ['linkedin.com/in/jordanlee'],
  },
  summary: {
    overview: 'Jordan is a data analyst who turns messy data into decisions.',
    experienceLevel: '5+ years, mid-level',
    keySkills: ['SQL', 'Python', 'Tableau'],
    experience: [
      {
        title: 'Senior Data Analyst',
        company: 'Northwind Analytics',
        dates: 'Jan 2024 – Present',
        highlights: ['Built a churn dashboard used by 40 account managers'],
      },
    ],
    education: [{ school: 'University of Toronto', degree: 'BSc, Statistics', dates: '2016 – 2020' }],
    certifications: ['Google Data Analytics Certificate'],
    strengths: ['Clear communicator'],
  },
  coverLetter: {
    greeting: 'Dear Hiring Manager,',
    paragraphs: ['First paragraph about impact.', 'Second paragraph about fit.'],
    closing: 'Sincerely,',
  },
};
