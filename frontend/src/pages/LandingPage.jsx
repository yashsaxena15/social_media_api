import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Compass, Home, User, Heart, MessageSquare, Globe, Search, Users, LayoutGrid, Sun, Moon } from 'lucide-react';
import AuthDrawer from '../components/AuthDrawer';

// Official GitHub Logo / Mark
const GithubIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// Reusable scroll entrance animation wrapper
const FadeInSection = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const LandingPage = () => {
  const { user, loading } = useContext(AuthContext);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('login'); // 'login' | 'register'
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('aequosia-theme') === 'dark';
    } catch {
      return false;
    }
  });

  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const openDrawer = (mode) => { setDrawerMode(mode); setDrawerOpen(true); };

  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem('aequosia-theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => {
      root.classList.remove('dark');
    };
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If user is already logged in, redirect to their feed
  if (!loading && user) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className={`${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'} min-h-screen font-sans selection:bg-brand-purple/20 relative overflow-hidden transition-colors duration-300`}>

      {/* Auth Drawer — right-sliding panel */}
      <AuthDrawer isOpen={drawerOpen} mode={drawerMode} onClose={() => setDrawerOpen(false)} isDark={isDark} />

      {/* Ambient Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[120vh] overflow-hidden -z-10 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${
          isDark ? 'bg-brand-purple/20 mix-blend-normal' : 'bg-brand-purple/10 mix-blend-multiply'
        }`}></div>
        <div className={`absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${
          isDark ? 'bg-brand-teal/20 mix-blend-normal' : 'bg-brand-teal/10 mix-blend-multiply'
        }`}></div>
      </div>

      {/* Navbar with smooth scroll transitions */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-300 ${
        isScrolled
          ? (isDark ? 'bg-slate-950/95 shadow-sm border-b border-slate-800/60 py-3' : 'bg-white/90 shadow-sm border-b border-gray-200/50 py-3')
          : (isDark ? 'bg-slate-950/60 border-b border-transparent py-5' : 'bg-white/50 border-b border-transparent py-5')
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Branding / Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                {/* Pill wrapper only in dark mode to preserve PNG readability; completely clean in light mode */}
                <span className={isDark ? "bg-white/10 rounded-lg px-2 py-0.5 inline-flex items-center" : "inline-flex items-center"}>
                  <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-11 sm:h-12 md:h-14 w-auto object-contain" />
                </span>
              </Link>
            </div>

            {/* Nav and Auth Buttons */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Dark mode toggle — placed left of GitHub */}
              <button
                type="button"
                onClick={toggleDark}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <a
                href="https://github.com/yashsaxena15/social_media_api/"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 font-medium transition-colors text-sm ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Aequosia GitHub Repository"
              >
                <GithubIcon className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>

              {/* Divider pipe */}
              <span className={`hidden sm:inline-block font-light select-none ${isDark ? 'text-slate-600' : 'text-gray-300'}`} aria-hidden="true">
                |
              </span>

              {/* Log in → opens drawer */}
              <button
                onClick={() => openDrawer('login')}
                className={`hidden sm:inline-flex font-medium transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-gray-600 hover:text-brand-darkblue'
                }`}
              >
                Log in
              </button>

              {/* Join → opens register drawer */}
              <button
                onClick={() => openDrawer('register')}
                className="inline-flex items-center justify-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal motion-safe:hover:scale-105 hover:opacity-90 transition-all duration-300"
              >
                Join Aequosia
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="pt-40 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center min-h-[90vh]">
          {/* Text Content */}
          <FadeInSection delay={0} className="text-center max-w-3xl mx-auto mt-10 md:mt-16">
            {/* Hero Badge */}
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-sm shadow-xs mb-8 transition-colors ${
              isDark
                ? 'bg-slate-800/90 border border-slate-700/60 hover:border-slate-600'
                : 'bg-white/95 border border-gray-200/80 hover:border-gray-300'
            }`}>
              <img src="/aequosia-a-icon.png" alt="Aequosia" className="w-6 h-6 rounded-lg object-contain shadow-2xs" />
              <span className="text-xs sm:text-sm font-bold tracking-wider bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green text-transparent bg-clip-text uppercase">
                People · Ideas · Together
              </span>
            </div>

            {/* Hero Headline — crisp contrast restored for Light Mode */}
            <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 drop-shadow-sm ${
              isDark ? 'text-slate-50' : 'text-gray-900'
            }`}>
              Social, <span className="bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green text-transparent bg-clip-text">reimagined.</span>
            </h1>

            {/* Hero Description — clear, readable contrast restored for Light Mode */}
            <p className={`text-xl md:text-2xl mb-10 leading-relaxed font-light ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}>
              A clean, fast, and community-driven space to connect with friends, share your moments, and belong. No noise, just your network.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Get Started → opens register drawer */}
              <button
                onClick={() => openDrawer('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent rounded-xl shadow-lg shadow-brand-purple/10 text-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal motion-safe:hover:scale-105 hover:shadow-brand-purple/20 transition-all duration-300"
              >
                Get Started for Free
              </button>
              {/* Sign In → opens login drawer; exact original Light Mode design preserved */}
              <button
                onClick={() => openDrawer('login')}
                className={`w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 backdrop-blur-sm rounded-xl shadow-sm text-lg font-bold transition-colors duration-300 ${
                  isDark
                    ? 'border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                    : 'border border-gray-200 bg-white/50 text-gray-700 hover:bg-white hover:border-gray-300'
                }`}
              >
                Sign In
              </button>
            </div>
          </FadeInSection>

          {/* 3D Product Preview Mockup */}
          <FadeInSection delay={200} className="w-full max-w-5xl mx-auto mt-20 mb-10 perspective-[2000px]">
            <div 
              className={`w-full rounded-2xl overflow-hidden transition-all duration-1000 ease-out border ${
                isDark
                  ? 'bg-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border-slate-700/50'
                  : 'bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-gray-200/60'
              }`}
              style={{ 
                transform: prefersReducedMotion ? 'none' : (
                  isHeroHovered 
                    ? "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)" 
                    : "perspective(1200px) rotateX(12deg) rotateY(-4deg) scale(0.95)"
                )
              }}
              onMouseEnter={() => setIsHeroHovered(true)}
              onMouseLeave={() => setIsHeroHovered(false)}
            >
              {/* Mock Browser Header */}
              <div className={`border-b px-4 py-3 flex items-center gap-2 backdrop-blur-sm ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-100/80 border-gray-200'
              }`}>
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              
              {/* Mock App Layout */}
              <div className={`flex h-[450px] md:h-[600px] ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
                {/* Mock Sidebar */}
                <div className={`hidden md:flex w-64 border-r flex-col py-6 px-4 ${
                  isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-200'
                }`}>
                  <div className="mb-8 px-2">
                    <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-7 w-auto object-contain" />
                  </div>
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg text-brand-purple font-bold ${
                      isDark ? 'bg-slate-800' : 'bg-gray-100'
                    }`}>
                      <Home className="w-5 h-5" /> <span>Home</span>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDark ? 'text-slate-500' : 'text-gray-500'
                    }`}>
                      <Compass className="w-5 h-5" /> <span>Search</span>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDark ? 'text-slate-500' : 'text-gray-500'
                    }`}>
                      <User className="w-5 h-5" /> <span>Profile</span>
                    </div>
                  </div>
                </div>

                {/* Mock Feed */}
                <div className="flex-1 p-4 md:p-8 overflow-hidden relative">
                  <div className="max-w-xl mx-auto space-y-6">
                    {/* Post 1 */}
                    <div className={`p-5 rounded-xl shadow-sm border ${
                      isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'
                    }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-purple to-brand-teal"></div>
                        <div>
                          <div className={`h-4 w-28 rounded mb-2 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                          <div className={`h-3 w-16 rounded ${isDark ? 'bg-slate-700/60' : 'bg-gray-100'}`}></div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className={`h-4 w-full rounded ${isDark ? 'bg-slate-700/60' : 'bg-gray-100'}`}></div>
                        <div className={`h-4 w-4/5 rounded ${isDark ? 'bg-slate-700/60' : 'bg-gray-100'}`}></div>
                      </div>
                      <div className={`flex gap-4 border-t pt-3 ${
                        isDark ? 'border-slate-700/50 text-slate-500' : 'border-gray-50 text-gray-400'
                      }`}>
                        <Heart className="w-5 h-5" />
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Post 2 */}
                    <div className={`p-5 rounded-xl shadow-sm border ${
                      isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'
                    }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                        <div>
                          <div className={`h-4 w-32 rounded mb-2 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                          <div className={`h-3 w-20 rounded ${isDark ? 'bg-slate-700/60' : 'bg-gray-100'}`}></div>
                        </div>
                      </div>
                      <div className={`h-40 w-full rounded-lg mb-4 ${isDark ? 'bg-slate-700/60' : 'bg-gray-100'}`}></div>
                    </div>
                  </div>

                  {/* Fade out bottom overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t pointer-events-none ${
                    isDark ? 'from-slate-950' : 'from-gray-50'
                  } to-transparent`}></div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* Bento Grid Feature Section */}
        <section className={`py-24 relative z-10 border-t ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                Everything you need. Nothing you don't.
              </h2>
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                A clean, modern foundation built for sharing what matters and discovering new voices, without the algorithm noise.
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
              
              {/* Feature 1: Share (Wide Card) */}
              <FadeInSection delay={0} className={`md:col-span-2 rounded-3xl p-8 shadow-sm hover:shadow-md border transition-all duration-300 group flex flex-col justify-between overflow-hidden relative ${
                isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-gray-50 border-gray-200/60'
              }`}>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-purple ${
                    isDark ? 'bg-slate-700' : 'bg-white'
                  }`}>
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                    Share Your World
                  </h3>
                  <p className={`max-w-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Post updates, images, and thoughts instantly to your network with our lightning-fast feed.
                  </p>
                </div>
                {/* Decorative Mockup */}
                <div className={`absolute right-[-10%] bottom-[-20%] w-[60%] h-[120%] rounded-tl-xl shadow-xl border p-4 transform rotate-[-5deg] motion-safe:group-hover:rotate-0 transition-transform duration-500 hidden md:block ${
                  isDark ? 'bg-slate-700 border-slate-600/50' : 'bg-white border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-brand-purple/20"></div>
                    <div className={`h-2 w-20 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
                  </div>
                  <div className={`h-2 w-full rounded mb-2 ${isDark ? 'bg-slate-600/60' : 'bg-gray-100'}`}></div>
                  <div className={`h-2 w-2/3 rounded ${isDark ? 'bg-slate-600/60' : 'bg-gray-100'}`}></div>
                </div>
              </FadeInSection>

              {/* Feature 2: Connect (Square Card) */}
              <FadeInSection delay={100} className={`rounded-3xl p-8 shadow-sm hover:shadow-md border transition-all duration-300 group relative overflow-hidden ${
                isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-gray-50 border-gray-200/60'
              }`}>
                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-teal ${
                  isDark ? 'bg-slate-700' : 'bg-white'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                  Connect
                </h3>
                <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                  Build your circle with seamless user profiles and real conversations.
                </p>
                {/* Decorative */}
                <div className="absolute bottom-4 right-4 flex -space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className={`w-10 h-10 rounded-full border-2 bg-brand-purple/40 ${isDark ? 'border-slate-800' : 'border-white'}`}></div>
                  <div className={`w-10 h-10 rounded-full border-2 bg-brand-blue/40 ${isDark ? 'border-slate-800' : 'border-white'}`}></div>
                  <div className={`w-10 h-10 rounded-full border-2 bg-brand-teal/40 ${isDark ? 'border-slate-800' : 'border-white'}`}></div>
                </div>
              </FadeInSection>

              {/* Feature 3: Discover (Square Card) */}
              <FadeInSection delay={200} className={`rounded-3xl p-8 shadow-sm hover:shadow-md border transition-all duration-300 group flex flex-col justify-between ${
                isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-gray-50 border-gray-200/60'
              }`}>
                <div>
                  <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-blue ${
                    isDark ? 'bg-slate-700' : 'bg-white'
                  }`}>
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                    Discover
                  </h3>
                  <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    Explore people, ideas, and conversations across Aequosia.
                  </p>
                </div>
                <div className="pt-4">
                  <a
                    href="https://github.com/yashsaxena15/social_media_api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-purple transition-colors group/link"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                    <span>View source on GitHub</span>
                    <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                  </a>
                </div>
              </FadeInSection>

              {/* Feature 4: Open Ecosystem (Wide Card) — dark surface preserved in both modes */}
              <FadeInSection delay={300} className={`md:col-span-2 rounded-3xl p-8 shadow-sm hover:shadow-lg border transition-all duration-300 group overflow-hidden relative ${
                isDark ? 'bg-slate-950 border-slate-700' : 'bg-gray-900 border-gray-800'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center mb-6 text-white border ${
                    isDark ? 'bg-slate-800 border-slate-600' : 'bg-gray-800 border-gray-700'
                  }`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Modern Architecture</h3>
                  <p className="text-gray-400 max-w-sm">Aequosia is an evolving platform designed around modern web standards, speed, and clean code.</p>
                </div>
              </FadeInSection>

            </div>
          </div>
        </section>

        {/* Product Showcase Section */}
        <section className={`py-24 relative overflow-hidden ${
          isDark ? 'bg-slate-950' : 'bg-gray-50'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className={`text-3xl md:text-5xl font-black mb-6 tracking-tight ${
                isDark ? 'text-slate-50' : 'text-gray-900'
              }`}>
                Focus on the conversation.
              </h2>
              <p className={`text-xl ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                Aequosia provides a distraction-free interface where your content takes center stage. Fast, responsive, and beautifully clean.
              </p>
            </FadeInSection>

            {/* The Showcase Container */}
            <FadeInSection delay={200} className="relative mx-auto max-w-5xl group perspective-[2000px]">
              {/* Decorative glow behind the mockup */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-r from-brand-purple to-brand-teal blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

              {/* Mockup Window */}
              <div className={`relative rounded-2xl shadow-2xl border overflow-hidden transform motion-safe:group-hover:-translate-y-2 transition-transform duration-500 ${
                isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200/80'
              }`}>
                {/* Window Controls */}
                <div className={`border-b px-6 py-4 flex items-center gap-2 ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                  <div className="ml-4 flex-1 hidden sm:block">
                    <div className={`mx-auto w-1/2 h-6 rounded-md border flex items-center px-3 ${
                      isDark ? 'bg-slate-700 border-slate-600/60' : 'bg-white border-gray-200/60'
                    }`}>
                      <div className={`w-3 h-3 border-2 rounded-full ${isDark ? 'border-slate-500' : 'border-gray-300'}`}></div>
                      <div className={`ml-2 h-2 w-24 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
                    </div>
                  </div>
                </div>

                {/* Interface Layout */}
                <div className={`flex h-[600px] ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
                  {/* Left Sidebar Mock */}
                  <div className={`w-64 border-r p-6 hidden lg:block ${
                    isDark ? 'border-slate-700/60 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                     <div className="mb-8">
                       <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-6 w-auto object-contain opacity-90" />
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded bg-brand-purple/20 flex-shrink-0"></div>
                          <div className={`h-4 w-20 rounded ${isDark ? 'bg-slate-300' : 'bg-gray-800'}`}></div>
                        </div>
                     </div>
                  </div>

                  {/* Main Feed Mock */}
                  <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-hidden relative">
                     <div className="max-w-2xl mx-auto space-y-6">
                        <div className={`p-4 rounded-xl shadow-sm border flex items-start gap-4 ${
                          isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'
                        }`}>
                           <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex-shrink-0"></div>
                           <div className="flex-1">
                              <div className={`h-10 w-full rounded-lg mb-3 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}></div>
                              <div className="flex justify-between items-center">
                                 <div className="flex gap-2">
                                    <div className={`w-6 h-6 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                                 </div>
                                 <div className="h-8 w-20 bg-brand-purple rounded-lg opacity-80"></div>
                              </div>
                           </div>
                        </div>
                        <div className={`p-6 rounded-xl shadow-sm border ${
                          isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'
                        }`}>
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-teal to-brand-blue flex-shrink-0"></div>
                             <div>
                                <div className={`h-4 w-32 rounded mb-2 ${isDark ? 'bg-slate-300' : 'bg-gray-800'}`}></div>
                                <div className={`h-3 w-20 rounded ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`}></div>
                             </div>
                           </div>
                           <div className="space-y-3 mb-6">
                             <div className={`h-4 w-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                           </div>
                           <div className={`h-48 sm:h-64 w-full rounded-lg mb-4 ${
                             isDark ? 'bg-slate-700/60' : 'bg-gray-100'
                           }`}></div>
                        </div>
                     </div>
                     <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t pointer-events-none ${
                       isDark ? 'from-slate-950' : 'from-gray-50'
                     } to-transparent`}></div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* How It Works Section */}
        <section className={`py-24 border-t ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-20 max-w-2xl mx-auto">
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                How Aequosia works
              </h2>
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Get started in seconds and join the conversation.
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Create account', desc: 'Sign up instantly and securely to claim your unique username.', icon: User, textClass: 'text-brand-purple', hoverClass: 'group-hover:text-brand-purple/10' },
                { step: '2', title: 'Build profile', desc: 'Set up your avatar and bio to let the network know who you are.', icon: LayoutGrid, textClass: 'text-brand-teal', hoverClass: 'group-hover:text-brand-teal/10' },
                { step: '3', title: 'Connect & share', desc: 'Start posting your thoughts and interacting with friends immediately.', icon: MessageSquare, textClass: 'text-brand-blue', hoverClass: 'group-hover:text-brand-blue/10' },
                { step: '4', title: 'Discover', desc: 'Use global search to find communities and interesting voices.', icon: Search, textClass: 'text-brand-green', hoverClass: 'group-hover:text-brand-green/10' },
              ].map((item, index) => (
                <FadeInSection key={item.step} delay={index * 100} className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group motion-safe:hover:-translate-y-2 hover:shadow-md transition-all duration-300 ${
                  isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className={`absolute -right-4 -top-6 text-9xl font-black ${item.hoverClass} transition-colors duration-500 pointer-events-none ${
                    isDark ? 'text-slate-700/50' : 'text-gray-200/50'
                  }`}>{item.step}</div>
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${item.textClass} shadow-sm motion-safe:group-hover:scale-110 transition-transform duration-300 ${
                      isDark ? 'bg-slate-700' : 'bg-white'
                    }`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{item.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={`py-24 relative overflow-hidden ${
          isDark ? 'bg-slate-900' : 'bg-white'
        }`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <FadeInSection className={`rounded-[2.5rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl border ${
              isDark ? 'bg-slate-950 border-slate-700/60' : 'bg-gray-900 border-gray-800'
            }`}>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-brand-purple to-brand-teal opacity-20 blur-[100px] pointer-events-none"></div>
               <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Your next connection is waiting.</h2>
                 <p className={`text-xl mb-10 max-w-2xl mx-auto ${
                   isDark ? 'text-slate-400' : 'text-gray-400'
                 }`}>Join a fast-growing, open community built on transparency and real connections.</p>
                 <button
                    onClick={() => openDrawer('register')}
                    className="inline-flex items-center justify-center px-10 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal motion-safe:hover:scale-105 transition-transform duration-300 shadow-xl shadow-brand-purple/20"
                 >
                   Join Aequosia
                 </button>
               </div>
            </FadeInSection>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-12 border-t ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex flex-col items-center md:items-start gap-2">
                <Link to="/" className="hover:opacity-90 transition-opacity">
                  <span className={isDark ? "bg-white/10 rounded-lg px-2 py-0.5 inline-flex items-center" : "inline-flex items-center"}>
                    <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-11 sm:h-12 w-auto object-contain" />
                  </span>
                </Link>
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  © {new Date().getFullYear()} Aequosia. Built for connection.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-8 sm:gap-12 text-center md:text-left justify-center md:justify-start">
                 <div className="flex flex-col gap-3">
                    <span className={`font-bold text-sm tracking-wider uppercase ${
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    }`}>Product</span>
                    <Link to="/feed" className={`transition-colors text-sm ${
                      isDark ? 'text-slate-400 hover:text-brand-purple' : 'text-gray-500 hover:text-brand-purple'
                    }`}>Feed</Link>
                    <Link to="/search" className={`transition-colors text-sm ${
                      isDark ? 'text-slate-400 hover:text-brand-purple' : 'text-gray-500 hover:text-brand-purple'
                    }`}>Discover</Link>
                 </div>
                 <div className="flex flex-col gap-3">
                    <span className={`font-bold text-sm tracking-wider uppercase ${
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    }`}>Project</span>
                    <a
                      href="https://github.com/yashsaxena15/social_media_api/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`transition-colors text-sm inline-flex items-center justify-center md:justify-start gap-1.5 ${
                        isDark ? 'text-slate-400 hover:text-brand-purple' : 'text-gray-500 hover:text-brand-purple'
                      }`}
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub</span>
                    </a>
                 </div>
                 <div className="flex flex-col gap-3">
                    <span className={`font-bold text-sm tracking-wider uppercase ${
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    }`}>Account</span>
                    <button
                      onClick={() => openDrawer('login')}
                      className={`transition-colors text-sm text-center md:text-left ${
                        isDark ? 'text-slate-400 hover:text-brand-purple' : 'text-gray-500 hover:text-brand-purple'
                      }`}
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => openDrawer('register')}
                      className={`transition-colors text-sm text-center md:text-left ${
                        isDark ? 'text-slate-400 hover:text-brand-purple' : 'text-gray-500 hover:text-brand-purple'
                      }`}
                    >
                      Register
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
