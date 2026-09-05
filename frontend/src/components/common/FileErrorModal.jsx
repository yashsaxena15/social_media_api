import React from 'react';
import { AlertCircle } from 'lucide-react';

const FileErrorModal = ({ isOpen, onClose, onSelectOther }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 w-full max-w-sm mx-4 p-6 text-center animate-[fadeIn_0.15s_ease-out] transition-colors">
        {/* Error Symbol */}
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>

        {/* Title & Message */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
          File couldn't be uploaded
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
          This file is not supported
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onSelectOther) onSelectOther();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple/90 transition-colors"
          >
            Select other file
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileErrorModal;
