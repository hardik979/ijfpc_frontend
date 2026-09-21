import { StudentAttendanceDetailPage } from "../../AttendanceDashboard";

export default async function StudentAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ clerkId: string }>;
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const [{ clerkId }, query] = await Promise.all([params, searchParams]);
  const initialMonth =
    typeof query.month === "string" ? query.month : undefined;

  return (
    <StudentAttendanceDetailPage clerkId={clerkId} initialMonth={initialMonth} />
  );
}
