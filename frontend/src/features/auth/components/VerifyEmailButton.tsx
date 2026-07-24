import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../authModule';

interface VerifyEmailButtonProps {
  email: string;
  disabled?: boolean;
}

export default function VerifyEmailButton({ email, disabled }: VerifyEmailButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleVerifyEmail = async () => {
    try {
      setIsPending(true);
      await authService.sendEmailVerificationLink({ email });
      toast.success('Verification email sent successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleVerifyEmail}
      disabled={disabled || isPending}
      className={`flex items-center justify-center gap-2 bg-primary text-on-primary font-bold max-[500px]:flex-1 max-[500px]:px-4 max-[500px]:py-3 max-[500px]:text-xs px-8 py-4 rounded-lg hover:bg-primary/90 transition-all active:scale-95 ${(disabled || isPending) ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {isPending ? (
        <div className="w-5 h-5 max-[500px]:w-4 max-[500px]:h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
      ) : (
        <span className="material-symbols-outlined text-[20px] max-[500px]:text-[16px]">
          mark_email_read
        </span>
      )}
      {isPending ? 'Sending...' : 'Verify Email'}
    </button>
  );
}
