import React, { useEffect, useState } from 'react';
import {
  X,
  Upload,
  Search,
  Check,
  FileText,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import api from '@/lib/api';
import { MediaItem } from '@/modules/media/types/media';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: MediaItem | MediaItem[]) => void;
  multiple?: boolean;
  typeFilter?: 'image' | 'document' | 'all';
  title?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  typeFilter = 'all',
  title = 'Select Media File',
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media', {
        params: {
          search: search || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          per_page: 36,
        },
      });
      setMediaList(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedItems([]);
    }
  }, [isOpen, search, typeFilter]);

  if (!isOpen) return null;

  const toggleSelect = (item: MediaItem) => {
    if (multiple) {
      if (selectedItems.some((s) => s.id === item.id)) {
        setSelectedItems(selectedItems.filter((s) => s.id !== item.id));
      } else {
        setSelectedItems([...selectedItems, item]);
      }
    } else {
      setSelectedItems([item]);
    }
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;
    if (multiple) {
      onSelect(selectedItems);
    } else {
      onSelect(selectedItems[0]);
    }
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded: MediaItem = res.data.data;
      setMediaList([uploaded, ...mediaList]);
      setSelectedItems([uploaded]);
      setActiveTab('library');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-xs backdrop-blur-sm p-4 text-slate-100">
      <div className="bg-white border border-zinc-300 rounded-2xl w-full max-w-4xl h-[680px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white hover:bg-zinc-800/10 rounded-xl text-black border border-zinc-300">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950">{title}</h3>
              <p className="text-xs text-zinc-500">
                {multiple ? 'Select one or more items' : 'Select an asset from private storage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 shadow-xs rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-6 py-3 border-b border-zinc-300 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-black text-white hover:bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-white'
              }`}
            >
              Media Vault
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-black text-white hover:bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-white'
              }`}
            >
              Upload New
            </button>
          </div>

          {activeTab === 'library' && (
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-white border border-zinc-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'library' ? (
            loading ? (
              <div className="h-full flex items-center justify-center text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-xs">Loading media vault...</span>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                <FolderOpen className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p>No media files found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {mediaList.map((item) => {
                  const isSelected = selectedItems.some((s) => s.id === item.id);
                  const isImage = item.mime_type.startsWith('image/');
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item)}
                      className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all group ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/20'
                          : 'border-zinc-300 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      {isImage ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <FileText className="w-8 h-8 text-black mb-1" />
                          <span className="text-[10px] text-zinc-500 truncate w-full">
                            {item.file_name}
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black text-white hover:bg-zinc-800 flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-white/40 backdrop-blur-xs backdrop-blur-sm p-1.5 text-[10px] text-zinc-600 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.file_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center bg-white/50">
              <div className="p-4 bg-black text-white hover:bg-zinc-800/10 text-black rounded-2xl mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-zinc-950 mb-1">Upload New Media Asset</h4>
              <p className="text-xs text-zinc-500 mb-6 max-w-sm">
                Files are stored securely outside the web root in private tenant directories.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-xs transition-all">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? 'Processing File...' : 'Choose File to Upload'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-300 bg-white flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            {selectedItems.length > 0 ? (
              <span>Selected <strong>{selectedItems.length}</strong> item(s)</span>
            ) : (
              <span>No item selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 shadow-xs hover:bg-slate-700 text-xs font-semibold rounded-xl text-zinc-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="px-5 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black text-xs font-semibold rounded-xl shadow-lg shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MediaPicker;
