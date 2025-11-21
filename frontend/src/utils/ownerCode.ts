import { BookingNeedType } from "../components/modals/BookingNeedModal";

/**
 * Generate owner code theo format: XXYYYZZAABBCC
 * - XX: Mã nhu cầu (NH, DH, LD)
 * - YYY: Mã loại xe (ví dụ: VF5, VF8, MS3)
 * - ZZ: Ngày (01-31)
 * - AA: Tháng (01-12)
 * - BB: Năm (25 cho 2025)
 * - CC: Thứ tự người dùng (01-99)
 */
export function generateOwnerCode(
  needType: BookingNeedType,
  vehicleModel: string,
  date: Date = new Date(),
  userSequence: number = 1
): string {
  // XX: Mã nhu cầu
  const needCode = needType;

  // YYY: Mã loại xe (lấy 3 ký tự đầu, bỏ khoảng trắng)
  let vehicleCode = vehicleModel
    .replace(/\s+/g, "")
    .substring(0, 3)
    .toUpperCase();
  if (vehicleCode.length < 3) {
    vehicleCode = vehicleCode.padEnd(3, "X");
  }

  // ZZ: Ngày (2 chữ số)
  const day = String(date.getDate()).padStart(2, "0");

  // AA: Tháng (2 chữ số)
  const month = String(date.getMonth() + 1).padStart(2, "0");

  // BB: Năm (2 chữ số cuối)
  const year = String(date.getFullYear()).slice(-2);

  // CC: Thứ tự người dùng (2 chữ số, 01-99)
  const sequence = String(Math.min(userSequence, 99)).padStart(2, "0");

  return `${needCode}${vehicleCode}${day}${month}${year}${sequence}`;
}

/**
 * Parse owner code để lấy thông tin
 */
export function parseOwnerCode(ownerCode: string): {
  needType: BookingNeedType | null;
  vehicleCode: string;
  day: string;
  month: string;
  year: string;
  sequence: number;
} | null {
  if (ownerCode.length !== 14) {
    return null;
  }

  const needCode = ownerCode.substring(0, 2);
  const vehicleCode = ownerCode.substring(2, 5);
  const day = ownerCode.substring(5, 7);
  const month = ownerCode.substring(7, 9);
  const year = ownerCode.substring(9, 11);
  const sequence = parseInt(ownerCode.substring(11, 13), 10);

  let needType: BookingNeedType | null = null;
  if (needCode === "NH" || needCode === "DH" || needCode === "LD") {
    needType = needCode as BookingNeedType;
  }

  return {
    needType,
    vehicleCode,
    day,
    month,
    year,
    sequence,
  };
}

