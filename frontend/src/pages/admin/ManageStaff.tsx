/**
 * Trang quản lý nhân viên
 * Cho phép admin quản lý tài khoản staff, phân quyền và theo dõi trách nhiệm
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { UserSummary, authService } from "../../services/authService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

/**
 * Interface cho quyền của staff
 */
interface StaffPermission {
  id: string;
  name: string;
  description: string;
}

/**
 * Danh sách các mức quyền của staff
 */
const PERMISSIONS: StaffPermission[] = [
  { id: "full", name: "Quyền Truy Cập Đầy Đủ", description: "Truy cập đầy đủ vào tất cả các chức năng của staff" },
  { id: "limited", name: "Quyền Truy Cập Hạn Chế", description: "Chỉ truy cập các thao tác cơ bản" },
  { id: "readonly", name: "Chỉ Đọc", description: "Chỉ xem thông tin, không được phép chỉnh sửa" },
];

const ManageStaff: React.FC = () => {
  const [staff, setStaff] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserSummary | null>(null);
  const [permission, setPermission] = useState<string>("full");

  // Load danh sách staff khi component mount
  useEffect(() => {
    loadStaff();
  }, []);

  /**
   * Tải danh sách staff từ API (lọc users có role Staff)
   */
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
      setError(err instanceof Error ? err.message : "Không thể tải danh sách staff");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mở modal chỉnh sửa quyền của staff
   * @param staffMember - Staff member cần chỉnh sửa
   */
  const handleEdit = (staffMember: UserSummary) => {
    setSelectedStaff(staffMember);
    // Get current permission from localStorage or default to "full"
    const savedPermission = localStorage.getItem(`staff_permission_${staffMember.id}`);
    setPermission(savedPermission || "full");
    setIsEditModalOpen(true);
  };

  /**
   * Lưu quyền mới cho staff
   * Lưu vào localStorage (giải pháp tạm thời)
   * TODO: Implement backend API to store permission in database
   */
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
      alert(`Đã cập nhật quyền thành công cho ${selectedStaff.firstName} ${selectedStaff.lastName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật quyền");
    }
  };

  /**
   * Vô hiệu hóa tài khoản staff
   * @param _userId - ID của user (chưa implement)
   */
  const handleDeactivate = async (_userId: number) => {
    if (!confirm("Bạn có chắc chắn muốn vô hiệu hóa nhân viên này không?")) return;
    try {
      // TODO: Implement deactivate user API call
      loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể vô hiệu hóa staff");
    }
  };


  return (
    <>
      <PageMeta title="Admin | Quản Lý Nhân Viên" />
      <PageHeader
        title="Quản Lý Nhân Viên"
        description="Cung cấp và kiểm tra các tài khoản nhân viên nội bộ, những người điều phối đặt chỗ, bảo dưỡng và giải quyết tranh chấp."
        actions={<Button size="sm" onClick={loadStaff} disabled={loading}>Làm Mới</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách nhân viên...</p>
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
                <p className="text-gray-600 dark:text-gray-400">Không tìm thấy nhân viên nào.</p>
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
                            {staffMember.isActive ? "Hoạt Động" : "Không Hoạt Động"}
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
                            Quyền: {staffMember.roles.join(", ")} • Mức quyền: {permissionInfo.name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(staffMember)}>
                          Quản Lý Quyền
                        </Button>
                        {staffMember.isActive && (
                          <Button size="sm" variant="outline" onClick={() => handleDeactivate(staffMember.id)}>
                            Vô Hiệu Hóa
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

          {/* Thông tin trách nhiệm của Staff */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90 mb-4">
              Trách Nhiệm Của Nhân Viên
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Vận Hành",
                  details:
                    "Quản lý check-in tại chỗ, điều phối lịch sạc điện và duy trì xe ở trạng thái tối ưu.",
                },
                {
                  title: "Hỗ Trợ Thành Viên",
                  details:
                    "Giải quyết các vấn đề đặt chỗ, xử lý tranh chấp và đảm bảo co-owners tuân thủ chính sách nhóm.",
                },
                {
                  title: "Chất Lượng Dữ Liệu",
                  details:
                    "Xác minh hồ sơ quyền sở hữu, cập nhật nhật ký bảo dưỡng và đồng bộ báo cáo với dịch vụ phân tích.",
                },
                {
                  title: "Bảo Mật",
                  details:
                    "Giám sát hoạt động đăng nhập, thực thi chính sách MFA và hợp tác với admin về các vấn đề cần xử lý.",
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

      {/* Modal Chỉnh Sửa Quyền */}
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
              Quản Lý Quyền
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {selectedStaff && `${selectedStaff.firstName} ${selectedStaff.lastName}`}
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Mức Quyền <span className="text-error-500">*</span></Label>
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
                <strong>Quyền Truy Cập Đầy Đủ:</strong> Có thể quản lý xe, đặt chỗ, hợp đồng và tranh chấp.
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <strong>Quyền Truy Cập Hạn Chế:</strong> Chỉ có thể check-in/out xe và xem đặt chỗ.
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <strong>Chỉ Đọc:</strong> Chỉ có thể xem thông tin, không được phép chỉnh sửa.
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
                Hủy
              </Button>
              <Button size="sm" onClick={handleSavePermission}>
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageStaff;
