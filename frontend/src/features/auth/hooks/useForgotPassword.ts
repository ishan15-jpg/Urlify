import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authService } from "../authModule";
import { useNavigate } from "react-router-dom";
import type { User } from "../../../types";

interface UseForgotPasswordProps {
    profile: User | undefined;
    setIsChanging: (isChanging: boolean) => void;
    setIsSuccess: (isSuccess: boolean) => void;
}

export const useForgotPassword = ({ profile, setIsChanging, setIsSuccess }: UseForgotPasswordProps) => {
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (email: string) => authService.forgotPassword({ email }),
        onSuccess: () => {
        toast.success('Password Reset Link sent.');
        navigate('/account-settings');
        },
        onError: () => {
        toast.error('Failed to send reset link. Please try again.');
        }
    });

    const handleForgotPassword = () => {
        if (profile?.email) {
            mutation.mutate(profile.email);
        }
    };

    const handleChange = (e: React.ChangeEvent) => {
        e.preventDefault();
        setIsChanging(true);
        
        // Simulate API call
        setTimeout(() => {
        setIsChanging(false);
        setIsSuccess(true);
        }, 1500);
    };

    return {
        mutation,
        handleForgotPassword,
        handleChange
    };
};