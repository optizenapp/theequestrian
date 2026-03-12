'use client';

import { useState, useTransition } from 'react';
import { Save, Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import { updateAuthor } from '../../actions';
import Link from 'next/link';

interface Author {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  website_url: string | null;
  is_author: boolean;
  background_image: string | null;
}

export default function AuthorEditForm({ author }: { author: Author }) {
  const [name, setName] = useState(author.name || '');
  const [email, setEmail] = useState(author.email || '');
  const [bio, setBio] = useState(author.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(author.website_url || '');
  const [image, setImage] = useState(author.image || '');
  const [backgroundImage, setBackgroundImage] = useState(author.background_image || '');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const handleSave = () => {
    setError('');
    startTransition(async () => {
      const result = await updateAuthor(author.id, { name, email, bio, website_url: websiteUrl, image, background_image: backgroundImage });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'authors');
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImage(data.url);
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return; }

    setIsUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'authors');
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setBackgroundImage(data.url);
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setIsUploadingBg(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/authors" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Authors
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
                placeholder="Author biography..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Sidebar: Image + Save */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Profile Image</label>
            {image ? (
              <div className="relative group mb-4">
                <img src={image} alt={name} className="w-full aspect-square object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 mb-4">
                <span className="text-5xl font-bold">{name.charAt(0) || '?'}</span>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-yorkshire-pink hover:bg-pink-50/50 transition-all cursor-pointer">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-yorkshire-pink" />
              ) : (
                <Upload className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Background Image</label>
            <p className="text-xs text-gray-400 mb-3">Displayed as the hero banner on the author page. Wide landscape images work best.</p>
            {backgroundImage ? (
              <div className="relative group mb-4">
                <img src={backgroundImage} alt="Background" className="w-full aspect-[3/1] object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setBackgroundImage('')}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full aspect-[3/1] bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest">No Background</span>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-yorkshire-pink hover:bg-pink-50/50 transition-all cursor-pointer">
              {isUploadingBg ? (
                <Loader2 className="w-4 h-4 animate-spin text-yorkshire-pink" />
              ) : (
                <Upload className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {isUploadingBg ? 'Uploading...' : 'Upload Background'}
              </span>
              <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Author
          </button>
          {saved && <p className="text-sm font-bold text-green-600 text-center">Saved!</p>}
          {error && <p className="text-sm font-bold text-red-600 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
