import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, Ownership } from "../../services/ownershipService";
import { BookingNeedType } from "../../components/modals/BookingNeedModal";
import CreateBookingModal from "../../components/modals/CreateBookingModal";

interface VehicleWithOwners extends VehicleGroup {
  ownerships: Ownership[];
  totalOwners: number;
  companyOwnership: number;
}

const VehicleSelection: React.FC<{
  needType: BookingNeedType;
  duration: number;
  onBack: () => void;
}> = ({ needType, duration, onBack }) => {
  const [vehicles, setVehicles] = useState<VehicleWithOwners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleGroup | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, [needType]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = await ownershipService.getGroups();
      
      // Load ownerships for each group
      const vehiclesWithOwners = await Promise.all(
        groups.map(async (group) => {
          try {
            const ownerships = await ownershipService.getOwnerships(group.id);
            
            // Filter based on need type
            let shouldInclude = false;
            if (needType === "NH") {
              // Ngắn hạn: nhiều người đồng sở hữu (>= 3)
              shouldInclude = ownerships.length >= 3;
            } else if (needType === "DH") {
              // Dài hạn: 2-3 người đồng sở hữu
              shouldInclude = ownerships.length >= 2 && ownerships.length <= 3;
            } else if (needType === "LD") {
              // Lâu dài: 2 người (1 người + công ty 10%)
              shouldInclude = ownerships.length === 2;
            }

            if (shouldInclude) {
              // Calculate company ownership (10%)
              const companyOwnership = 10; // Công ty sở hữu 10%
              
              return {
                ...group,
                ownerships,
                totalOwners: ownerships.length,
                companyOwnership,
              };
            }
            return null;
          } catch (err) {
            console.error(`Failed to load ownerships for group ${group.id}:`, err);
            return null;
          }
        })
      );

      setVehicles(vehiclesWithOwners.filter((v): v is VehicleWithOwners => v !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (status === 1) return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    if (status === 2) return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
  };

  const getStatusLabel = (status: number) => {
    if (status === 0) return "Available";
    if (status === 1) return "In Use";
    if (status === 2) return "Maintenance";
    return "Technical Issue";
  };

  const handleBook = (vehicle: VehicleGroup) => {
    setSelectedVehicle(vehicle);
    setShowBookingModal(true);
  };

  const getNeedTypeLabel = () => {
    switch (needType) {
      case "NH":
        return "Ngắn hạn";
      case "DH":
        return "Dài hạn";
      case "LD":
        return "Lâu dài";
      default:
        return "";
    }
  };

  return (
    <>
      <PageMeta title="Co-owner | Select Vehicle" />
      <PageHeader
        title={`Chọn Xe - ${getNeedTypeLabel()}`}
        description={
          needType === "NH"
            ? "Nhiều người đồng sở hữu, hạn chế xe do nhu cầu cao"
            : needType === "DH"
            ? "2-3 người đồng sở hữu, số lượng xe tương đối"
            : "2 người sở hữu (1 người dùng + công ty 10%)"
        }
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            Quay lại
          </Button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách xe...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                Không tìm thấy xe phù hợp với nhu cầu {getNeedTypeLabel()}.
              </p>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Vehicle Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🚗</div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {vehicle.vehicleName}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {vehicle.vehicleName}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(vehicle.status)}`}>
                      {getStatusLabel(vehicle.status)}
                    </span>
                  </div>

                  {vehicle.licensePlate && (
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                      Biển số: {vehicle.licensePlate}
                    </p>
                  )}

                  {/* Co-owners List */}
                  <div className="mb-3">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Đồng sở hữu ({vehicle.totalOwners} người):
                    </p>
                    <div className="space-y-1">
                      {vehicle.ownerships.map((ownership) => (
                        <div
                          key={ownership.id}
                          className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800/30"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {ownership.coOwnerName || ownership.coOwnerId.substring(0, 8)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white/90">
                            {ownership.ownershipPercentage}%
                          </span>
                        </div>
                      ))}
                      {/* Company ownership */}
                      <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs dark:bg-blue-500/10">
                        <span className="text-blue-600 dark:text-blue-300">Công ty</span>
                        <span className="font-medium text-blue-700 dark:text-blue-200">
                          {vehicle.companyOwnership}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleBook(vehicle)}
                    disabled={vehicle.status !== 0}
                  >
                    {vehicle.status === 0 ? "Đặt Xe" : "Không khả dụng"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedVehicle && (
        <CreateBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowBookingModal(false);
            setSelectedVehicle(null);
            loadVehicles();
          }}
          vehicleId={selectedVehicle.id}
          needType={needType}
          duration={duration}
        />
      )}
    </>
  );
};

export default VehicleSelection;

