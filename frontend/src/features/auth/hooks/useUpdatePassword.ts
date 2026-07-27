import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { authService } from '../authModule';
import { useMutation } from '@tanstack/react-query';
import toast  from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { FieldErrors } from '../authService';

export const useUpdatePassword = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: ''
    });    

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [globalError, setGlobalError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => authService.updatePassword({
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword
        }),
        onSuccess: () => {
            toast.success('Password updated successfully');
            setFormData({
                oldPassword: '',
                newPassword: ''
            });
            navigate('/account-settings')
        },
        onError: (err: any) => {
            if (err?.name === 'ValidationError') {
                setFieldErrors(err.fieldErrors);
            } else {
                const message = err?.response?.data?.message || err?.message || 'An error occurred while updating password';
                toast.error(message);
            }
            setFormData(prev => ({
                ...prev,
                newPassword: '',
                oldPassword: ''
            }))
        },
    });

    const onSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setGlobalError(null);
        mutation.mutate();
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Map HTML IDs to state keys
        let fieldName = id;
        if (id === 'old-password') fieldName = 'oldPassword';
        if (id === 'new-password') fieldName = 'newPassword';

        setFormData(prev => ({ ...prev, [fieldName]: value }));

        // Clear error for the specific field when user starts typing again
        if (fieldErrors[fieldName as keyof FieldErrors]) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
        setGlobalError(null);
    };

    return {
        formData,
        fieldErrors,
        globalError,
        isLoading: mutation.isPending,
        handleChange,
        onSubmit
    };
};