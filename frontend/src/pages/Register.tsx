import RegisterForm from "../features/auth/components/RegisterForm";
import AuthLayout from "../layouts/AuthLayout";

function Register() {
    return <>
        <AuthLayout>
            <RegisterForm />
        </AuthLayout>
    </>
}

export default Register;