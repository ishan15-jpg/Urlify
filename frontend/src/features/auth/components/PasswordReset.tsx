import { useEffect, useState } from 'react';
import PasswordResetForm from './PasswordResetForm';
import { useSearchParams, Navigate } from 'react-router-dom';

function PasswordReset() {
    const [status, setStatus] = useState('valid');

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            return;
        }
    }, [token]);

    if (status === 'invalid') return <Navigate to={"/login"} replace />;

    return <PasswordResetForm />;
}

export default PasswordReset;