import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 ml-16 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
