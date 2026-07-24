import AuthLayout from "../layouts/AuthLayout";
import EmailVerificationComponent from "../features/auth/components/EmailVerification";

function EmailVerification() {
    return (
        <AuthLayout>
            <EmailVerificationComponent />
        </AuthLayout>
    );
}

export default EmailVerification;
