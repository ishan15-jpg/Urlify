import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import authService, { type FieldErrors } from '../authService';
import STORAGE_KEYS from '../../../constants/storageKeys';
import { useAuthentication } from '../../../store/AuthenticationContext';

export const useLogin = () => {
  const navigate = useNavigate();

  const { setIsAuthenticated } = useAuthentication();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authService.login({ email: formData.email, password: formData.password }),
    onSuccess: (response: any) => {
      // As per API Design doc, the accessToken is inside response.data.accessToken
      if (response?.data?.accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
        toast.success('Login successful');
        setIsAuthenticated(true);
        setTimeout(() => {
          setFormData({ email: '', password: '' });
          navigate('/');
        }, 1500);
        return;
      }
      // Fallback if the API returned 200 OK but was missing the token
      toast.error('Unexpected error: Missing access token');
    },
    onError: (err: any) => {
      if (err?.name === 'ValidationError') {
        setFieldErrors(err.fieldErrors);
      } else {
        const message = err?.response?.data?.message || err?.message || 'An error occurred during login';
        setGlobalError(message);
        toast.error(message);
      }
    }
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // Map HTML IDs to state keys
    let fieldName = id;
    if (id === 'login-email') fieldName = 'email';
    if (id === 'login-password') fieldName = 'password';

    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for the specific field when user starts typing again
    if (fieldErrors[fieldName as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
    setGlobalError(null);
  };

  const onSubmit = (e: SubmitEvent) => {
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
