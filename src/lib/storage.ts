// File storage — PostgreSQL (Neon) for production, local disk for development
// Files are stored as BYTEA in the file_store table when DATABASE_URL points to Neon
// In local dev, files go to public/uploads/ on disk for easy access

import sql from '@/lib/db';

const isProduction = process.env.NODE_ENV === 'production';

// ── Local disk (dev only) ───────────────────────────────────────────

async function localUpload(
  bucket: string,
  filePath: string,
  data: ArrayBuffer | Uint8Array | Buffer,
): Promise<{ key: string; error: Error | null }> {
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');

  const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
  const fullPath = path.join(UPLOAD_DIR, bucket, filePath);

  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return { key: '', error: new Error('Invalid file path') };
  }

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, Buffer.from(data as Uint8Array));

  const key = `${bucket}/${filePath}`;
  return { key, error: null };
}

async function localDelete(keys: string[]): Promise<{ error: Error | null }> {
  const { unlink } = await import('fs/promises');
  const path = await import('path');
  const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

  for (const key of keys) {
    try {
      await unlink(path.join(UPLOAD_DIR, key));
    } catch {
      // File may not exist
    }
  }
  return { error: null };
}

async function localGet(key: string): Promise<{ data: Buffer | null; error: Error | null }> {
  const { readFile } = await import('fs/promises');
  const path = await import('path');
  const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, key));
    return { data: buf, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ── PostgreSQL storage (production) ─────────────────────────────────

async function dbUpload(
  bucket: string,
  filePath: string,
  data: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
  owner?: { projectId?: string | null; uploadedBy?: string | null },
): Promise<{ key: string; error: Error | null }> {
  try {
    const key = `${bucket}/${filePath}`;
    const buf = Buffer.from(data as Uint8Array);

    // AUDIT 2026-08-12: record the OWNER explicitly (migration 061). Authorization used to parse
    // the project id out of the storage key string, which is a convention rather than a
    // constraint — a key written without it silently escaped the check. With a real column the
    // check is a JOIN, and the FK makes a deleted project take its bytes with it instead of
    // leaving them behind forever.
    await sql`
      INSERT INTO file_store (storage_key, file_data, content_type, file_size, project_id, uploaded_by)
      VALUES (${key}, ${buf}, ${contentType}, ${buf.length}, ${owner?.projectId ?? null}, ${owner?.uploadedBy ?? null})
      ON CONFLICT (storage_key) DO UPDATE
      SET file_data = EXCLUDED.file_data,
          content_type = EXCLUDED.content_type,
          file_size = EXCLUDED.file_size,
          project_id = COALESCE(EXCLUDED.project_id, file_store.project_id),
          uploaded_by = COALESCE(EXCLUDED.uploaded_by, file_store.uploaded_by)
    `;

    return { key, error: null };
  } catch (err) {
    return { key: '', error: err instanceof Error ? err : new Error(String(err)) };
  }
}

async function dbDelete(keys: string[]): Promise<{ error: Error | null }> {
  try {
    if (keys.length === 0) return { error: null };
    await sql`DELETE FROM file_store WHERE storage_key = ANY(${keys})`;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

async function dbGet(key: string): Promise<{ data: Buffer | null; contentType: string | null; error: Error | null }> {
  try {
    const [row] = await sql`
      SELECT file_data, content_type FROM file_store WHERE storage_key = ${key} LIMIT 1
    `;
    if (!row) return { data: null, contentType: null, error: new Error('File not found') };
    return { data: row.file_data, contentType: row.content_type, error: null };
  } catch (err) {
    return { data: null, contentType: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Upload a file. Returns a storage key (NOT a URL).
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  data: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
  /**
   * Who this file belongs to. Pass it for anything a client uploads — it is what makes
   * authorization a JOIN and lets a deleted project take its files with it (migration 061).
   * Omitted for system-generated artefacts (e.g. template zips) that belong to no project.
   */
  owner?: { projectId?: string | null; uploadedBy?: string | null },
): Promise<{ url: string | null; error: Error | null }> {
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\')) {
    return { url: null, error: new Error('Invalid file path') };
  }

  if (isProduction) {
    const { key, error } = await dbUpload(bucket, filePath, data, contentType, owner);
    return { url: key || null, error };
  } else {
    const { key, error } = await localUpload(bucket, filePath, data);
    return { url: key || null, error };
  }
}

/**
 * Get file data by storage key.
 */
export async function getFile(key: string): Promise<{ data: Buffer | null; contentType?: string | null; error: Error | null }> {
  if (isProduction) {
    return dbGet(key);
  } else {
    return localGet(key);
  }
}

/**
 * Delete files by storage keys.
 */
export async function deleteFiles(
  _bucket: string,
  keys: string[]
): Promise<{ error: Error | null }> {
  const normalizedKeys = keys.map(k => {
    if (k.startsWith('/uploads/')) return k.slice('/uploads/'.length);
    return k;
  });

  if (isProduction) {
    return dbDelete(normalizedKeys);
  } else {
    return localDelete(normalizedKeys);
  }
}

/**
 * Delete a single file by its stored URL/key.
 */
export async function deleteFileByUrl(url: string): Promise<{ error: Error | null }> {
  return deleteFiles('', [url]);
}

/**
 * Get a URL to serve the file.
 * Dev: returns /uploads/ path. Production: returns API download route.
 */
export function getFileUrl(storageKey: string, uploadId?: string): string {
  if (!isProduction) {
    return `/uploads/${storageKey}`;
  }
  if (uploadId) {
    return `/api/uploads/${uploadId}/download`;
  }
  return `/api/files/${encodeURIComponent(storageKey)}`;
}
