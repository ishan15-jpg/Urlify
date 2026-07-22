import { useAccount } from '../hooks/useAccount';
import AccountSettingsForm from './AccountSettingsForm';

export default function AccountProfile() {
  const { data, isLoading, error } = useAccount();

  if (isLoading) {
    return (
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-10 md:p-10 shadow-sm animate-pulse">
        <div className="space-y-8 max-w-2xl">
          {/* Skeleton Full Name */}
          <div className="space-y-2">
            <div className="h-4 bg-outline-variant rounded w-24"></div>
            <div className="h-14 bg-surface-container rounded-lg w-full"></div>
          </div>
          {/* Skeleton Email */}
          <div className="space-y-2">
            <div className="h-4 bg-outline-variant rounded w-16"></div>
            <div className="h-14 bg-surface-container rounded-lg w-full"></div>
          </div>
          {/* Skeleton Password */}
          <div className="space-y-2">
            <div className="h-4 bg-outline-variant rounded w-20"></div>
            <div className="h-14 bg-surface-container rounded-lg w-full"></div>
          </div>
        </div>
        {/* Skeleton Buttons */}
        <div className="flex justify-between flex-nowrap gap-4 mt-10">
          <div className="h-14 bg-surface-container rounded-lg w-48"></div>
          <div className="h-14 bg-surface-container rounded-lg w-40"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-200">
        <h2 className="text-lg font-bold mb-2">Error loading profile</h2>
        <p>We could not fetch your account details. Please try refreshing the page.</p>
      </div>
    );
  }

  return <AccountSettingsForm profile={data} />;
}
