import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { type FieldErrors } from '../authService';
import { authService } from '../authModule';

export const useRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authService.register(
      { name: formData.name, email: formData.email, password: formData.password },
      formData.confirmPassword
    ),
    onSuccess: () => {
      toast.success('Registration successful.');
      setTimeout(() => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        navigate('/login');
      }, 1500);
    },
    onError: (err: any) => {
      if (err?.name === 'ValidationError') {
        setFieldErrors(err.fieldErrors);
      } else {
        const message = err?.response?.data?.message || err?.message || 'An error occurred during registration';
        setGlobalError(message);
        toast.error(message);
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    let fieldName = id;
    if (id === 'full_name') fieldName = 'name';
    if (id === 'confirm_password') fieldName = 'confirmPassword';

    if (type !== 'checkbox') {
      setFormData(prev => ({ ...prev, [fieldName]: value }));

      // Clear error for the specific field when user starts typing again
      if (fieldErrors[fieldName as keyof FieldErrors]) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
      }
    }
    setGlobalError(null);
  };

  const onSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    mutation.mutate();
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
