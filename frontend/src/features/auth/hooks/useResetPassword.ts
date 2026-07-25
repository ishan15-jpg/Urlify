import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authService } from '../authModule';
import { useNavigate } from 'react-router-dom';
import type { ResetPasswordPayload } from '../../../types';

export const useResetPassword = () => {
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
        onSuccess: () => {
            toast.success('Password successfully reset.');
            navigate('/login');
        },
        onError: (error: any) => {
            if (error?.name === 'ValidationError') {
                toast.error(error.fieldErrors.password || 'Invalid password.');
            } else {
                toast.error('Failed to reset password. The link might be expired.');
            }
        }
    });

    return {
        mutation
    };
};
