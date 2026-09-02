'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevealGroup, RevealItem, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

interface BannedEmail {
  id: string;
  email: string;
  reason: string | null;
  created_at: string;
}

export default function BannedEmailsList({ emails }: { emails: BannedEmail[] }) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnban = async (email: string) => {
    setIsUpdating(email);
    setError(null);

    try {
      const response = await fetch(`/api/admin/banned-emails?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unban email');
      }

      toast.success('Email unbanned', email);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unban failed');
      toast.error('Unban failed', 'Please try again.');
      setIsUpdating(null);
    }
  };

  if (emails.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 text-center text-text-muted"
      >
        No banned emails yet.
      </motion.div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <RevealGroup stagger={0.05}>
        {emails.map((banned) => (
          <RevealItem
            key={banned.id}
            y={12}
            className="px-6 py-4 flex items-center justify-between hover:bg-background transition-colors"
          >
            <div>
              <p className="text-text-primary font-medium">{banned.email}</p>
              <p className="text-sm text-text-muted">
                Banned on {new Date(banned.created_at).toLocaleDateString()}
                {banned.reason && ` - ${banned.reason}`}
              </p>
            </div>
            <Pressable
              as="button"
              onClick={() => handleUnban(banned.email)}
              disabled={isUpdating === banned.email}
              className="px-4 py-2 text-sm text-accent border border-accent/30 rounded-[var(--radius-md)] hover:bg-accent/10 disabled:opacity-50 transition-colors"
            >
              {isUpdating === banned.email ? 'Unbanning...' : 'Unban'}
            </Pressable>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
