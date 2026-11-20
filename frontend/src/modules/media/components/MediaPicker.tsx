import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MediaItem } from '../types/media';
import { X, Search, FileText, Check, Upload } from 'lucide-react';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  title?: string;
  allowedTypes?: 'all' | 'images' | 'documents';
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media',
  allowedTypes = 'all',
}) => {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const { data: mediaItems = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ['media-picker-list', search, allowedTypes],
    queryFn: async () => {
      const typeParam = allowedTypes === 'images' ? 'image' : allowedTypes === 'documents' ? 'document' : '';
      const res = await api.get('/media', {
        params: { search: search || undefined, type: typeParam || undefined, limit: 40 },
      });
      return res.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-300 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            <p className="text-xs text-zinc-500">
              Pick a file from the organization media library
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-300 px-6 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search media files by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-1.5 pl-9 pr-3 text-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
            />
          </div>
        </div>

        {/* Body Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Loading media library...
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Upload className="mb-2 h-10 w-10 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-800">No media found</p>
              <p className="text-xs text-zinc-500">Upload files in the Media Library to use them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {mediaItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isImage = item.mime_type.startsWith('image/');

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border p-2 transition ${
                      isSelected
                        ? 'border-indigo-600 bg-zinc-100/50 ring-2 ring-indigo-500  '
                        : 'border-zinc-300 hover:border-zinc-300  '
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded bg-zinc-100 flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={item.thumbnail_url || item.preview_url}
                          alt={item.title || item.file_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-zinc-500" />
                      )}
                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 rounded-full bg-black text-white hover:bg-zinc-800 p-0.5">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="truncate text-xs font-medium text-zinc-900">
                        {item.title || item.file_name}
                      </p>
                      <p className="text-[11px] text-zinc-500 uppercase">
                        {item.extension} • {(item.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-300 px-6 py-4">
          <div className="text-xs text-zinc-500">
            {selectedItem ? `Selected: ${selectedItem.title || selectedItem.file_name}` : 'No file selected'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              disabled={!selectedItem}
              onClick={() => {
                if (selectedItem) {
                  onSelect(selectedItem);
                  onClose();
                }
              }}
              className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-50"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
