import "./proposal.css";
// ROLLOUT 2026-08-12 (GATE 7): proposals are tokenized private pages — a proposal URL carries a
// client's scope, pricing and timeline. robots.txt already disallows /proposal and /proposal/*, but
// the root layout declares `robots: { index: true, follow: true }`, which this segment inherits
// without an explicit override. Covers /proposal/[id] and /proposal/[id]/success together.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
