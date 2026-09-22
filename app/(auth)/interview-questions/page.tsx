import { Suspense } from "react";
import QuestionBankBrowser from "@/components/interview-questions/QuestionBankBrowser";
import { Spinner } from "@/components/interview-questions/ui";

// The browser reads ?course=&company=&round= with useSearchParams, which
// Next requires to sit under a Suspense boundary.
export default function InterviewQuestionsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <QuestionBankBrowser />
    </Suspense>
  );
}
