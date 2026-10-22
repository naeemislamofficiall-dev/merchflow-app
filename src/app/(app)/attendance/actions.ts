"use server";

import { runAction } from "@/lib/action-result";
import { attendanceService } from "@/services/attendance.service";

export async function saveAttendanceAction(
  factoryId: string,
  date: string,
  rows: { employeeId: string; status: string; overtimeHours: string }[]
) {
  return runAction(async () => attendanceService.save({ factoryId, date, rows }));
}
