import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { UserSummary, authService } from "../../services/authService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

interface StaffPermission {
  id: string;
  name: string;
  description: string;
}

const PERMISSIONS: StaffPermission[] = [
  { id: "full", name: "Full Access", description: "Complete access to all staff functions" },
  { id: "limited", name: "Limited Access", description: "Restricted access to basic operations only" },
  { id: "readonly", name: "Read Only", description: "View-only access, no modifications allowed" },
];

const ManageStaff: React.FC = () => {
  const [staff, setStaff] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserSummary | null>(null);
  const [permission, setPermission] = useState<string>("full");

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getUsers();
      // Filter users with Staff role
      const staffUsers = response.users.filter((user: UserSummary) => 
        user.roles && user.roles.some((role: string) => role.toLowerCase() === "staff")
      );
      setStaff(staffUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staffMember: UserSummary) => {
    setSelectedStaff(staffMember);
    // Get current permission from localStorage or default to "full"
    const savedPermission = localStorage.getItem(`staff_permission_${staffMember.id}`);
    setPermission(savedPermission || "full");
    setIsEditModalOpen(true);
  };

  const handleSavePermission = async () => {
    if (!selectedStaff) return;
    try {
      setError(null);
      // Save permission to localStorage (temporary solution)
      // TODO: Implement backend API to store permission in database
      localStorage.setItem(`staff_permission_${selectedStaff.id}`, permission);
      
      // Update local state immediately for better UX
      setStaff(prevStaff => 
        prevStaff.map(s => 
          s.id === selectedStaff.id 
            ? { ...s, permission } 
            : s
        )
      );
      
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      
      // Show success message
      alert(`Permission updated successfully for ${selectedStaff.firstName} ${selectedStaff.lastName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission");
    }
  };

  const handleDeactivate = async (_userId: number) => {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;
    try {
      // TODO: Implement deactivate user API call
      loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate staff");
    }
  };


  return (
    <>
      <PageMeta title="Admin | Manage Staff" />
      <PageHeader
        title="Staff Administration"
        description="Provision and audit internal staff accounts who coordinate bookings, maintenance, and dispute resolution."
        actions={<Button size="sm" onClick={loadStaff} disabled={loading}>Refresh</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading staff...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 grid gap-4">
            {staff.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400">No staff members found.</p>
              </div>
            ) : (
              staff.map((staffMember) => {
                const savedPermission = localStorage.getItem(`staff_permission_${staffMember.id}`) || "full";
                const permissionInfo = PERMISSIONS.find(p => p.id === savedPermission) || PERMISSIONS[0];
                return (
                <div
                  key={staffMember.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            {staffMember.firstName} {staffMember.lastName}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            staffMember.isActive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300"
                          }`}>
                            {staffMember.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            {permissionInfo.name}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {staffMember.email}
                        </p>
                        {staffMember.roles && staffMember.roles.length > 0 && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Roles: {staffMember.roles.join(", ")} • Permission: {permissionInfo.name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(staffMember)}>
                          Manage Permissions
                        </Button>
                        {staffMember.isActive && (
                          <Button size="sm" variant="outline" onClick={() => handleDeactivate(staffMember.id)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>

          {/* Staff Responsibilities Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90 mb-4">
              Staff Responsibilities
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Operations",
                  details:
                    "Manage on-site check-ins, coordinate charging schedules, and keep vehicles in optimal condition.",
                },
                {
                  title: "Member Support",
                  details:
                    "Resolve booking issues, triage disputes, and ensure co-owners remain compliant with group policies.",
                },
                {
                  title: "Data Quality",
                  details:
                    "Verify ownership records, update maintenance logs, and sync reports with the analytics service.",
                },
                {
                  title: "Security",
                  details:
                    "Monitor login activity, enforce MFA policies, and collaborate with admins on escalations.",
                },
              ].map(({ title, details }) => (
                <div key={title} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{details}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit Permission Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        className="max-w-[500px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Manage Permissions
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {selectedStaff && `${selectedStaff.firstName} ${selectedStaff.lastName}`}
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Permission Level <span className="text-error-500">*</span></Label>
              <Select
                value={permission}
                onChange={(value) => setPermission(value)}
              >
                {PERMISSIONS.map((perm) => (
                  <option key={perm.id} value={perm.id}>
                    {perm.name}
                  </option>
                ))}
              </Select>
              {PERMISSIONS.find((p) => p.id === permission) && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {PERMISSIONS.find((p) => p.id === permission)?.description}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Full Access:</strong> Can manage vehicles, bookings, contracts, and disputes.
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <strong>Limited Access:</strong> Can only check-in/out vehicles and view bookings.
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <strong>Read Only:</strong> Can only view information, no modifications allowed.
              </p>
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedStaff(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSavePermission}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageStaff;
