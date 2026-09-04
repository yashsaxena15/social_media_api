import React, { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import { X, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------------------------------
// AuthDrawer — a right-sliding panel experiment for the landing page.
// Auth logic is 100% delegated to AuthContext.login / AuthContext.register.
// No API calls or duplicate validation exist here.
// ---------------------------------------------------------------------------

const TRANSITION_MS = 380;

const AuthDrawer = ({ isOpen, mode: initialMode, onClose }) => {
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
  const [regData, setRegData]       = useState({ username: "", email: "", password: "", bio: "" });
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
    setRegData({ username: "", email: "", password: "", bio: "" });
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
        className="relative w-full sm:w-[440px] lg:w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 flex-shrink-0">
          <img src="/aequosia-logo-horizontal.png" alt="Aequosia" className="h-10 sm:h-11 w-auto object-contain" />
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
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
            />
          ) : (
            <RegisterForm
              formData={regData} setFormData={setRegData}
              showPassword={showRegPw} setShowPassword={setShowRegPw}
              error={regError} loading={regLoading}
              onSubmit={handleRegSubmit}
              onSwitchMode={() => switchMode("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// -- Shared styles ---------------------------------------------------------
const inputClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm " +
  "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 " +
  "focus:border-brand-purple transition-colors";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

// -- Login Form -------------------------------------------------------------
const LoginForm = ({ formData, setFormData, showPassword, setShowPassword, error, loading, onSubmit, onSwitchMode }) => {
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-8">Sign in to your Aequosia account.</p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required autoFocus placeholder="your_username" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-2">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        {"Don't have an account? "}
        <button onClick={onSwitchMode} className="text-brand-blue font-semibold hover:text-brand-purple transition-colors">Register</button>
      </p>
    </div>
  );
};

// -- Register Form ----------------------------------------------------------
const RegisterForm = ({ formData, setFormData, showPassword, setShowPassword, error, loading, onSubmit, onSwitchMode }) => {
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-8">Join Aequosia and start connecting.</p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required autoFocus placeholder="choose_a_username" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelClass}>Bio <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} placeholder="Tell the community a little about yourself…" className={`${inputClass} resize-none`} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-1">
          {loading ? "Creating account…" : "Join Aequosia"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        {"Already have an account? "}
        <button onClick={onSwitchMode} className="text-brand-blue font-semibold hover:text-brand-purple transition-colors">Log in</button>
      </p>
    </div>
  );
};

export default AuthDrawer;
