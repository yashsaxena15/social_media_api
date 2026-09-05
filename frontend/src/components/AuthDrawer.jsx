import React, { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import { X, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------------------------------
// AuthDrawer — a right-sliding panel experiment for the landing page.
// Auth logic is 100% delegated to AuthContext.login / AuthContext.register.
// No API calls or duplicate validation exist here.
// ---------------------------------------------------------------------------

const TRANSITION_MS = 380;

const AuthDrawer = ({ isOpen, mode: initialMode, onClose, isDark = false }) => {
  const { login, register } = useContext(AuthContext);

  const [mode, setMode]             = useState(initialMode || "login");
  const [isVisible, setIsVisible]   = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Login form state
  const [loginData, setLoginData]       = useState({ username: "", password: "" });
  const [showLoginPw, setShowLoginPw]   = useState(false);
  const [loginError, setLoginError]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regData, setRegData]       = useState({ username: "", email: "", password: "", bio: "", dob: "", gender: "" });
  const [showRegPw, setShowRegPw]   = useState(false);
  const [regError, setRegError]     = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const effectiveTransition = prefersReducedMotion ? 0 : TRANSITION_MS;

  // Sync mode when parent changes initialMode
  useEffect(() => {
    if (isOpen) setMode(initialMode || "login");
  }, [initialMode, isOpen]);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      document.body.style.overflow = "hidden";
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = "";
      }, effectiveTransition);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, effectiveTransition]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Reset errors + form when switching modes
  const switchMode = (newMode) => {
    setLoginError(""); setRegError("");
    setLoginData({ username: "", password: "" });
    setRegData({ username: "", email: "", password: "", bio: "", dob: "", gender: "" });
    setMode(newMode);
  };

  // Login submit — delegates entirely to AuthContext.login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const result = await login(loginData.username, loginData.password);
    setLoginLoading(false);
    if (!result.success) setLoginError(result.message);
    // On success, AuthContext.login navigates to /feed automatically
  };

  // Register submit — delegates entirely to AuthContext.register
  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    const result = await register(regData);
    setRegLoading(false);
    if (!result.success) setRegError(result.message);
    // On success, AuthContext.register auto-logs in and navigates to /feed
  };

  if (!isVisible) return null;

  const panelStyle = {
    transform: isAnimating ? "translateX(0)" : "translateX(100%)",
    transition: prefersReducedMotion
      ? "none"
      : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };
  const backdropStyle = {
    opacity: isAnimating ? 1 : 0,
    transition: prefersReducedMotion
      ? "none"
      : `opacity ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };

  // Dark-aware class helpers (not using Tailwind dark: since this component
  // is rendered outside the LandingPage .dark root in the DOM portal sense,
  // but it IS a descendant, so dark: classes work fine here too).
  const panelBg    = isDark ? "bg-slate-900"  : "bg-white";
  const headingCls = isDark ? "text-slate-50"  : "text-gray-900";
  const subCls     = isDark ? "text-slate-400" : "text-gray-500";
  const closeBtnCls = isDark
    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800";
  const inputCls = isDark
    ? "w-full px-3 py-2.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-colors"
    : "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-colors";
  const labelCls = isDark ? "block text-sm font-medium text-slate-300 mb-1.5" : "block text-sm font-medium text-gray-700 mb-1.5";
  const errCls   = isDark
    ? "bg-red-950/60 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg mb-6"
    : "bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6";
  const switchLinkCls = isDark
    ? "text-brand-lightblue font-semibold hover:text-brand-teal transition-colors"
    : "text-brand-blue font-semibold hover:text-brand-purple transition-colors";
  const switchTextCls = isDark ? "text-slate-400" : "text-gray-600";
  const eyeCls = isDark
    ? "absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 transition-colors"
    : "absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        style={backdropStyle}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <div
        className={`relative w-full sm:w-[440px] lg:w-[480px] ${panelBg} h-full shadow-2xl flex flex-col overflow-y-auto transition-colors duration-300`}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 flex-shrink-0">
          <span className={isDark ? "bg-white/10 rounded-lg px-2 py-0.5 inline-flex items-center" : "inline-flex items-center"}>
            <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-10 sm:h-11 w-auto object-contain" />
          </span>
          <button
            onClick={onClose}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${closeBtnCls}`}
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gradient accent line */}
        <div className="h-[2px] bg-gradient-to-r from-brand-purple via-brand-blue to-brand-teal mx-8 rounded-full mb-8 flex-shrink-0" />

        {/* Form */}
        <div className="flex-1 px-8 pb-8">
          {mode === "login" ? (
            <LoginForm
              formData={loginData} setFormData={setLoginData}
              showPassword={showLoginPw} setShowPassword={setShowLoginPw}
              error={loginError} loading={loginLoading}
              onSubmit={handleLoginSubmit}
              onSwitchMode={() => switchMode("register")}
              headingCls={headingCls} subCls={subCls}
              inputCls={inputCls} labelCls={labelCls}
              errCls={errCls} eyeCls={eyeCls}
              switchLinkCls={switchLinkCls} switchTextCls={switchTextCls}
            />
          ) : (
            <RegisterForm
              formData={regData} setFormData={setRegData}
              showPassword={showRegPw} setShowPassword={setShowRegPw}
              error={regError} loading={regLoading}
              onSubmit={handleRegSubmit}
              onSwitchMode={() => switchMode("login")}
              headingCls={headingCls} subCls={subCls}
              inputCls={inputCls} labelCls={labelCls}
              errCls={errCls} eyeCls={eyeCls}
              switchLinkCls={switchLinkCls} switchTextCls={switchTextCls}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// -- Login Form -------------------------------------------------------------
const LoginForm = ({
  formData, setFormData, showPassword, setShowPassword,
  error, loading, onSubmit, onSwitchMode,
  headingCls, subCls, inputCls, labelCls, errCls, eyeCls, switchLinkCls, switchTextCls,
}) => {
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${headingCls}`}>Welcome back</h2>
      <p className={`text-sm mb-8 ${subCls}`}>Sign in to your Aequosia account.</p>
      {error && <div className={errCls}>{error}</div>}
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required autoFocus placeholder="your_username" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeCls} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-2">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className={`mt-6 text-center text-sm ${switchTextCls}`}>
        {"Don't have an account? "}
        <button onClick={onSwitchMode} className={switchLinkCls}>Register</button>
      </p>
    </div>
  );
};

// -- Register Form ----------------------------------------------------------
const RegisterForm = ({
  formData, setFormData, showPassword, setShowPassword,
  error, loading, onSubmit, onSwitchMode,
  headingCls, subCls, inputCls, labelCls, errCls, eyeCls, switchLinkCls, switchTextCls,
}) => {
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${headingCls}`}>Create account</h2>
      <p className={`text-sm mb-8 ${subCls}`}>Join Aequosia and start connecting.</p>
      {error && <div className={errCls}>{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required autoFocus placeholder="choose_a_username" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeCls} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Date of Birth <span className={subCls + " font-normal"}>(optional)</span>
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Gender <span className={subCls + " font-normal"}>(optional)</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Bio <span className={subCls + " font-normal"}>(optional)</span></label>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={2} placeholder="Tell the community a little about yourself…" className={`${inputCls} resize-none`} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-1">
          {loading ? "Creating account…" : "Join Aequosia"}
        </button>
      </form>
      <p className={`mt-6 text-center text-sm ${switchTextCls}`}>
        {"Already have an account? "}
        <button onClick={onSwitchMode} className={switchLinkCls}>Log in</button>
      </p>
    </div>
  );
};

export default AuthDrawer;
