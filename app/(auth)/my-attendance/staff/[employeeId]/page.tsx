import { StaffAttendanceDetailPage } from "../../AttendanceDashboard";

export default async function StaffAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const [{ employeeId }, query] = await Promise.all([params, searchParams]);
  const initialMonth =
    typeof query.month === "string" ? query.month : undefined;

  return (
    <StaffAttendanceDetailPage
      employeeId={employeeId}
      initialMonth={initialMonth}
    />
  );
}
