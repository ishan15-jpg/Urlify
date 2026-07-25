import { useSearchParams } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import PasswordResetForm from "../features/auth/components/PasswordResetForm";
import ForgotPasswordForm from "../features/auth/components/ForgotPasswordForm";

function PasswordReset(){
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return <>
        <AuthLayout>
            {token ? <PasswordResetForm token={token} /> : <ForgotPasswordForm />}
        </AuthLayout>
    </>
}

export default PasswordReset;