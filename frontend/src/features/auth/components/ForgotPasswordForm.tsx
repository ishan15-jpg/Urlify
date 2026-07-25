import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSendResetLink } from '../hooks/useSendResetLink';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const { mutation } = useSendResetLink();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      mutation.mutate(email);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center px-[var(--spacing-gutter)] py-16 relative overflow-hidden">
      {/* Background Atmospheric Element */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-fixed blur-[100px] rounded-full"></div>
      </div>
      
      <div className="z-10 w-full max-w-[480px]">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-headline-lg font-bold text-on-surface mb-2">Forgot Password?</h1>
            <p className="text-body-md text-on-surface-variant">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-label-md font-semibold text-on-surface-variant" htmlFor="email">Email Address</label>
              <input 
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-4 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="pt-4">
              <button 
                className={`w-full text-label-md font-bold py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2 bg-primary-container text-on-primary-container disabled:opacity-50 disabled:cursor-not-allowed`} 
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span> Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
              
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-label-md font-bold text-primary hover:underline">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to Login
                </Link>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default ForgotPasswordForm;
