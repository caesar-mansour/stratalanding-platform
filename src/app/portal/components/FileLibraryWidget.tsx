'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GradientText, NumberTicker, RevealGroup, RevealItem } from '@/app/portal/components/portal-ui';

interface FileItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (fileType === 'application/pdf') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function FileLibraryWidget() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalSize: 0 });

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/uploads');
        if (response.ok) {
          const data = await response.json();
          const uploads = data.uploads || [];
          setFiles(uploads.slice(0, 3)); // Show only 3 recent files
          setStats({
            total: uploads.length,
            totalSize: uploads.reduce((acc: number, f: FileItem) => acc + f.file_size, 0),
          });
        }
      } catch (error) {
        console.error('Failed to fetch files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  return (
    <motion.div
      className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              <GradientText>File Library</GradientText>
            </h2>
            <p className="text-sm text-text-muted">
              <NumberTicker value={stats.total} format="number" /> files ({formatFileSize(stats.totalSize)})
            </p>
          </div>
        </div>
        <Link
          href="/portal/uploads"
          className="group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-[var(--color-accent)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
        >
          View all
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-2xl grid place-items-center mx-auto mb-3 text-[var(--color-accent)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1">
            <GradientText>No files yet</GradientText>
          </h3>
          <p className="text-sm text-text-muted mb-4">Share logos, copy, or brand assets so we can build with the real thing.</p>
          <Link
            href="/portal/uploads"
            className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm text-white shadow-[0_10px_24px_-12px_rgba(8,145,178,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-accent)]/90 hover:shadow-[0_14px_30px_-12px_rgba(8,145,178,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Files
          </Link>
        </div>
      ) : (
        <RevealGroup className="space-y-2">
          {files.map((file) => (
            <RevealItem
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center text-[var(--color-accent)]">
                {getFileIcon(file.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{file.file_name}</p>
                <p className="text-xs text-text-muted">
                  {formatFileSize(file.file_size)} · {file.category}
                </p>
              </div>
            </RevealItem>
          ))}

          {stats.total > 3 && (
            <Link
              href="/portal/uploads"
              className="block text-center py-2 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
            >
              +{stats.total - 3} more files
            </Link>
          )}
        </RevealGroup>
      )}
    </motion.div>
  );
}
