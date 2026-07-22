import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import STORAGE_KEYS from "../constants/storageKeys";
import { authService } from "../features/auth/authModule";
import env from "../config/env";

interface AuthenticationContextType {
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
}

const AuthenticationContext = createContext<AuthenticationContextType | undefined>(undefined);

export function AuthenticationProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        return !!token;
    });

    // Handle Global Logout Event (from Interceptor)
    useEffect(() => {
        const handleLogout = () => {
            setIsAuthenticated(false);
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        };

        window.addEventListener('auth:logout', handleLogout);

        return () => {
            window.removeEventListener('auth:logout', handleLogout);
        };
    }, []);

    // Proactive Token Refresh Timer
    useEffect(() => {
        if (!isAuthenticated) return;

        // Refresh 1 minute before 15m expiration (14 minutes)
        const REFRESH_INTERVAL = Number(env.REFRESH_INTERVAL);
        
        const intervalId = setInterval(async () => {
            try {
                const response = await authService.refreshToken();
                const newAccessToken = response.data?.accessToken;
                if (newAccessToken) {
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
                } else {
                    throw new Error("No access token in response");
                }
            } catch (error) {
                console.error("Proactive token refresh failed:", error);
                window.dispatchEvent(new Event('auth:logout'));
            }
        }, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [isAuthenticated]);

    return (
        <AuthenticationContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
            {children}
        </AuthenticationContext.Provider>
    );
}

export function useAuthentication() {
    const context = useContext(AuthenticationContext);
    if (!context) {
        throw new Error('useAuthentication must be used within an AuthenticationProvider');
    }
    return context;
}
