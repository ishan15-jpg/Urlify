import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import AccountSettings from './pages/AccountSettings';
import { ThemeProvider } from './store/ThemeContext';
import PasswordChange from './pages/PasswordChange';
import PasswordReset from './pages/PasswordReset';
import EmailVerification from './features/auth/components/EmailVerification';
import Login from './pages/Login';
import Register from './pages/Register';
import CreatedLinks from './pages/CreatedLinks';
import { AuthenticationProvider } from './store/AuthenticationContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <Toaster position="top-right" />
          <AuthenticationProvider>
            <Routes>
              <Route path="/" element={<Home/>} />
              <Route path="/login" element={<Login/>} />
              <Route path="/register" element={<Register/>} />
              <Route path="/account-settings" element={<AccountSettings/>} />
              <Route path="/links" element={<CreatedLinks/>} />
              <Route path="/change-password" element={<PasswordChange />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/reset-password" element={<PasswordReset />} />
            </Routes>
          </AuthenticationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
