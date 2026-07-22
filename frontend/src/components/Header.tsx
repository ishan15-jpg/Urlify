import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../store/ThemeContext';
import { useAuthentication } from '../store/AuthenticationContext';
import { useLogout } from '../features/auth/hooks/useLogout';


function Header() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthentication();
  const { onClick: handleLogout } = useLogout();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
      <section className="flex items-center h-16 w-full max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-gutter)] relative">
        {/* Center: Brand */}
        <div className="sm:absolute sm:left-0 md:absolute md:left-1/2 md:-translate-x-1/2">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            Urlify
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="absolute right-0 -translate-x-1/2 flex items-center gap-4">
          <button
            className="text-on-surface-variant hover:text-primary cursor-pointer active:scale-95"
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
          >
            <span
              className={`material-symbols-outlined inline-block transition-all duration-300 ease-in-out ${isDarkMode ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                }`}
            >
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          {/* Account button + dropdown */}
          <div className="relative group">
            <button
              className="flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95"
              aria-label="Account"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setAccountMenuOpen(!accountMenuOpen);
                }
              }}
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>

            {/* Invisible overlay to close menu (mobile only) */}
            {accountMenuOpen && (
              <div
                className="fixed inset-0 z-40 md:hidden"
                onClick={() => setAccountMenuOpen(false)}
              />
            )}

            {/* Dropdown menu */}
            <div
              className={`absolute right-0 top-[100%] pt-2 w-44 z-50 origin-top-right transition-all duration-200 ease-out md:group-hover:opacity-100 md:group-hover:scale-100 md:group-hover:pointer-events-auto ${accountMenuOpen
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none md:opacity-0 md:scale-95 md:pointer-events-none'
                }`}
            >
              <div className="bg-surface-container-low border border-outline-variant rounded-lg shadow-lg overflow-hidden flex flex-col">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/account-settings"
                      className="block w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      Account
                    </Link>
                    <button
                      className="block w-full text-left px-4 py-3 text-body-md text-error hover:bg-surface-container-high transition-colors cursor-pointer"
                      onClick={e => {
                        setAccountMenuOpen(false);
                        handleLogout(e);
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}

export default Header;
