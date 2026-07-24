import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../authModule';

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Ref to prevent double-firing of useEffect in React 18 StrictMode
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    hasAttempted.current = true;

    authService.verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err?.response?.data?.message || 'Verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 w-full h-full">
      {status === 'loading' && (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <div className="w-16 h-16 border-4 border-outline-variant border-t-primary rounded-full animate-spin mb-6"></div>
          <h2 className="text-title-lg font-bold text-on-surface">Verifying Email...</h2>
          <p className="text-body-md text-on-surface-variant mt-2 text-center">Please wait while we verify your email address.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm max-w-md w-full text-center animate-in zoom-in-95 fade-in duration-300">
          <span className="material-symbols-outlined text-[64px] text-green-500 mb-4">check_circle</span>
          <h2 className="text-headline-sm font-bold text-on-surface mb-2">Email Verified!</h2>
          <p className="text-body-md text-on-surface-variant mb-8">
            Your email has been successfully verified. You can now access all features of your account.
          </p>
          <Link to="/" className="bg-primary hover:bg-primary/90 text-on-primary font-bold px-8 py-3 rounded-full transition-colors w-full inline-block">
            Go to Homepage
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center bg-surface-container-lowest p-8 rounded-2xl border border-error shadow-sm max-w-md w-full text-center animate-in zoom-in-95 fade-in duration-300">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">error</span>
          <h2 className="text-headline-sm font-bold text-on-surface mb-2">Verification Failed</h2>
          <p className="text-body-md text-on-surface-variant mb-8">
            {errorMessage}
          </p>
          <Link to="/" className="bg-primary hover:bg-primary/90 text-on-primary font-bold px-8 py-3 rounded-full transition-colors w-full inline-block">
            Return to Homepage
          </Link>
        </div>
      )}
    </div>
  );
}

export default EmailVerification;