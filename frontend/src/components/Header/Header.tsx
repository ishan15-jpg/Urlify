import { useState } from 'react';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
      <div className="flex justify-between items-center h-16 w-full max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-gutter)] relative">
        {/* Left: Hamburger */}
        <button
          className="hidden sm:inline-flex text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Center: Brand */}
        <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <span className="text-headline-md font-bold tracking-tight text-primary">
            Urlify
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            className="text-on-surface-variant hover:text-primary cursor-pointer active:scale-95"
            aria-label="Toggle dark mode"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            <span
              className={`material-symbols-outlined inline-block transition-all duration-300 ease-in-out ${
                isDarkMode ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
              }`}
            >
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          {/* Account button + dropdown */}
          <div className="relative md:hidden">
            <button
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95"
              aria-label="Account"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>

            {/* Invisible overlay to close menu */}
            {accountMenuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAccountMenuOpen(false)}
              />
            )}

            {/* Dropdown menu */}
            <div
              className={`absolute right-0 top-full mt-2 w-44 bg-surface-container-low border border-outline-variant rounded-lg shadow-lg z-50 origin-top-right transition-all duration-200 ease-out ${
                accountMenuOpen
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <button className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high rounded-t-lg transition-colors cursor-pointer">
                Account
              </button>
              <button className="w-full text-left px-4 py-3 text-body-md text-error hover:bg-surface-container-high rounded-b-lg transition-colors cursor-pointer">
                Logout
              </button>
            </div>
          </div>

          {/* Account button for md+ (no dropdown) */}
          <button
            className="hidden md:inline-flex text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95"
            aria-label="Account"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
