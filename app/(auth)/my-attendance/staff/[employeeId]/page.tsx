import { StaffAttendanceDetailPage } from "../../AttendanceDashboard";

export default async function StaffAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string | string[]; status?: string | string[] }>;
}) {
  const [{ employeeId }, query] = await Promise.all([params, searchParams]);
  const initialMonth =
    typeof query.month === "string" ? query.month : undefined;
  // Set when the admin opened this page from a Present / Half day / Absent
  // count in the overview, so the history lands already narrowed to it.
  const initialStatus =
    typeof query.status === "string" ? query.status : undefined;

  return (
    <StaffAttendanceDetailPage
      employeeId={employeeId}
      initialMonth={initialMonth}
      initialStatus={initialStatus}
    />
  );
}
