import Student360Profile from "@/components/student-360/Student360Profile";

export default async function Student360ProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <Student360Profile studentId={studentId} />;
}
