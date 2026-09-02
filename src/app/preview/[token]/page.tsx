import sql from '@/lib/db';
import { notFound } from 'next/navigation';
import { hashToken } from '@/lib/auth/tokens';
import PreviewView, { type Comparison } from './PreviewView';
import previewShots from '@/data/preview-shots.json';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: 'Your preview · StrataLanding',
  robots: { index: false, follow: false },
};

// COST (Neon): preview tokens are 32 random bytes hex-encoded (see generateToken), so anything of a
// different shape cannot match a row. These URLs were mailed to hundreds of practices and get
// re-fetched around the clock by email security scanners (Proofpoint, Mimecast, Barracuda) and link
// crawlers — every junk hit used to be a database wake-up. Reject on shape first, for free.
const TOKEN_RE = /^[0-9a-f]{64}$/i;

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;

  if (!TOKEN_RE.test(token)) notFound();

  const tokenHash = hashToken(token);
  const [link] = await sql`
    SELECT id, practice_name, slug, preview_url, status, contact_email, expires_at, comparison
    FROM preview_links WHERE token_hash = ${tokenHash} LIMIT 1
  `;

  if (!link) notFound();

  const expired = new Date(link.expires_at) < new Date();
  // Shots manifest is rewritten from files-on-disk by scripts/preview-shots.cjs —
  // a slug is only listed when both -m and -d webp files exist in public/preview-shots/.
  const hasShot = Boolean((previewShots as Record<string, boolean>)[link.slug as string]);

  return (
    <PreviewView
      token={token}
      vid={link.id as string}
      practiceName={link.practice_name as string}
      slug={link.slug as string}
      previewUrl={link.preview_url as string}
      status={link.status as string}
      contactEmail={(link.contact_email as string) || ''}
      expired={expired}
      expiresAt={link.expires_at ? new Date(link.expires_at).toISOString() : null}
      hasShot={hasShot}
      comparison={(link.comparison as Comparison) ?? null}
    />
  );
}
