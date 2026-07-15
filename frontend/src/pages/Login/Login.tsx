import { useState } from 'react';
import { Link } from 'react-router-dom';

function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* Top Bar (Minimal Branding for Transactional Flows) */}
      <header className="bg-surface border-b border-outline-variant h-16 w-full sticky top-0 z-50">
        <div className="flex items-center h-full w-full px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto justify-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary cursor-pointer">Urlify</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-[var(--spacing-gutter)] py-16">
        {/* Breadcrumbs */}
        <nav className="w-full max-w-[480px] mb-8">
          <ol className="flex items-center gap-2 text-label-md">
            <li><Link className="text-primary hover:underline font-semibold" to="/">Home</Link></li>
            <li className="text-outline-variant">/</li>
            <li className="text-on-surface font-bold">Login</li>
          </ol>
        </nav>

        <div className="w-full max-w-[480px]">
          {/* Login Card */}
          <div className="form-card bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-sm border border-outline-variant/30">
            <div className="mb-8">
              <h1 className="text-headline-lg font-bold text-on-surface mb-2">Welcome back</h1>
              <p className="text-body-md text-on-surface-variant">Log in to manage your short links.</p>
            </div>
            
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* Email Address */}
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-label-md font-semibold text-on-surface">Email Address</label>
                <input 
                  type="email" 
                  id="login-email" 
                  placeholder="name@company.com" 
                  className="w-full px-4 py-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password" className="block text-label-md font-semibold text-on-surface">Password</label>
                  <Link className="text-primary text-label-sm hover:underline font-semibold" to="/reset-password">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    id="login-password" 
                    placeholder="••••••••" 
                    className="w-full pl-4 pr-12 py-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                    required
                  />
                  <button 
                    type="button" 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center cursor-pointer" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Primary CTA */}
              <button 
                type="submit" 
                className="w-full py-4 rounded-lg text-label-md text-white font-bold flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 transition-colors active:scale-[0.98] cursor-pointer"
              >
                Sign In
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-outline-variant text-center">
              <p className="text-label-md text-on-surface-variant">
                Not registered? <Link to="/register" className="text-primary font-bold hover:underline">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
        <div className="w-full py-8 px-[var(--spacing-gutter)] flex flex-col md:flex-row justify-between items-center max-w-[var(--spacing-container-max)] mx-auto gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-label-md font-bold text-primary">Urlify</span>
            <p className="text-label-sm text-on-surface-variant">© 2026 Urlify Inc. Reliable. Tech-forward. Frictionless.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link to="/privacy" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/api-docs" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">API Docs</Link>
            <Link to="/support" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Login;