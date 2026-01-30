import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { Sun, Moon, Languages, BookOpen, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, language, toggleLanguage, highContrast, toggleContrast } = useAccessibility();

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  const getHomeLink = () => {
    if (!user) return '/';
    if (user.role === 'STUDENT') return '/student/dashboard';
    if (user.role === 'SCRIBE') return '/scribe/dashboard';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    return '/';
  };

  // High Contrast Styles
  const navClass = highContrast ? "bg-black border-b border-yellow-400 text-yellow-400" : "bg-white border-b border-slate-200 text-slate-900 shadow-sm";
  const btnClass = highContrast ? "bg-yellow-400 text-black border border-yellow-400 font-bold focus:ring-yellow-500" : "bg-primary text-white hover:bg-primary-dark focus:ring-primary";

  // Common focus styles for accessibility
  const focusClass = "focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg";

  return (
    <nav 
      className={`px-6 py-3 sticky top-0 z-50 transition-colors duration-300 ${navClass}`}
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* --- 1. Smart Logo Redirect --- */}
        <Link 
          to={getHomeLink()} 
          className={`flex items-center gap-2 group ${focusClass} focus:ring-blue-500`}
          aria-label="ScribePortal Home"
        >
          <div className={`p-2 rounded-xl transition-colors ${highContrast ? 'bg-yellow-400 text-black' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
            <BookOpen size={24} aria-hidden="true" />
          </div>
          <span className={`text-xl font-bold tracking-tight ${highContrast ? 'text-yellow-400' : 'bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700'}`}>
            ScribePortal
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Accessibility Controls Group */}
          <div 
            className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg dark:bg-slate-800"
            role="group" 
            aria-label="Site Accessibility Settings"
          >
            <button 
                onClick={toggleLanguage} 
                className={`flex items-center gap-1 font-bold text-xs uppercase px-2 py-1 rounded hover:bg-white transition-all shadow-sm ${focusClass} focus:ring-slate-400`}
                title="Switch Language"
                aria-label={language === 'en' ? "Switch to Hindi" : "Switch to English"}
            >
                <Languages size={14} aria-hidden="true" /> 
                <span aria-hidden="true">{language === 'en' ? 'HI' : 'EN'}</span>
            </button>
            <button 
                onClick={toggleContrast} 
                className={`p-1 rounded hover:bg-white transition-all shadow-sm ${focusClass} focus:ring-slate-400`}
                title="Toggle High Contrast"
                aria-label={highContrast ? "Disable High Contrast Mode" : "Enable High Contrast Mode"}
            >
                {highContrast ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>
          </div>

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="font-bold text-sm leading-tight">
                  {t.nav.welcome} {user.first_name}
                </span>
                <span 
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${highContrast ? 'bg-yellow-400 text-black' : 'bg-slate-200 text-slate-600'}`}
                  aria-label={`User Role: ${user.role}`}
                >
                  {user.role}
                </span>
              </div>
              
              <button 
                onClick={handleLogout} 
                className={`p-2 rounded-lg transition-colors ${focusClass} focus:ring-red-500 ${highContrast ? 'hover:bg-yellow-900 text-yellow-400' : 'text-slate-500 hover:bg-slate-100 hover:text-red-600'}`}
                title={t.nav.logout}
                aria-label="Log Out"
              >
                <LogOut size={20} aria-hidden="true" />
              </button>
            </div>
          ) : (
             <div className="flex gap-3">
               <Link 
                 to="/login" 
                 className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${focusClass} focus:ring-slate-400 ${highContrast ? 'text-yellow-400 hover:underline' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 {t.nav.login}
               </Link>
               <Link 
                 to="/register-select" 
                 className={`px-4 py-2 text-sm rounded-lg shadow-md transition-transform active:scale-95 ${focusClass} ${btnClass}`}
               >
                 {language === 'en' ? 'Register' : 'रजिस्टर'}
               </Link>
             </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;