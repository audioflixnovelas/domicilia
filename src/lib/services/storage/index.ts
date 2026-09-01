import { FileUpload } from '@/types';
import { formatFileSize } from '@/lib/utils';

export interface StorageProvider {
  upload(file: File, path: string): Promise<FileUpload>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}

class SupabaseStorageProvider implements StorageProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  async upload(file: File, path: string): Promise<FileUpload> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Falha no upload do arquivo');
    }

    const result = await response.json();

    return {
      url: result.url,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size,
      storagePath: path,
    };
  }

  async delete(path: string): Promise<void> {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  }

  async getUrl(path: string): Promise<string> {
    return `${this.baseUrl}/storage/v1/object/public/domicilia/${path}`;
  }
}

export const storageProvider: StorageProvider = new SupabaseStorageProvider();

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (file.size > maxSize) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}` };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido. Use: PDF, DOCX, JPG, PNG, GIF ou WEBP',
    };
  }

  return { valid: true };
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateStoragePath(
  turmaId: string,
  alunoId: string,
  disciplina: string
) {
  return [
    "envios",
    turmaId,
    alunoId,
    disciplina
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  ].join("/");
}
