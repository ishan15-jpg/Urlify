import LoginForm from "../features/auth/components/LoginForm";
import AuthLayout from "../layouts/AuthLayout";

function Login() {
    return <>
        <AuthLayout>
            <LoginForm />
        </AuthLayout>
    </>
}

export default Login;