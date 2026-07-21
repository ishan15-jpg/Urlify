import { createContext, useContext, useState, type ReactNode } from "react";
import STORAGE_KEYS from "../constants/storageKeys";

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