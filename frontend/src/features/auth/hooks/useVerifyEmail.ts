import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../authModule';

export const useVerifyEmail = (token: string | null) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Ref to prevent double-firing of useEffect in React 18 StrictMode
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    
    if (!token) {
      navigate('/');
      return;
    }

    hasAttempted.current = true;

    authService.verifyEmail({ token })
      .then(() => {
        setStatus('success');
        queryClient.setQueryData(['account'], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, isEmailVerified: true };
        });
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err?.response?.data?.message || 'Verification link is invalid or has expired.');
      });
  }, [token, navigate, queryClient]);

  return { status, errorMessage };
};
