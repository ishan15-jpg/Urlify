import { useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { useRegister } from '../hooks/useRegister';

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { formData, fieldErrors, globalError, isLoading, handleChange, onSubmit } = useRegister();

  return (
    <main className="flex justify-center grow pt-32 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full relative">
        <div className="w-full max-w-[480px]">
            {/* Registration Card */}
            <div className="form-card bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-sm border border-outline-variant/30">
            <div className="text-center mb-8">
                <h1 className="text-headline-lg font-bold text-on-surface mb-2">Create your account</h1>
                <p className="text-body-md text-on-surface-variant">Join Urlify to start managing your short links.</p>
            </div>
            
            {globalError && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-body-md text-center">
                {globalError}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={onSubmit} noValidate>
                {/* Full Name */}
                <div className="space-y-2">
                <label htmlFor="full_name" className="block text-label-md font-semibold text-on-surface">Full Name</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                    <input 
                    type="text" 
                    id="full_name" 
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe" 
                    className={`w-full pl-12 pr-4 py-4 rounded-lg border ${fieldErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`}
                    disabled={isLoading}
                    required
                    />
                </div>
                {fieldErrors.name && <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>}
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                <label htmlFor="email" className="block text-label-md font-semibold text-on-surface">Email Address</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                    <input 
                    type="email" 
                    id="email" 
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="xyz@mail.com" 
                    className={`w-full pl-12 pr-4 py-4 rounded-lg border ${fieldErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`}
                    disabled={isLoading}
                    required
                    />
                </div>
                {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
                </div>

                {/* Passwords */}
                <div className="space-y-6">
                {/* Password */}
                <div className="space-y-2">
                    <label htmlFor="password" className="block text-label-md font-semibold text-on-surface">Password</label>
                    <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        id="password" 
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••" 
                        className={`w-full pl-12 pr-12 py-4 rounded-lg border ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`}
                        disabled={isLoading}
                        required
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

                {/* Confirm Password */}
                <div className="space-y-2">
                    <label htmlFor="confirm_password" className="block text-label-md font-semibold text-on-surface">Confirm Password</label>
                    <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                    <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        id="confirm_password" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••" 
                        className={`w-full pl-12 pr-12 py-4 rounded-lg border ${fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-outline-variant focus:ring-primary focus:border-primary'} bg-surface-container-lowest text-body-md focus:ring-2 transition-all outline-none`}
                        disabled={isLoading}
                        required
                    />
                    <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center cursor-pointer" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle confirm password visibility"
                    >
                        <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>}
                </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 py-2">
                <input 
                    type="checkbox" 
                    id="terms" 
                    className="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 h-4 w-4 cursor-pointer" 
                    disabled={isLoading}
                    required
                />
                <label htmlFor="terms" className="text-label-sm text-on-surface-variant leading-5">
                    I agree to the <Link to="/terms" className="text-primary hover:underline font-semibold">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline font-semibold">Privacy Policy</Link>.
                </label>
                </div>

                {/* Primary CTA */}
                <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 rounded-lg text-label-md text-white font-bold flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                {isLoading ? (
                  <Spinner size="sm" color="text-white" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-outline-variant flex flex-col items-center gap-4">
                <p className="text-label-md text-on-surface-variant">
                Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
                </p>
            </div>
            </div>
        </div>
    </main>
  );
}

export default RegisterForm;