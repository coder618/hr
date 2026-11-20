import React, { useEffect, useState, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Search,
  Grid,
  List,
  Trash2,
  Copy,
  ExternalLink,
  Plus,
  Loader2,
  FileText,
  File,
  CheckCircle2,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { MediaFolderItem, MediaItem, UploadProgress } from '../types/media';

export const MediaLibraryPage: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'document'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media', {
        params: {
          folder_id: selectedFolderId !== null ? selectedFolderId : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: search || undefined,
          per_page: 50,
        },
      });
      setMediaList(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/media/folders/list');
      setFolders(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchMedia();
    setSelectedMedia(null);
    setSelectedIds([]);
  }, [selectedFolderId, typeFilter, search]);

  /**
   * Resumable Chunked Upload for cPanel Shared Hosting
   * Splits files into 1MB chunks to never hit execution or post_max_size caps.
   */
  const uploadFileWithChunks = async (file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    setUploadQueue((prev) => [
      ...prev,
      { file, progress: 0, status: 'uploading' },
    ]);

    try {
      // If file is smaller than 2MB, perform single standard upload
      if (file.size <= 2 * 1024 * 1024) {
        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolderId) formData.append('folder_id', String(selectedFolderId));

        const res = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
            setUploadQueue((prev) =>
              prev.map((item) => (item.file === file ? { ...item, progress: percent } : item))
            );
          },
        });

        const newMedia: MediaItem = res.data.data;
        setMediaList((prev) => [newMedia, ...prev]);
        setUploadQueue((prev) =>
          prev.map((item) => (item.file === file ? { ...item, progress: 100, status: 'completed' } : item))
        );
        return;
      }

      // Large file: upload in chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', String(chunkIndex));
        formData.append('total_chunks', String(totalChunks));
        formData.append('filename', file.name);
        formData.append('file', chunkBlob, file.name);
        if (selectedFolderId) formData.append('folder_id', String(selectedFolderId));

        const res = await api.post('/media/upload-chunk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const progressPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setUploadQueue((prev) =>
          prev.map((item) => (item.file === file ? { ...item, progress: progressPercent } : item))
        );

        if (res.data.meta?.completed) {
          const newMedia: MediaItem = res.data.data;
          setMediaList((prev) => [newMedia, ...prev]);
          setUploadQueue((prev) =>
            prev.map((item) => (item.file === file ? { ...item, status: 'completed' } : item))
          );
        }
      }
    } catch (err: any) {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.file === file ? { ...item, status: 'error', error: err.response?.data?.message || 'Upload failed' } : item
        )
      );
    }
  };

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(uploadFileWithChunks);
  };

  const handleDeleteMedia = async (media: MediaItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${media.file_name}"?`)) return;
    try {
      await api.delete(`/media/${media.id}`);
      setMediaList((prev) => prev.filter((m) => m.id !== media.id));
      if (selectedMedia?.id === media.id) setSelectedMedia(null);
    } catch (err) {
      alert('Failed to delete media');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} selected items?`)) return;
    try {
      await api.post('/media/bulk-delete', { ids: selectedIds });
      setMediaList((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      setSelectedMedia(null);
    } catch (err) {
      alert('Bulk delete failed');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/media/folders', { name: newFolderName });
      setShowNewFolderModal(false);
      setNewFolderName('');
      fetchFolders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const copyUrl = (url: string, uuid: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUuid(uuid);
    setTimeout(() => setCopiedUuid(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Document & Media Vault</h2>
          <p className="text-sm text-zinc-500">
            Private, tenant-isolated storage served through authorized streaming controllers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-zinc-300 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black text-xs font-semibold rounded-xl shadow-lg shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Assets</span>
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFilesChosen}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload Progress Queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white border border-zinc-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold text-zinc-950">Upload Activity</span>
            <button
              onClick={() => setUploadQueue([])}
              className="text-zinc-500 hover:text-zinc-600 text-[11px] cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {uploadQueue.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600 truncate max-w-xs">{item.file.name}</span>
                  <span className="text-zinc-500 text-[11px]">
                    {item.status === 'completed' ? (
                      <span className="text-zinc-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="text-zinc-900">{item.error}</span>
                    ) : (
                      `${item.progress}%`
                    )}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      item.status === 'completed'
                        ? 'bg-black text-white hover:bg-zinc-800'
                        : item.status === 'error'
                        ? 'bg-black text-white hover:bg-zinc-800'
                        : 'bg-black text-white hover:bg-zinc-800'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Workspace: Folders + Media Grid/List + Details Drawer */}
      <div className="flex gap-6 items-start">
        {/* Folders Sidebar */}
        <div className="w-56 shrink-0 bg-white border border-zinc-300 rounded-2xl p-4 space-y-1">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedFolderId === null
                ? 'bg-black text-white hover:bg-zinc-800 text-white'
                : 'text-zinc-500 hover:bg-white hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>All Files</span>
            </div>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFolderId === folder.id
                  ? 'bg-black text-white hover:bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-white hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="w-4 h-4 shrink-0 text-zinc-900" />
                <span className="truncate">{folder.name}</span>
              </div>
              <span className="text-[10px] opacity-60">{folder.media_count ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Media Browser Area */}
        <div className="flex-1 bg-white border border-zinc-300 rounded-2xl p-6 flex flex-col min-h-[560px]">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-300 mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter media..."
                  className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-600 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                <option value="all">All Media</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-zinc-800/10 hover:bg-black hover:bg-zinc-800/20 text-zinc-900 text-xs font-semibold rounded-xl border border-zinc-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedIds.length})</span>
                </button>
              )}

              <div className="flex bg-white border border-zinc-300 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Media Items Presentation */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span className="text-sm">Loading media files...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-16">
              <FolderOpen className="w-12 h-12 stroke-[1.5] mb-2" />
              <p className="text-sm font-medium">No media assets in this view</p>
              <p className="text-xs text-zinc-700 mt-1">Upload files using the button above</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaList.map((item) => {
                const isSelected = selectedMedia?.id === item.id;
                const isChecked = selectedIds.includes(item.id);
                const isImage = item.mime_type.startsWith('image/');

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMedia(item)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden border cursor-pointer transition-all ${
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
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                        <FileText className="w-10 h-10 text-black mb-2 stroke-[1.5]" />
                        <span className="text-xs text-zinc-600 font-medium truncate w-full">
                          {item.file_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-1">
                          {formatBytes(item.file_size)}
                        </span>
                      </div>
                    )}

                    {/* Checkbox for bulk delete */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isChecked) {
                          setSelectedIds(selectedIds.filter((id) => id !== item.id));
                        } else {
                          setSelectedIds([...selectedIds, item.id]);
                        }
                      }}
                      className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-black text-white hover:bg-zinc-800 border-indigo-600 text-white'
                          : 'bg-white/60 border-zinc-300 text-transparent group-hover:opacity-100 opacity-0'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    {/* Hover File Details Strip */}
                    <div className="absolute inset-x-0 bottom-0 bg-white/85 backdrop-blur-sm p-2 text-[11px] text-slate-200 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.file_name}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="bg-white uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Uploaded By</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {mediaList.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedMedia(item)}
                      className="hover:bg-white/60 cursor-pointer"
                    >
                      <td className="px-4 py-3 flex items-center gap-3 font-medium text-zinc-950">
                        <File className="w-4 h-4 text-black shrink-0" />
                        <span className="truncate max-w-xs">{item.file_name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">{item.extension.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono">{formatBytes(item.file_size)}</td>
                      <td className="px-4 py-3">{item.uploader?.name || 'System'}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <a
                          href={item.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 hover:text-black inline-block"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Media Details Inspector Drawer */}
        {selectedMedia && (
          <div className="w-72 shrink-0 bg-white border border-zinc-300 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Asset Details</h4>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Preview */}
            <div className="aspect-video bg-white rounded-xl overflow-hidden border border-zinc-300 flex items-center justify-center">
              {selectedMedia.mime_type.startsWith('image/') ? (
                <img
                  src={selectedMedia.preview_url}
                  alt={selectedMedia.file_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <FileText className="w-12 h-12 text-black" />
              )}
            </div>

            {/* Metadata Information */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">File Name</span>
                <span className="text-zinc-950 font-medium break-all">{selectedMedia.file_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Size</span>
                  <span className="text-zinc-600 font-mono">{formatBytes(selectedMedia.file_size)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Dimensions</span>
                  <span className="text-zinc-600 font-mono">
                    {selectedMedia.width ? `${selectedMedia.width}×${selectedMedia.height}` : '—'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Mime Type</span>
                <span className="text-zinc-600 font-mono">{selectedMedia.mime_type}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Stored File Path</span>
                <span className="text-zinc-500 font-mono text-[10px] break-all">
                  storage/app/private/{selectedMedia.file_path}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-300">
              <button
                onClick={() => copyUrl(selectedMedia.preview_url, selectedMedia.uuid)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-800 text-xs font-semibold rounded-xl text-slate-200 border border-zinc-300 transition-all cursor-pointer"
              >
                {copiedUuid === selectedMedia.uuid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                    <span className="text-zinc-900">URL Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Stream URL</span>
                  </>
                )}
              </button>

              <a
                href={selectedMedia.preview_url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-black text-white hover:bg-zinc-800/20 hover:bg-black hover:bg-zinc-800/30 text-xs font-semibold rounded-xl text-indigo-300 border border-zinc-300 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>

              <button
                onClick={() => handleDeleteMedia(selectedMedia)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-black text-white hover:bg-zinc-800/10 hover:bg-black hover:bg-zinc-800/20 text-xs font-semibold rounded-xl text-zinc-900 border border-zinc-300 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Asset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-xs backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-300 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-950 mb-3">Create Media Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Employee Avatars"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold rounded-xl hover:bg-black cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MediaLibraryPage;
