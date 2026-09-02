'use client';

import { PortalButton } from '@/app/portal/components/portal-ui';

interface PaymentButtonProps {
  projectId: string;
  paymentType: 'deposit' | 'final';
  amount: string;
}

export default function PaymentButton({ projectId, paymentType, amount }: PaymentButtonProps) {
  const label = paymentType === 'deposit' ? 'Pay Deposit' : 'Pay Final Balance';

  return (
    <PortalButton
      as="a"
      href={`/portal/payment/checkout?projectId=${projectId}&type=${paymentType}`}
      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[#0B1B3A] via-[#0891B2] to-[#22D3EE] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_-10px_rgba(8,145,178,0.5)] transition-shadow duration-200 hover:shadow-[0_18px_40px_-10px_rgba(8,145,178,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2"
    >
      {label} ({amount})
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </PortalButton>
  );
}
