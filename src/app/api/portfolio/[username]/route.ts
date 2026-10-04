import { NextResponse } from 'next/server';
import { handle, notFound } from '@/lib/api';
import { getPublicProfile, visibleSections } from '@/lib/profile';

type Ctx = { params: Promise<{ username: string }> };

/** Public, read-only portfolio data. Hidden sections and private profiles are never returned. */
export const GET = handle(async (_req, { params }: Ctx) => {
  const profile = await getPublicProfile((await params).username);
  if (!profile?.isPublic) throw notFound('Portfolio');
  const show = visibleSections(profile);
  return NextResponse.json({
    name: profile.user.name,
    username: profile.user.username,
    image: profile.user.image,
    headline: profile.headline,
    location: profile.location,
    website: profile.website,
    summary: show.about ? profile.summary : null,
    experience: show.experience
      ? profile.experiences.map(({ company, title, location, startMonth, endMonth, bullets }) => ({ company, title, location, startMonth, endMonth, bullets }))
      : [],
    education: show.education
      ? profile.educations.map(({ school, degree, field, startMonth, endMonth }) => ({ school, degree, field, startMonth, endMonth }))
      : [],
    skills: show.skills ? profile.skills.map((s) => s.name) : [],
    certifications: show.certifications
      ? profile.certifications.map(({ name, issuer, issuedMonth, url }) => ({ name, issuer, issuedMonth, url }))
      : [],
    projects: show.projects
      ? profile.projects.map(({ title, description, url, imageUrl, tags }) => ({ title, description, url, imageUrl, tags }))
      : [],
  });
});
