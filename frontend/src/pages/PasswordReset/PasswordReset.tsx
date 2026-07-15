import { useState } from 'react';
import { Link } from 'react-router-dom';

function PasswordReset() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsResetting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      {/* Top Bar (Minimal Branding for Transactional Flows) */}
      <header className="bg-surface border-b border-outline-variant h-16 w-full px-[var(--spacing-gutter)] flex items-center sticky top-0 z-50 justify-center">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            Urlify
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-[var(--spacing-gutter)] py-16 relative overflow-hidden">
        {/* Background Atmospheric Element */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-fixed blur-[100px] rounded-full"></div>
        </div>
        
        <div className="z-10 w-full max-w-[480px]">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-headline-lg font-bold text-on-surface mb-2">Set New Password</h1>
              <p className="text-body-md text-on-surface-variant">Ensure your account is secure with a strong, unique password.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleReset}>
              <div className="space-y-2">
                <label className="block text-label-md font-semibold text-on-surface-variant" htmlFor="new-password">New Password</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-4 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                    id="new-password" 
                    placeholder="Min. 12 characters" 
                    required 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    type="button"
                    aria-label="Toggle new password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-label-md font-semibold text-on-surface-variant" htmlFor="confirm-password">Confirm New Password</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-4 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                    id="confirm-password" 
                    placeholder="Repeat password" 
                    required 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    type="button"
                    aria-label="Toggle confirm password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  className={`w-full text-label-md font-bold py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${
                    isSuccess ? 'bg-on-tertiary-fixed-variant text-white' : 'bg-primary-container text-on-primary-container'
                  }`} 
                  type="submit"
                  disabled={isResetting || isSuccess}
                >
                  {isResetting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span> Resetting...
                    </>
                  ) : isSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check</span> Password Updated
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
                
                {isSuccess && (
                  <div className="mt-6 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <Link to="/login" className="inline-flex items-center gap-1 text-label-md font-bold text-primary hover:underline">
                      Return to Login
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                )}
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant w-full mt-auto">
        <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-gutter)] py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:items-start items-center">
            <span className="text-label-md font-bold text-primary mb-1">Urlify</span>
            <p className="text-label-sm text-on-surface-variant text-center md:text-left">© 2026 Urlify. All rights reserved.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-8">
            <a className="text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default PasswordReset;