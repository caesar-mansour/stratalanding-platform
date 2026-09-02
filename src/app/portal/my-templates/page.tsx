import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Download, Package, Calendar, ShoppingBag } from 'lucide-react';
import { GradientText, NumberTicker, RevealGroup, RevealItem } from '../components/portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

// AUDIT 2026-08-12 (Phase 6): the map callback was `(p: any)`. Typed to the columns this view
// actually reads, rather than suppressing the rule.
interface TemplatePurchaseRow {
  id: string;
  template_id: string;
  plan: string;
  display_name: string | null;
  amount_cents: number;
  created_at: string;
  download_token: string | null;
  download_count: number;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- postgres row passthrough
  [key: string]: any;
}

export default async function PortalMyTemplatesPage() {
  const { user } = await getServerUser();
  if (!user) redirect('/login?redirectTo=/portal/my-templates');

  const purchases = await sql<TemplatePurchaseRow[]>`
    SELECT
      tp.id,
      tp.template_id,
      tp.plan,
      tp.amount_cents,
      tp.currency,
      tp.download_count,
      tp.created_at,
      tf.display_name
    FROM template_purchases tp
    LEFT JOIN template_files tf ON tf.template_id = tp.template_id AND tf.active = true
    WHERE tp.buyer_email = ${user.email}
    ORDER BY tp.created_at DESC
  `;

  if (purchases.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className={`${GLASS} p-12`}>
          <div className="grid w-16 h-16 place-items-center mx-auto mb-6 rounded-2xl bg-[#0891B2]/10 text-accent ring-1 ring-inset ring-[#22D3EE]/20">
            <ShoppingBag className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3"><GradientText>No templates yet</GradientText></h1>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            You haven&apos;t purchased any templates yet. Browse our collection to find the perfect starting point for your project.
          </p>
          <Link
            href="/demos"
            className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 hover:bg-cyan-700 hover:-translate-y-[2px] hover:shadow-[0_12px_30px_-10px_rgba(8,145,178,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Browse Templates
          </Link>
        </div>
      </div>
    );
  }

  const planLabels: Record<string, string> = {
    'presence-page': 'Presence Page',
    'lead-page': 'Lead Page',
    'purchase-page': 'Purchase Page',
  };

  const planColors: Record<string, string> = {
    'presence-page': 'bg-emerald-100 text-emerald-700',
    'lead-page': 'bg-cyan-100 text-cyan-700',
    'purchase-page': 'bg-[#0B1B3A]/10 text-[#0B1B3A]',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight"><GradientText>Your Templates</GradientText></h1>
        <p className="text-text-muted mt-1">
          <NumberTicker value={purchases.length} format="number" /> template{purchases.length !== 1 ? 's' : ''} purchased
        </p>
      </div>

      <RevealGroup className="grid gap-4">
        {purchases.map((p: TemplatePurchaseRow) => {
          const date = new Date(p.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const amount = (p.amount_cents / 100).toFixed(0);

          return (
            <RevealItem key={p.id}>
              <div className={`group ${GLASS} p-6 transition-all duration-200 hover:-translate-y-[3px] hover:border-[#22D3EE]/40 hover:shadow-[0_16px_44px_-12px_rgba(8,145,178,0.28)]`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="grid w-12 h-12 place-items-center shrink-0 rounded-xl border border-white/70 bg-gradient-to-br from-cyan-50 to-cyan-100">
                    <Package className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-text-primary text-lg">
                      {p.display_name || p.template_id}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ring-inset ring-white/50 ${planColors[p.plan] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {planLabels[p.plan] || p.plan}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {date}
                      </span>
                      <span className="text-xs text-text-muted inline-flex items-center">
                        <NumberTicker value={Number(amount)} format="currency" />{' '}
                        {p.currency?.toUpperCase()}
                      </span>
                      {p.download_count > 0 && (
                        <span className="text-xs text-text-muted inline-flex items-center gap-0.5">
                          Downloaded <NumberTicker value={p.download_count} format="number" />×
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/templates/download?purchaseId=${p.id}`}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors text-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </div>
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </div>
  );
}
