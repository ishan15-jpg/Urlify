import { Link, Navigate } from 'react-router-dom';
import AccountProfile from '../features/account/components/AccountProfile';
import { useAuthentication } from '../store/AuthenticationContext';
import MainLayout from '../layouts/MainLayout';

export default function AccountSettings() {
  const { isAuthenticated } = useAuthentication();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <MainLayout >
      <main className="grow pt-24 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav
          className="flex items-center gap-2 mb-8 text-label-md"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="text-primary-container hover:underline font-semibold"
          >
            Home
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface font-bold">Account Settings</span>
        </nav>

        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="text-[32px] leading-[40px] md:text-headline-xl font-bold text-on-surface tracking-tight">
            Account Settings
          </h1>
          <p className="text-on-surface-variant text-body-md mt-2">
            Manage your profile information and security preferences.
          </p>
        </div>

        {/* Feature Component */}
        <AccountProfile />
      </main>
    </MainLayout>
  );
}
