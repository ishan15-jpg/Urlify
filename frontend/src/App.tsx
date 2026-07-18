import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home/Home';
import AccountSettings from './features/account/components/AccountSettings';
import { ThemeProvider } from './store/ThemeContext';
import PasswordChange from './features/auth/components/PasswordChange';
import EmailVerification from './features/auth/components/EmailVerification';
import Login from './features/auth/components/Login';
import Register from './features/auth/components/Register';
import PasswordReset from './features/auth/components/PasswordReset';
import AuthHeader from './components/AuthHeader';
import CreatedLinks from './features/links/components/CreatedLinks';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<>
            <Header />
            <Home />
            <Footer />
          </>} />
          <Route path="/login" element={<>
            <AuthHeader />
            <Login />
            <Footer />
          </>} />
          <Route path="/register" element={<>
            <AuthHeader />
            <Register />
            <Footer />
          </>} />
          <Route path="/account-settings" element={<>
            <Header />
            <AccountSettings />
            <Footer />
          </>} />
          <Route path="/links" element={<>
            <Header />
            <CreatedLinks />
            <Footer />
          </>} />
          <Route path="/change-password" element={<PasswordChange />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/reset-password" element={<PasswordReset />} />
        </Routes>
      </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
