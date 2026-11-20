export interface MediaItem {
  id: number;
  uuid: string;
  organization_id: number;
  folder_id?: number | null;
  file_name: string;
  stored_name: string;
  disk: string;
  file_path: string;
  thumbnail_path?: string | null;
  mime_type: string;
  file_size: number;
  extension: string;
  width?: number | null;
  height?: number | null;
  hash?: string | null;
  title?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  preview_url: string;
  thumbnail_url: string;
  uploader?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MediaFolderItem {
  id: number;
  organization_id: number;
  parent_id?: number | null;
  name: string;
  media_count?: number;
  created_at: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}
