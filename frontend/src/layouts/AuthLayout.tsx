import type { PropsWithChildren } from "react";
import AuthHeader from "../components/AuthHeader";


function AuthLayout({ children } : PropsWithChildren){
    return <>
        <AuthHeader />
        {children}
    </>
}

export default AuthLayout;