import AuthLayout from "../layouts/AuthLayout";
import PasswordChangeForm from "../features/auth/components/PasswordChangeForm";

function PasswordChange(){
    return <>
        <AuthLayout>
            <PasswordChangeForm />
        </AuthLayout>
    </>
}

export default PasswordChange;