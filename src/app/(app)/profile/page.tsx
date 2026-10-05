import { requirePageUser } from '@/lib/session';
import { getFullProfile } from '@/lib/profile';
import { ProfileBasicsForm } from '@/components/profile/profile-basics-form';
import { RecordSection } from '@/components/profile/record-section';
import { ImportFlow } from '@/components/profile/import-flow';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requirePageUser();
  const p = await getFullProfile(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="muted">One profile powers your portfolio, resumes and cover letters. Changes save as you go.</p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Basics</h2>
        <ProfileBasicsForm
          initial={{ headline: p.headline, summary: p.summary, location: p.location, phone: p.phone, website: p.website }}
        />
      </section>

      <RecordSection type="experience" initial={p.experiences} />
      <RecordSection type="education" initial={p.educations} />
      <RecordSection type="skills" initial={p.skills} />
      <RecordSection type="certifications" initial={p.certifications} />
      <RecordSection type="projects" initial={p.projects} />

      <section id="import" className="card scroll-mt-24">
        <h2 className="mb-1 font-semibold">Import from LinkedIn</h2>
        <p className="muted mb-4 text-sm">
          Re-importing is safe: anything you edited here is kept, and nothing is saved until you confirm. Refresh the page after
          importing to see new records.
        </p>
        <ImportFlow />
      </section>
    </div>
  );
}
