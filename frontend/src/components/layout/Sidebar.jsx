import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Compass, PlusSquare, User, LogOut } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Home', path: '/feed', icon: <Home className="w-6 h-6" /> },
    { name: 'Search', path: '/search', icon: <Compass className="w-6 h-6" /> },
    { name: 'Profile', path: user?.username ? `/profile/${user.username}` : '/feed', icon: <User className="w-6 h-6" /> },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between py-6">
      <div>
        {/* Desktop Brand Logo */}
        <div className="px-4 md:px-6 mb-8 hidden md:block">
          <Link to="/feed" className="inline-block hover:opacity-90 transition-opacity">
            <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-12 w-auto object-contain" />
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
                `flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-gray-100 ${
                  isActive ? 'font-bold text-brand-purple' : 'text-gray-700'
                }`
              }
            >
              {item.icon}
              <span className="hidden md:block text-lg">{item.name}</span>
            </NavLink>
          ))}
          {/* Create Post Action (could open a modal, but we'll manage it on the page for now or navigate) */}
          {/* We will just place the Create Post block on the Home Feed itself in Phase 3 */}
        </nav>
      </div>

      <div className="px-2 md:px-4">
        <button
          onClick={logout}
          className="flex items-center gap-4 p-3 w-full rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-6 h-6" />
          <span className="hidden md:block text-lg font-medium">Logout</span>
        </button>
        {user && (
          <div className="mt-4 px-2 hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{user.username}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
