import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import api from '../../api/axiosInstance';
import { getImageUrl } from '../../utils/imageUrl';
import FileErrorModal from '../../components/common/FileErrorModal';
import { optimizeImageForUpload } from '../../utils/imageOptimizer';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const EditProfileModal = ({ profile, onClose, onUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    dob: profile.dob || '',
    gender: profile.gender || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(getImageUrl(profile.profile_image) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isExtensionSvg = file.name.toLowerCase().endsWith('.svg');
      if (file.type === 'image/svg+xml' || isExtensionSvg || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setShowErrorModal(true);
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('bio', formData.bio);
      data.append('full_name', formData.full_name);
      data.append('dob', formData.dob || '');
      data.append('gender', formData.gender || '');
      if (imageFile) {
        const optimizedAvatar = await optimizeImageForUpload(imageFile, {
          maxDimension: 800,
          quality: 0.88,
          isAvatar: true,
        });
        data.append('profile_image', optimizedAvatar);
      }

      const res = await api.patch('profile/me/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onUpdated(res.data);
    } catch (err) {
      console.error('Failed to update profile', err);
      if (err.response?.data) {
        // Extract the first error message from the object (e.g. {"full_name": ["This field may not be blank."]})
        const errors = Object.values(err.response.data).flat();
        setError(errors[0] || 'Failed to update profile.');
      } else {
        setError('Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-transparent dark:border-slate-800 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Edit Profile</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-transparent dark:border-red-900/50">
              {error}
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-3">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-slate-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-3xl">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-brand-blue dark:text-brand-teal hover:text-brand-purple text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Change Photo
            </button>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal text-sm transition-colors"
              placeholder="Your full name"
            />
          </div>

          {/* Date of Birth and Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal text-sm transition-colors"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal text-sm resize-none transition-colors"
              placeholder="Tell people about yourself..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-brand-purple to-brand-teal text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <FileErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onSelectOther={() => fileInputRef.current?.click()}
      />
    </div>
  );
};

export default EditProfileModal;
