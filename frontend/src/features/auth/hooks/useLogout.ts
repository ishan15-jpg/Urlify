import { useNavigate } from "react-router-dom";
import { useAuthentication } from "../../../store/AuthenticationContext";
import { useMutation } from "@tanstack/react-query";
import {authService} from "../authModule";
import toast from "react-hot-toast";
import STORAGE_KEYS from "../../../constants/storageKeys";

export const useLogout = () => {
    const navigate = useNavigate();

    const { setIsAuthenticated } = useAuthentication();

    const mutation = useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            toast.success("Logged out successfully");
            setIsAuthenticated(false);
            navigate('/');
        },
        onError: () => {
            toast.error("Logout failed. Retry later...")
        }
    });

    const onClick = (e: any) => {
        e.preventDefault();
        mutation.mutate();
    };

    return { onClick };
};