import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import { authService, User } from "../services/authService";
import ChangePasswordModal from "../components/modals/ChangePasswordModal";

export default function UserProfiles() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await authService.getProfile();
        setUser(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleProfileUpdate = async (updatedUser: User) => {
    setUser(updatedUser);
    // Reload profile to get latest data
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (err) {
      console.error("Failed to reload profile:", err);
    }
  };

  return (
    <>
      <PageMeta
        title="User Profile | EV Co-ownership"
        description="View and manage your profile information"
      />
      <PageBreadcrumb pageTitle="Profile" />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && user && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-5 flex items-center justify-between lg:mb-7">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Profile
            </h3>
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Change Password
            </button>
          </div>
          <div className="space-y-6">
            <UserMetaCard user={user} />
            <UserInfoCard user={user} onUpdate={handleProfileUpdate} />
            <UserAddressCard user={user} />
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
