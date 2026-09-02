'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectUpload, UploadCategory } from '@/lib/types';
import { GradientText, MeterBar } from '@/app/portal/components/portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

interface UploadsContentProps {
  projectId: string;
}

const categories: { value: UploadCategory; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'brand', label: 'Brand' },
  { value: 'photos', label: 'Photos' },
  { value: 'content', label: 'Content' },
  { value: 'other', label: 'Other' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileType: string): React.ReactElement {
  if (fileType.startsWith('image/')) {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (fileType === 'application/pdf') {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function UploadsContent({ projectId }: UploadsContentProps) {
  const [uploads, setUploads] = useState<ProjectUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<UploadCategory>('other');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

  const fetchUploads = useCallback(async () => {
    try {
      const response = await fetch('/api/uploads');
      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads || []);
      }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);
      formData.append('projectId', projectId);

      try {
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        setUploadProgress(((i + 1) / fileArray.length) * 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        break;
      }
    }

    setIsUploading(false);
    setUploadProgress(0);
    fetchUploads();
  };

  const handleDelete = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    setDeletingId(uploadId);

    try {
      const response = await fetch(`/api/uploads?id=${uploadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setUploads(prev => prev.filter(u => u.id !== uploadId));
    } catch {
      setError('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreview = async (upload: ProjectUpload) => {
    try {
      const response = await fetch(`/api/uploads/${upload.id}/url`);
      if (!response.ok) throw new Error('Failed to get file URL');
      const { url } = await response.json();
      setPreviewUrl(url);
      setPreviewName(upload.file_name);
    } catch {
      setError('Failed to preview file');
    }
  };

  const handleDownload = async (upload: ProjectUpload) => {
    try {
      const response = await fetch(`/api/uploads/${upload.id}/url`);
      if (!response.ok) throw new Error('Failed to get file URL');
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch {
      setError('Failed to download file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUpload(files);
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-8" variants={itemVariants}>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2"><GradientText>Uploads</GradientText></h1>
        <p className="text-text-muted">Share files and assets for your project.</p>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="rounded-md text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Area */}
      <motion.div
        variants={itemVariants}
        className={`relative bg-white/70 backdrop-blur-md rounded-2xl border-2 border-dashed p-8 mb-8 transition-all duration-200 overflow-hidden ${
          isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-[0_22px_60px_-14px_rgba(8,145,178,0.34)] ring-2 ring-[#22D3EE]/40'
            : 'border-[var(--color-accent)]/30 hover:border-[#22D3EE]/50 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)] hover:shadow-[0_18px_50px_-12px_rgba(8,145,178,0.26)]'
        }`}
        animate={isDragging ? { y: -3, scale: 1.01 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />

        <div className="text-center">
          <motion.div
            className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4"
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          >
            <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </motion.div>

          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-text-muted mb-4">Drag and drop files here, or click to browse</p>

          {/* Category Selection */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                aria-pressed={selectedCategory === cat.value}
                className={`px-3 py-1.5 text-sm rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 ${
                  selectedCategory === cat.value
                    ? 'bg-[var(--color-accent)] text-white shadow-[0_4px_14px_-4px_rgba(8,145,178,0.45)]'
                    : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <motion.label
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg cursor-pointer shadow-[0_8px_24px_-8px_rgba(8,145,178,0.5)] hover:bg-[var(--color-accent)]/90 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[#22D3EE]/50 focus-within:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Choose Files
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.zip"
            />
          </motion.label>

          {/* AUDIT 2026-08-12 (P2): must match the server ceiling in api/uploads — promising 10MB while
              the server rejects at 5MB is worse than either limit alone. */}
          <p className="text-xs text-text-muted mt-3">Max 5MB per file</p>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-muted">Uploading...</span>
              <span className="text-[var(--color-accent)] font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <MeterBar percentage={uploadProgress} height={8} />
          </motion.div>
        )}
      </motion.div>

      {/* Uploaded Files */}
      <motion.div variants={itemVariants} className={`${GLASS} overflow-hidden`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl grid place-items-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Your Files</h2>
            <span className="ml-auto text-sm text-text-muted tabular-nums">{uploads.length} file{uploads.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-text-muted">Loading files...</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-2xl grid place-items-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-1"><GradientText>No files yet</GradientText></h3>
            <p className="text-sm text-text-muted">Drop your logo, brand assets, or photos above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-accent)]/10">
            <AnimatePresence>
              {uploads.map((upload) => (
                <motion.div
                  key={upload.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group p-4 flex items-center gap-4 hover:bg-[var(--color-accent)]/5 transition-colors"
                >
                  <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl grid place-items-center text-[var(--color-accent)] transition-transform duration-200 group-hover:scale-105">
                    {getFileIcon(upload.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{upload.file_name}</p>
                    <p className="text-sm text-text-muted">
                      {formatFileSize(upload.file_size)} • {upload.category} • {new Date(upload.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {upload.file_type.startsWith('image/') && (
                      <button
                        onClick={() => handlePreview(upload)}
                        className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                        title="Preview"
                        aria-label={`Preview ${upload.file_name}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(upload)}
                      className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                      title="Download"
                      aria-label={`Download ${upload.file_name}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(upload.id)}
                      disabled={deletingId === upload.id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                      title="Delete"
                      aria-label={`Delete ${upload.file_name}`}
                    >
                      {deletingId === upload.id ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Guidelines */}
      <motion.div variants={itemVariants} className={`mt-8 ${GLASS} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl grid place-items-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">What to Upload</h2>
        </div>
        <ul className="space-y-2 text-sm text-text-muted">
          {[
            { title: 'Logo files', desc: 'SVG, PNG (transparent)' },
            { title: 'Brand guidelines', desc: 'Colors, fonts' },
            { title: 'Product photos', desc: 'High-res images' },
            { title: 'Team photos', desc: 'Professional headshots' },
            { title: 'Copy/content', desc: 'Text content' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong className="text-text-primary">{item.title}</strong> - {item.desc}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-text-primary truncate max-w-xs">{previewName}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewUrl}
                    download={previewName}
                    className="p-1.5 text-text-muted hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setPreviewUrl(null)}
                    aria-label="Close preview"
                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Image */}
              <div className="flex items-center justify-center p-4 bg-gray-50 max-h-[75vh] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
