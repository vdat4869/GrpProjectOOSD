/**
 * Vehicle Models Configuration
 * Danh sách các loại xe được hỗ trợ trong hệ thống
 */

export interface VehicleModel {
  id: string;
  name: string;
  brand: string;
  category?: string;
}

export const VEHICLE_MODELS: VehicleModel[] = [
  { id: "vinfast-vf-3", name: "VinFast VF 3", brand: "VinFast", category: "SUV" },
  { id: "vinfast-vf-5", name: "VinFast VF 5", brand: "VinFast", category: "SUV" },
  { id: "vinfast-vf-6", name: "VinFast VF 6", brand: "VinFast", category: "SUV" },
  { id: "vinfast-vf-7", name: "VinFast VF 7", brand: "VinFast", category: "SUV" },
  { id: "vinfast-vf-8", name: "VinFast VF 8", brand: "VinFast", category: "SUV" },
  { id: "vinfast-vf-9", name: "VinFast VF 9", brand: "VinFast", category: "SUV" },
  { id: "tesla-model-s", name: "Tesla Model S", brand: "Tesla", category: "Sedan" },
  { id: "tesla-model-x", name: "Tesla Model X", brand: "Tesla", category: "SUV" },
];

/**
 * Lấy danh sách tên xe (chỉ tên, không có brand)
 */
export const getVehicleModelNames = (): string[] => {
  return VEHICLE_MODELS.map((model) => model.name);
};

/**
 * Lấy danh sách xe theo brand
 */
export const getVehicleModelsByBrand = (brand: string): VehicleModel[] => {
  return VEHICLE_MODELS.filter((model) => model.brand.toLowerCase() === brand.toLowerCase());
};

/**
 * Tìm xe theo ID
 */
export const getVehicleModelById = (id: string): VehicleModel | undefined => {
  return VEHICLE_MODELS.find((model) => model.id === id);
};

/**
 * Tìm xe theo tên
 */
export const getVehicleModelByName = (name: string): VehicleModel | undefined => {
  return VEHICLE_MODELS.find((model) => model.name.toLowerCase() === name.toLowerCase());
};

/**
 * Lấy danh sách các brand duy nhất
 */
export const getVehicleBrands = (): string[] => {
  const brands = VEHICLE_MODELS.map((model) => model.brand);
  return Array.from(new Set(brands));
};

