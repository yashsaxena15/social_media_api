import React, { useContext } from 'react';
import { Sun, Moon, Palette, CheckCircle2, User, Sparkles, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const SettingsPage = () => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Manage your account appearance and preferences.
        </p>
      </div>

      {/* Appearance & Theme Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Appearance
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Customize your interface theme. Your choice is saved automatically and remembered across all sessions and logins.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Toggle Switch Bar */}
        <div className="px-6 py-4 bg-gray-50/60 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
            {isDark ? <Moon className="w-4 h-4 text-brand-teal" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>Dark Mode</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2 ${
              isDark ? 'bg-brand-purple' : 'bg-gray-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Visual Theme Selection Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              !isDark
                ? 'border-brand-purple bg-brand-purple/5 shadow-xs'
                : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 hover:border-gray-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-slate-100">Light Mode</span>
                </div>
                {!isDark && <CheckCircle2 className="w-5 h-5 text-brand-purple fill-brand-purple/20" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Crisp and bright appearance with high contrast for daytime use.
              </p>
            </div>

            {/* Mini preview bar */}
            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-purple"></div>
              <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-slate-700"></div>
              <div className="h-2 w-8 rounded bg-gray-300 dark:bg-slate-600"></div>
            </div>
          </button>

          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              isDark
                ? 'border-brand-teal bg-brand-teal/5 shadow-xs'
                : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 hover:border-gray-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-brand-teal flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-slate-100">Dark Mode</span>
                </div>
                {isDark && <CheckCircle2 className="w-5 h-5 text-brand-teal fill-brand-teal/20" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Deep navy and dark slate tones designed to reduce eye strain in low light.
              </p>
            </div>

            {/* Mini preview bar */}
            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-teal"></div>
              <div className="h-2 flex-1 rounded bg-slate-700"></div>
              <div className="h-2 w-8 rounded bg-slate-600"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Account Info / Session Card */}
      {user && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-700 dark:text-slate-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Signed In As</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">@{user.username}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200/60 dark:border-red-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 text-brand-purple dark:text-brand-teal flex-shrink-0" />
            <span>
              Your settings and theme preference are saved locally on this browser. When you return or log in, your chosen theme will be automatically applied.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
