import AuthLayout from "../layouts/AuthLayout";
import PasswordResetForm from "../features/auth/components/PasswordResetForm";

function PasswordReset(){
    return <>
        <AuthLayout>
            <PasswordResetForm />
        </AuthLayout>
    </>
}

export default PasswordReset;