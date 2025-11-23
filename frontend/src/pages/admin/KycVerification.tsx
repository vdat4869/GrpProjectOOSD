/**
 * Trang xác thực KYC
 * Cho phép admin xem và xác thực các yêu cầu KYC từ CoOwner (CMND/CCCD và bằng lái xe)
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { kycService, KycRequestDto } from "../../services/kycService";
import Button from "../../components/ui/button/Button";

const KycVerification: React.FC = () => {
  const [requests, setRequests] = useState<KycRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Load danh sách yêu cầu KYC khi component mount hoặc filter thay đổi
  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  /**
   * Tải danh sách yêu cầu KYC từ API
   */
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await kycService.getAllKycRequests(filterStatus || undefined);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách yêu cầu KYC");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xác thực CMND/CCCD hoặc bằng lái xe
   * @param type - Loại tài liệu ("identity" hoặc "license")
   * @param id - ID của tài liệu
   * @param status - Trạng thái xác thực ("Approved" hoặc "Rejected")
   */
  const handleVerify = async (
    type: "identity" | "license",
    id: string,
    status: "Approved" | "Rejected"
  ) => {
    try {
      if (type === "identity") {
        await kycService.verifyIdentity(id, status);
      } else {
        await kycService.verifyLicense(id, status);
      }
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể xác thực");
    }
  };

  /**
   * Lấy màu hiển thị cho trạng thái xác thực
   * @param status - Trạng thái xác thực
   * @returns Class CSS cho màu
   */
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  /**
   * Lấy nhãn hiển thị cho trạng thái xác thực
   * @param status - Trạng thái xác thực
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "Đã Duyệt";
      case "rejected":
        return "Đã Từ Chối";
      case "pending":
        return "Chờ Xử Lý";
      default:
        return status;
    }
  };

  return (
    <>
      <PageMeta title="Admin | Xác Thực KYC" />
      <PageHeader
        title="Xác Thực KYC của CoOwner"
        description="Xem và xác thực các yêu cầu KYC từ CoOwner"
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Bộ Lọc */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Lọc theo trạng thái:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Tất cả</option>
                <option value="Pending">Chờ Xử Lý</option>
                <option value="Approved">Đã Duyệt</option>
                <option value="Rejected">Đã Từ Chối</option>
              </select>
            </div>
          </div>

          {/* Danh Sách Yêu Cầu */}
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 text-center">
              <p className="text-gray-600 dark:text-gray-400">Không có yêu cầu KYC nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={`${request.userId}-${request.identityDocumentId}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.userName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{request.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Tài Liệu CMND/CCCD */}
                    <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        CMND/CCCD
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Số: {request.identityDocumentNumber}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Tên: {request.identityFullName}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            request.identityStatus
                          )}`}
                        >
                          {getStatusLabel(request.identityStatus)}
                        </span>
                      </div>
                      {request.identityStatus === "Pending" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() =>
                              handleVerify("identity", request.identityDocumentId, "Approved")
                            }
                            className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600"
                          >
                            Duyệt
                          </Button>
                          <Button
                            onClick={() =>
                              handleVerify("identity", request.identityDocumentId, "Rejected")
                            }
                            className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600"
                          >
                            Từ Chối
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Bằng Lái Xe */}
                    <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Bằng Lái Xe
                      </h4>
                      {request.licenseId ? (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Số: {request.licenseNumber || "N/A"}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                request.licenseStatus
                              )}`}
                            >
                              {getStatusLabel(request.licenseStatus)}
                            </span>
                          </div>
                          {request.licenseStatus === "Pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                onClick={() =>
                                  handleVerify("license", request.licenseId!, "Approved")
                                }
                                className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600"
                              >
                                Duyệt
                              </Button>
                              <Button
                                onClick={() =>
                                  handleVerify("license", request.licenseId!, "Rejected")
                                }
                                className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600"
                              >
                                Từ Chối
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Chưa upload bằng lái
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default KycVerification;
