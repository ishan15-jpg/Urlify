import AuthLayout from "../layouts/AuthLayout";
import EmailVerificationContainer from "../features/auth/components/EmailVerificationContainer";

function EmailVerification() {
    return (
        <AuthLayout>
            <EmailVerificationContainer />
        </AuthLayout>
    );
}

export default EmailVerification;
