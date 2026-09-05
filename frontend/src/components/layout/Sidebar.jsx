import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Compass, PlusSquare, User, Settings } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const navItems = [
    { name: 'Home', path: '/feed', icon: <Home className="w-6 h-6" /> },
    { name: 'Search', path: '/search', icon: <Compass className="w-6 h-6" /> },
    { name: 'Profile', path: user?.username ? `/profile/${user.username}` : '/feed', icon: <User className="w-6 h-6" /> },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-16 md:w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between py-6 transition-colors duration-200">
      <div>
        {/* Desktop Brand Logo */}
        <div className="px-4 md:px-6 mb-8 hidden md:block">
          <Link to="/feed" className="inline-block hover:opacity-90 transition-opacity">
            <span className="inline-flex items-center dark:bg-white/10 dark:rounded-lg dark:px-2 dark:py-0.5">
              <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-12 w-auto object-contain" />
            </span>
          </Link>
        </div>
        {/* Collapsed/Mobile Brand Icon */}
        <div className="px-2 mb-8 md:hidden flex justify-center">
          <Link to="/feed" className="inline-block hover:opacity-90 transition-opacity">
            <img src="/aequosia-a-icon.png" alt="Aequosia" className="w-10 h-10 rounded-xl shadow-xs object-contain" />
          </Link>
        </div>
        <nav className="flex flex-col gap-2 px-2 md:px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'font-bold text-brand-purple dark:text-brand-teal bg-brand-purple/5 dark:bg-brand-teal/10'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              <span className="hidden md:block text-lg">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-2 md:px-4">
        {/* Settings button placed where logout previously was */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-4 p-3 rounded-lg transition-colors ${
              isActive
                ? 'font-bold text-brand-purple dark:text-brand-teal bg-brand-purple/5 dark:bg-brand-teal/10'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <Settings className="w-6 h-6" />
          <span className="hidden md:block text-lg">Settings</span>
        </NavLink>
        {user && (
          <Link
            to={`/profile/${user.username}`}
            className="mt-4 px-2 flex items-center justify-center md:justify-start gap-2.5 hover:opacity-80 transition-opacity"
            title={`View profile (@${user.username})`}
          >
            {user.profile_image ? (
              <img
                src={getImageUrl(user.profile_image)}
                alt={`${user.username}'s avatar`}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-sm flex-shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
              {user.username}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
