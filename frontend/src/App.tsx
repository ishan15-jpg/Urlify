import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import AccountSettings from './pages/AccountSettings/AccountSettings';
import { ThemeProvider } from './context/ThemeContext';
import PasswordChange from './pages/PasswordChange/PasswordChange';
import EmailVerification from './pages/EmailVerification/EmailVerification';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import PasswordReset from './pages/PasswordReset/PasswordReset';
import AuthHeader from './components/Header/AuthHeader';
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
          <Route path="/change-password" element={<PasswordChange />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/reset-password" element={<PasswordReset />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
