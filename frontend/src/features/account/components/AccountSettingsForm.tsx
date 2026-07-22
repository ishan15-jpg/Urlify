import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { type User } from '../../../types';

interface Props {
  profile: User;
}

function AccountSettingsForm({ profile }: Props) {
  const [fullName, setFullName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [isEmailVerified, setIsEmailVerified] = useState(profile.isEmailVerified);
  const [isEditing, setIsEditing] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Snapshot of values when entering edit mode, used for cancel/restore
  const snapshot = useRef({ fullName: '', email: '' });

  // Track the last verified email so we can detect email changes
  const verifiedEmail = useRef(profile.email);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000); // Auto-hide after 4 seconds
  };

  const enterEditMode = () => {
    snapshot.current = { fullName, email };
    setIsEditing(true);
  };

  const exitEditMode = () => {
    setFullName(snapshot.current.fullName);
    setEmail(snapshot.current.email);
    setIsEditing(false);
  };

  const handleSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    // If email changed from the last verified email, mark as unverified
    if (isEmailVerified && email !== verifiedEmail.current) {
      setIsEmailVerified(false);
    }
    // TODO: integrate with API
    setIsEditing(false);
  };

  const handleVerifyEmail = async () => {
    try {
      // Basic validation mock for error demonstration
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setIsEmailVerified(true);
      verifiedEmail.current = email;
      showNotification('Email verified successfully!', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to verify email.', 'error');
    }
  };

  const handlePasswordChange = () => {};

  return (
    <>
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 md:top-24 md:right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg font-medium text-white transition-opacity duration-300 ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
          role="alert"
        >
          <span className="material-symbols-outlined text-[24px]">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-body-md">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-4 hover:opacity-80 transition-opacity flex items-center justify-center"
            aria-label="Close notification"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {/* Settings Form Card */}
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-10 md:p-10 shadow-sm">
        {/* Top-right corner: Edit / Close button */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          {isEditing ? (
            <button
              type="button"
              onClick={exitEditMode}
              className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-all cursor-pointer active:scale-90"
              aria-label="Cancel editing"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={enterEditMode}
              className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all cursor-pointer active:scale-90"
              aria-label="Edit profile"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          )}
        </div>

        <form className="space-y-8 max-w-2xl" onSubmit={handleSubmit}>
          {/* Full Name Field */}
          <div className="space-y-1 w-full">
            <label
              htmlFor="fullName"
              className="text-label-md text-on-surface-variant block font-medium"
            >
              Full Name
            </label>
            <div className="transition-transform duration-200 focus-within:scale-[1.01]">
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                readOnly={!isEditing}
                className={`w-full py-4 rounded-lg border text-body-md text-on-surface placeholder:text-outline transition-all ${
                  isEditing
                    ? 'px-4 border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    : 'border-transparent bg-transparent cursor-default focus:outline-none'
                }`}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1 w-full">
            <label
              htmlFor="email"
              className="text-label-md text-on-surface-variant block font-medium"
            >
              <div
              className='flex items-center justify-between'
              >
                Email
                {!isEmailVerified && (
                  <span className={`flex items-center gap-1 text-error text-label-sm font-semibold ${isEditing ? 'hidden' : ''}`}>
                    <span className="material-symbols-outlined text-[16px]">
                      info
                    </span>
                    Unverified
                  </span>
                )}
              </div>
            </label>
            <div className="relative transition-transform duration-200 focus-within:scale-[1.01]">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                readOnly={!isEditing}
                className={`w-full py-4 rounded-lg border text-body-md text-on-surface placeholder:text-outline transition-all ${
                  isEditing
                    ? 'px-4 border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    : 'border-transparent bg-transparent cursor-default focus:outline-none'
                }`}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-label-md text-on-surface-variant block font-medium"
            >
              Password
            </label>
            <div className="transition-transform duration-200">
              <input
                type="password"
                id="password"
                value="••••••••••••"
                readOnly
                className="w-full py-4 rounded-lg border border-transparent bg-transparent text-body-md text-on-surface focus:outline-none transition-all cursor-default"
              />
            </div>
          </div>

          {/* Divider + Save Changes — only in edit mode */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isEditing
                ? 'max-h-40 opacity-100'
                : 'max-h-0 opacity-0'
            }`}
          >
            <hr className="border-outline-variant my-8" />
            <div className="flex items-center pt-4">
              <button
                type="submit"
                className="w-full md:w-auto bg-primary text-on-primary font-bold px-16 py-4 rounded-lg hover:bg-primary/90 transition-colors active:scale-95 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons below the card */}
      <div className="flex justify-between flex-nowrap gap-4 mt-6">
        <Link to={"/change-password"}
        onClick={handlePasswordChange}
        className={`flex items-center justify-center gap-2 border border-outline-variant text-on-surface-variant font-bold max-[500px]:flex-1 max-[500px]:px-4 max-[500px]:py-3 max-[500px]:text-xs px-8 py-4 rounded-lg hover:border-primary hover:text-primary hover:bg-surface-container-high transition-all active:scale-95 ${isEditing ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
        <span className="material-symbols-outlined text-[20px] max-[500px]:text-[16px]">lock</span>
          Change Password
        </Link>
        {!isEmailVerified && (
          <button
            onClick={handleVerifyEmail}
            className={`flex items-center justify-center gap-2 bg-primary text-on-primary font-bold max-[500px]:flex-1 max-[500px]:px-4 max-[500px]:py-3 max-[500px]:text-xs px-8 py-4 rounded-lg hover:bg-primary/90 transition-all active:scale-95 ${isEditing ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <span className="material-symbols-outlined text-[20px] max-[500px]:text-[16px]">
              mark_email_read
            </span>
            Verify Email
          </button>
        )}
      </div>
    </>
  );
}

export default AccountSettingsForm;
