import { Navigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import PasswordChangeForm from "../features/auth/components/PasswordChangeForm";
import { useAuthentication } from "../store/AuthenticationContext";

function PasswordChange(){
    const { isAuthenticated } = useAuthentication();

    if (!isAuthenticated) {
        return <Navigate to="/" />;
    }

    return <>
        <AuthLayout>
            <PasswordChangeForm />
        </AuthLayout>
    </>
}

export default PasswordChange;