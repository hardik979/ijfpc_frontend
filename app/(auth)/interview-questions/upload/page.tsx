import { Suspense } from "react";
import UploadWizard from "@/components/interview-questions/UploadWizard";
import { Spinner } from "@/components/interview-questions/ui";

// The wizard pre-fills from ?course=&company=&round= via useSearchParams,
// which Next requires to sit under a Suspense boundary.
export default function UploadInterviewQuestionsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <UploadWizard />
    </Suspense>
  );
}
