import { useTheme } from "../../context/ThemeContext";
import { Link } from "react-router-dom";

function AuthHeader(){
    const { isDarkMode, toggleDarkMode } = useTheme();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
            <div className="flex items-center h-16 w-full max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-gutter)] relative">
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
                        className={`material-symbols-outlined inline-block transition-all duration-300 ease-in-out ${
                            isDarkMode ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                        }`}
                        >
                            {isDarkMode ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default AuthHeader;