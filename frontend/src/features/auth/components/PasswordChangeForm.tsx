import { useState } from 'react';
import { Link } from 'react-router-dom';

function PasswordChangeForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    setIsChanging(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsChanging(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-[var(--spacing-gutter)] py-16 relative overflow-hidden">
      {/* Background Atmospheric Element */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-fixed blur-[100px] rounded-full"></div>
      </div>

      <div className="z-10 w-full max-w-[480px]">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-headline-lg font-bold text-on-surface mb-2">Change Password</h1>
            <p className="text-body-md text-on-surface-variant">Update your password to keep your account secure.</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleChange}>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-label-md font-semibold text-on-surface-variant" htmlFor="old-password">Old Password</label>
                <Link className="text-primary text-label-sm hover:underline font-semibold" to="/reset-password">Forgot Password?</Link>
              </div>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-4 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  id="old-password" 
                  placeholder="Enter current password" 
                  required 
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer" 
                  onClick={() => setShowOldPassword(!showOldPassword)} 
                  type="button"
                  aria-label="Toggle old password visibility"
                >
                  <span className="material-symbols-outlined text-[20px]">{showOldPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            
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
            
            <div className="pt-4">
              <button 
                className={`w-full text-label-md font-bold py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${
                  isSuccess ? 'bg-on-tertiary-fixed-variant text-white' : 'bg-primary-container text-on-primary-container'
                }`} 
                type="submit"
                disabled={isChanging || isSuccess}
              >
                {isChanging ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span> Updating...
                  </>
                ) : isSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check</span> Password Changed
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
              
              {isSuccess && (
                <div className="mt-6 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                  <Link to="/account-settings" className="inline-flex items-center gap-1 text-label-md font-bold text-primary hover:underline">
                    Return to Account Settings
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default PasswordChangeForm;