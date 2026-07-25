import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authService } from '../authModule';
import { useNavigate } from 'react-router-dom';

export const useSendResetLink = () => {
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (email: string) => authService.forgotPassword({ email }),
        onSuccess: () => {
            toast.success('Password Reset Link sent to your email.');
            navigate('/login');
        },
        onError: () => {
            toast.error('Failed to send reset link. Please try again or check if the email exists.');
        }
    });

    return {
        mutation
    };
};
