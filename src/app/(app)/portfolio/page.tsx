import { requirePageUser } from '@/lib/session';
import { getFullProfile, visibleSections } from '@/lib/profile';
import { PortfolioSettings } from '@/components/portfolio/portfolio-settings';

export const metadata = { title: 'Portfolio' };

export default async function PortfolioPage() {
  const user = await requirePageUser();
  const p = await getFullProfile(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="muted">Pick a theme, choose what to show and publish. The preview updates when you save.</p>
      </div>
      <PortfolioSettings
        username={user.username!}
        initial={{ theme: p.theme as 'classic' | 'modern', isPublic: p.isPublic, unlisted: p.unlisted, sectionVisibility: visibleSections(p) }}
      />
    </div>
  );
}
