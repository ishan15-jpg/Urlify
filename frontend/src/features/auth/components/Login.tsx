import { useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useLogin } from '../hooks/useLogin';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { formData, fieldErrors, globalError, isLoading, handleChange, onSubmit } = useLogin();

  return (
      <main className="flex justify-center grow pt-32 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full relative">
        <section className="w-full max-w-[480px]">
          {/* Login Card */}
          <div className="form-card bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-sm border border-outline-variant/30">
            <div className="mb-8">
              <h1 className="text-headline-lg font-bold text-on-surface mb-2">Welcome back</h1>
              <p className="text-body-md text-on-surface-variant">Log in to manage your short links.</p>
            </div>
            {globalError && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-body-md text-center">
                {globalError}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={onSubmit} noValidate>
              {/* Email Address */}
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-label-md font-semibold text-on-surface">Email Address</label>
                <input 
                  type="email" 
                  id="login-email" 
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="xyz@mail.com" 
                  className={`w-full px-4 py-4 rounded-lg border ${fieldErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`} 
                />
                {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password" className="block text-label-md font-semibold text-on-surface">Password</label>
                  <Link className="text-primary text-label-sm hover:underline font-semibold" to="/reset-password">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    id="login-password" 
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••" 
                    className={`w-full pl-4 pr-12 py-4 rounded-lg border ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`} 
                  />
                  <button 
                    type="button" 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center cursor-pointer" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Primary CTA */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 rounded-lg text-label-md text-white font-bold flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Spinner size="sm" color="white" /> : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-outline-variant text-center">
              <p className="text-label-md text-on-surface-variant">
                Not registered? <Link to="/register" className="text-primary font-bold hover:underline">Create an account</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
  );
}

export default Login;