import MainLayout from "../layouts/MainLayout";
import { useAuthentication } from "../store/AuthenticationContext";
import AuthenticatedLinks from "../features/links/components/AuthenticatedLinks";
import UnauthenticatedLinks from "../features/links/components/UnauthenticatedLinks";

function CreatedLinks(){
    const { isAuthenticated } = useAuthentication();
    
    return (
        <MainLayout>
            {isAuthenticated ? <AuthenticatedLinks /> : <UnauthenticatedLinks />}
        </MainLayout>
    );
}

export default CreatedLinks;
