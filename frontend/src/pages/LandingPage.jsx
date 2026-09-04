import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Compass, Home, User, Heart, MessageSquare, Globe, Search, Users, LayoutGrid } from 'lucide-react';
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
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const openDrawer = (mode) => { setDrawerMode(mode); setDrawerOpen(true); };

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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-brand-purple/20 relative overflow-hidden">

      {/* Auth Drawer — experiment: right-sliding panel */}
      <AuthDrawer isOpen={drawerOpen} mode={drawerMode} onClose={() => setDrawerOpen(false)} />

      {/* Ambient Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[120vh] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-purple/10 rounded-full blur-[120px] mix-blend-multiply"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-teal/10 rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>

      {/* Navbar with smooth scroll transitions */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-300 ${
        isScrolled ? 'bg-white/90 shadow-sm border-b border-gray-200/50 py-3' : 'bg-white/50 border-b border-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Branding / Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-11 sm:h-12 md:h-14 w-auto object-contain" />
              </Link>
            </div>

            {/* Nav and Auth Buttons */}
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/yashsaxena15/social_media_api/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
                aria-label="Aequosia GitHub Repository"
              >
                <GithubIcon className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>

              {/* Divider pipe */}
              <span className="hidden sm:inline-block text-gray-300 font-light select-none" aria-hidden="true">
                |
              </span>

              {/* Log in → opens drawer */}
              <button
                onClick={() => openDrawer('login')}
                className="hidden sm:inline-flex text-gray-600 hover:text-brand-darkblue font-medium transition-colors"
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
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-xs mb-8 hover:border-gray-300 transition-colors">
              <img src="/aequosia-a-icon.png" alt="Aequosia" className="w-6 h-6 rounded-lg object-contain shadow-2xs" />
              <span className="text-xs sm:text-sm font-bold tracking-wider bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green text-transparent bg-clip-text uppercase">
                People · Ideas · Together
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 drop-shadow-sm">
              Social, <span className="bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green text-transparent bg-clip-text">reimagined.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed font-light">
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
              {/* Sign In → opens login drawer */}
              <button
                onClick={() => openDrawer('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-gray-200 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm text-lg font-bold text-gray-700 hover:bg-white hover:border-gray-300 transition-colors duration-300"
              >
                Sign In
              </button>
            </div>
          </FadeInSection>

          {/* 3D Product Preview Mockup */}
          <FadeInSection delay={200} className="w-full max-w-5xl mx-auto mt-20 mb-10 perspective-[2000px]">
            <div 
              className="w-full bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-200/60 overflow-hidden transition-all duration-1000 ease-out"
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
              <div className="bg-gray-100/80 border-b border-gray-200 px-4 py-3 flex items-center gap-2 backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              
              {/* Mock App Layout */}
              <div className="flex h-[450px] md:h-[600px] bg-gray-50">
                {/* Mock Sidebar */}
                <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col py-6 px-4">
                  <div className="mb-8 px-2">
                    <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-7 w-auto object-contain" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg text-brand-purple font-bold">
                      <Home className="w-5 h-5" /> <span>Home</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 text-gray-500 rounded-lg">
                      <Compass className="w-5 h-5" /> <span>Search</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 text-gray-500 rounded-lg">
                      <User className="w-5 h-5" /> <span>Profile</span>
                    </div>
                  </div>
                </div>

                {/* Mock Feed */}
                <div className="flex-1 p-4 md:p-8 overflow-hidden relative">
                  <div className="max-w-xl mx-auto space-y-6">
                    {/* Post 1 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-purple to-brand-teal"></div>
                        <div>
                          <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="h-4 w-full bg-gray-100 rounded"></div>
                        <div className="h-4 w-4/5 bg-gray-100 rounded"></div>
                      </div>
                      <div className="flex gap-4 border-t border-gray-50 pt-3 text-gray-400">
                        <Heart className="w-5 h-5" />
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Post 2 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 w-20 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="h-40 w-full bg-gray-100 rounded-lg mb-4"></div>
                    </div>
                  </div>

                  {/* Fade out bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* Bento Grid Feature Section */}
        <section className="py-24 bg-white relative z-10 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need. Nothing you don't.</h2>
              <p className="text-lg text-gray-500">A clean, modern foundation built for sharing what matters and discovering new voices, without the algorithm noise.</p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
              
              {/* Feature 1: Share (Wide Card) */}
              <FadeInSection delay={0} className="md:col-span-2 bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-md border border-gray-200/60 transition-all duration-300 group flex flex-col justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-purple">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Share Your World</h3>
                  <p className="text-gray-600 max-w-sm">Post updates, images, and thoughts instantly to your network with our lightning-fast feed.</p>
                </div>
                {/* Decorative Mockup */}
                <div className="absolute right-[-10%] bottom-[-20%] w-[60%] h-[120%] bg-white rounded-tl-xl shadow-xl border border-gray-200/50 p-4 transform rotate-[-5deg] motion-safe:group-hover:rotate-0 transition-transform duration-500 hidden md:block">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-brand-purple/20"></div>
                    <div className="h-2 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded mb-2"></div>
                  <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
                </div>
              </FadeInSection>

              {/* Feature 2: Connect (Square Card) */}
              <FadeInSection delay={100} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-md border border-gray-200/60 transition-all duration-300 group relative overflow-hidden">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-teal">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Connect</h3>
                <p className="text-gray-600">Build your circle with seamless user profiles and real conversations.</p>
                {/* Decorative */}
                <div className="absolute bottom-4 right-4 flex -space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-purple/40"></div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-blue/40"></div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-teal/40"></div>
                </div>
              </FadeInSection>

              {/* Feature 3: Discover (Square Card) */}
              <FadeInSection delay={200} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-md border border-gray-200/60 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-brand-blue">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Discover</h3>
                  <p className="text-gray-600">Explore people, ideas, and conversations across Aequosia.</p>
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

              {/* Feature 4: Open Ecosystem (Wide Card) */}
              <FadeInSection delay={300} className="md:col-span-2 bg-gray-900 rounded-3xl p-8 shadow-sm hover:shadow-lg border border-gray-800 transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl shadow-sm flex items-center justify-center mb-6 text-white border border-gray-700">
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
        <section className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Focus on the conversation.</h2>
              <p className="text-xl text-gray-600">Aequosia provides a distraction-free interface where your content takes center stage. Fast, responsive, and beautifully clean.</p>
            </FadeInSection>

            {/* The Showcase Container */}
            <FadeInSection delay={200} className="relative mx-auto max-w-5xl group perspective-[2000px]">
              {/* Decorative elements behind the mockup */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-r from-brand-purple to-brand-teal blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

              {/* Mockup Window */}
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden transform motion-safe:group-hover:-translate-y-2 transition-transform duration-500">
                {/* Window Controls */}
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="ml-4 flex-1 hidden sm:block">
                    <div className="mx-auto w-1/2 h-6 bg-white rounded-md border border-gray-200/60 flex items-center px-3">
                      <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
                      <div className="ml-2 h-2 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Interface Layout */}
                <div className="flex h-[600px] bg-gray-50">
                  {/* Left Sidebar Mock */}
                  <div className="w-64 border-r border-gray-200 bg-white p-6 hidden lg:block">
                     <div className="mb-8">
                       <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-6 w-auto object-contain opacity-90" />
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded bg-brand-purple/20 flex-shrink-0"></div>
                          <div className="h-4 w-20 bg-gray-800 rounded"></div>
                        </div>
                     </div>
                  </div>

                  {/* Main Feed Mock */}
                  <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-hidden relative">
                     <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                           <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex-shrink-0"></div>
                           <div className="flex-1">
                              <div className="h-10 w-full bg-gray-50 rounded-lg mb-3"></div>
                              <div className="flex justify-between items-center">
                                 <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded bg-gray-100"></div>
                                 </div>
                                 <div className="h-8 w-20 bg-brand-purple rounded-lg opacity-80"></div>
                              </div>
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-teal to-brand-blue flex-shrink-0"></div>
                             <div>
                                <div className="h-4 w-32 bg-gray-800 rounded mb-2"></div>
                                <div className="h-3 w-20 bg-gray-400 rounded"></div>
                             </div>
                           </div>
                           <div className="space-y-3 mb-6">
                             <div className="h-4 w-full bg-gray-200 rounded"></div>
                           </div>
                           <div className="h-48 sm:h-64 w-full bg-gray-100 rounded-lg mb-4"></div>
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection className="text-center mb-20 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Aequosia works</h2>
              <p className="text-lg text-gray-500">Get started in seconds and join the conversation.</p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Create account', desc: 'Sign up instantly and securely to claim your unique username.', icon: User, textClass: 'text-brand-purple', hoverClass: 'group-hover:text-brand-purple/10' },
                { step: '2', title: 'Build profile', desc: 'Set up your avatar and bio to let the network know who you are.', icon: LayoutGrid, textClass: 'text-brand-teal', hoverClass: 'group-hover:text-brand-teal/10' },
                { step: '3', title: 'Connect & share', desc: 'Start posting your thoughts and interacting with friends immediately.', icon: MessageSquare, textClass: 'text-brand-blue', hoverClass: 'group-hover:text-brand-blue/10' },
                { step: '4', title: 'Discover', desc: 'Use global search to find communities and interesting voices.', icon: Search, textClass: 'text-brand-green', hoverClass: 'group-hover:text-brand-green/10' },
              ].map((item, index) => (
                <FadeInSection key={item.step} delay={index * 100} className={`bg-gray-50 rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group motion-safe:hover:-translate-y-2 hover:shadow-md transition-all duration-300`}>
                  <div className={`absolute -right-4 -top-6 text-9xl font-black text-gray-200/50 ${item.hoverClass} transition-colors duration-500 pointer-events-none`}>{item.step}</div>
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-6 ${item.textClass} shadow-sm motion-safe:group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <FadeInSection className="bg-gray-900 rounded-[2.5rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl border border-gray-800">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-brand-purple to-brand-teal opacity-20 blur-[100px] pointer-events-none"></div>
               <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Your next connection is waiting.</h2>
                 <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Join a fast-growing, open community built on transparency and real connections.</p>
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

        {/* Refined Footer */}
        <footer className="bg-gray-50 py-12 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex flex-col items-center md:items-start gap-2">
                <Link to="/" className="hover:opacity-90 transition-opacity">
                  <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-11 sm:h-12 w-auto object-contain" />
                </Link>
                <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Aequosia. Built for connection.</p>
              </div>
              
              <div className="flex flex-wrap gap-8 sm:gap-12 text-center md:text-left justify-center md:justify-start">
                 <div className="flex flex-col gap-3">
                    <span className="font-bold text-gray-900 text-sm tracking-wider uppercase">Product</span>
                    <Link to="/feed" className="text-gray-500 hover:text-brand-purple transition-colors text-sm">Feed</Link>
                    <Link to="/search" className="text-gray-500 hover:text-brand-purple transition-colors text-sm">Discover</Link>
                 </div>
                 <div className="flex flex-col gap-3">
                    <span className="font-bold text-gray-900 text-sm tracking-wider uppercase">Project</span>
                    <a
                      href="https://github.com/yashsaxena15/social_media_api/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-brand-purple transition-colors text-sm inline-flex items-center justify-center md:justify-start gap-1.5"
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub</span>
                    </a>
                 </div>
                 <div className="flex flex-col gap-3">
                    <span className="font-bold text-gray-900 text-sm tracking-wider uppercase">Account</span>
                    <button
                      onClick={() => openDrawer('login')}
                      className="text-gray-500 hover:text-brand-purple transition-colors text-sm text-center md:text-left"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => openDrawer('register')}
                      className="text-gray-500 hover:text-brand-purple transition-colors text-sm text-center md:text-left"
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
