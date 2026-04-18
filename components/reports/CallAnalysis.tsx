"use client";

import  { useState, useMemo } from "react";
import {
  Search,
  Play,
  FileText,
  BarChart2,
  Calendar,
  Phone,
  User as UserIcon,
  X,
  ChevronRight,
  Headphones,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface RecordingReport {
  _id: string;
  leadId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  r2ObjectKey: string;
  publicUrl: string;
  status: string;
  transcriptRaw?: string;
  transcriptClean?: string;
  analysis?: any;
  type?: "recording" | "manual";
  manualStatus?: string;
  studentName: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface StudentGroup {
  leadId: string;
  studentName: string;
  phone: string;
  email: string;
  recordings: RecordingReport[];
}

interface CallAnalysisProps {
  reports: RecordingReport[];
}

export default function CallAnalysis({ reports }: CallAnalysisProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<RecordingReport | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<RecordingReport | null>(null);


  // Group recordings by Student
  const studentGroups = useMemo(() => {
    const groups: Record<string, StudentGroup> = {};

    reports.forEach((rec) => {
      if (!groups[rec.leadId]) {
        groups[rec.leadId] = {
          leadId: rec.leadId,
          studentName: rec.studentName || "Unknown Student",
          phone: rec.phone || "N/A",
          email: rec.email || "N/A",
          recordings: [],
        };
      }
      groups[rec.leadId].recordings.push(rec);
    });

    Object.values(groups).forEach(g => {
      g.recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [reports]);

  // Search Filter
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return studentGroups;

    return studentGroups.filter((s) =>
      (s.studentName || "").toLowerCase().includes(q) ||
      (s.phone || "").includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  }, [studentGroups, searchQuery]);

  const selectedStudent = useMemo(() =>
    studentGroups.find(s => s.leadId === selectedStudentId),
    [studentGroups, selectedStudentId]
  );

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border";
    switch (status) {
      case "DONE":
        return `${base} bg-green-50 text-green-700 border-green-100`;
      case "FAILED":
        return `${base} bg-red-50 text-red-700 border-red-100`;
      default:
        return `${base} bg-orange-50 text-orange-700 border-orange-100`;
    }
  };

  const getQualityBadge = (quality?: string) => {
    const base =
      "px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 border transition-all";

    switch ((quality || "").toLowerCase()) {
      case "good":
      case "excellent":
        return `${base} bg-green-50 text-green-700 border-green-100 hover:bg-green-100`;
      case "average":
        return `${base} bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100`;
      case "poor":
        return `${base} bg-red-50 text-red-700 border-red-100 hover:bg-red-100`;
      default:
        return `${base} bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100`;
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4">

      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-medium text-[#3E2723]">Student Records</h2>
          <p className="text-[#8D6E63] text-sm">Browse detailed call history and AI analysis by student</p>
        </div>

        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D2B48C] w-5 h-5 transition-colors group-focus-within:text-[#8B4513]" />
          <input
            type="text"
            placeholder="Search student or phone..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-[#EFEBE9] rounded-2xl focus:ring-4 focus:ring-[#F5F5DC] focus:border-[#D2B48C] transition-all outline-none shadow-sm text-base placeholder:text-[#D2B48C] font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">

        {/* Left: Student List */}
        <aside className={`flex-1 lg:max-w-[380px] flex flex-col bg-white border border-[#F5F5DC] rounded-[2rem] shadow-sm overflow-hidden ${selectedStudentId && 'hidden lg:flex'}`}>
          <div className="p-5 border-b border-[#FDFBF7] flex justify-between items-center bg-[#FAF9F6]">
            <span className="font-medium text-xs text-[#A1887F] uppercase tracking-widest">Active Students</span>
            <span className="bg-[#F5F5DC] text-[#8B4513] px-3 py-1 rounded-lg text-xs font-medium">{filteredStudents.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredStudents.length > 0 ? (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <button
                    key={student.leadId}
                    onClick={() => setSelectedStudentId(student.leadId)}
                    className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 group ${selectedStudentId === student.leadId
                      ? 'bg-[#8B4513] text-white shadow-lg translate-x-1'
                      : 'hover:bg-[#FFF9F0] border border-transparent hover:border-[#F5F5DC]'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedStudentId === student.leadId ? 'bg-white/20' : 'bg-[#FAF3E0] group-hover:bg-white'
                      }`}>
                      <UserIcon className={`w-6 h-6 ${selectedStudentId === student.leadId ? 'text-white' : 'text-[#A0522D]'}`} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-base truncate leading-tight">{student.studentName}</p>
                      <p className={`text-xs mt-0.5 ${selectedStudentId === student.leadId ? 'text-white/70' : 'text-[#8D6E63]'}`}>
                        {student.recordings.length} calls
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedStudentId === student.leadId ? 'translate-x-1' : 'group-hover:translate-x-1 text-[#D2B48C]'}`} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <Search className="w-10 h-10 text-[#D2B48C] mb-4" />
                <p className="font-medium text-[#8D6E63]">No matches</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right: Recordings Details */}
        <main className={`flex-[2] flex flex-col bg-white border border-[#F5F5DC] rounded-[2.5rem] shadow-sm overflow-hidden ${!selectedStudentId && 'hidden lg:flex'}`}>
          {selectedStudent ? (
            <>
              <div className="p-6 border-b border-[#FDFBF7] bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <button onClick={() => setSelectedStudentId(null)} className="lg:hidden p-2.5 bg-white border border-[#F5F5DC] rounded-xl text-[#8B4513]"><ArrowLeft className="w-5 h-5" /></button>
                  <div className="w-16 h-16 bg-[#F5F5DC] rounded-[1.2rem] flex items-center justify-center text-2xl font-medium text-[#8B4513]">{selectedStudent.studentName.charAt(0)}</div>
                  <div>
                    <h2 className="text-2xl font-medium text-[#3E2723]">{selectedStudent.studentName}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[#8D6E63] font-medium text-xs">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedStudent.phone}</span>
                      <span className="w-1 h-1 bg-[#D2B48C] rounded-full"></span>
                      <span className="truncate max-w-[150px] underline underline-offset-2 decoration-[#D2B48C]">{selectedStudent.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#FFFDFB]">
                <div className="max-w-2xl mx-auto space-y-10 relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#FAF3E0]"></div>
                  {selectedStudent.recordings.map((rec) => (
                    <div key={rec._id} className="relative pl-14 group">
                      <div className="absolute left-[22px] top-5 w-3.5 h-3.5 bg-white border-4 border-[#D2B48C] rounded-full z-10 group-hover:border-[#8B4513] transition-colors"></div>
                      <div className="bg-white border border-[#F5F5DC] rounded-[1.8rem] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-[#FFF9F0] rounded-xl"><Calendar className="w-4.5 h-4.5 text-[#A0522D]" /></div>
                            <div>
                              <p className="font-medium text-sm text-[#3E2723] leading-none">{new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-[10px] text-[#A1887F] font-medium mt-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(rec.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <span className={getStatusBadge(rec.status)}>{rec.status}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                          <div className="h-full">
                            <button
                              onClick={() => setSelectedRecording(rec)}
                              className="h-full w-full px-5 py-3 bg-[#8B4513] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#5D4037] transition-all shadow-md active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              Review {rec.type === "manual" ? "Status" : "Assets"}
                            </button>
                          </div>

                          {rec.type === "manual" ? (
                            <>
                              <div className="h-full">
                                <div className="h-full w-full px-5 py-3 bg-red-50 text-red-700 border border-red-100 rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-center">
                                  {rec.manualStatus?.replace("_", " ")} (Manual)
                                </div>
                              </div>

                              <div className="h-full">
                                <div className="h-full w-full px-5 py-3 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl font-medium text-sm flex items-center justify-center text-center">
                                  Analytics: N/A
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-full">
                                <div className="h-full w-full px-5 py-3 bg-[#FDF5E6] text-[#8B4513] border border-[#F5F5DC] rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-center">
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  {rec.analysis?.outcome || "Analyzed"}
                                </div>
                              </div>

                              <div className="h-full">
                                <button
                                  onClick={() => setSelectedAnalytics(rec)}
                                  className={`${getQualityBadge(
                                    rec.analysis?.areasOfImprovement?.overallCallQuality
                                  )} h-full w-full justify-center text-center`}
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  Analytics:{" "}
                                  {rec.analysis?.areasOfImprovement?.overallCallQuality || "N/A"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-[#FAF9F6]/50">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-inner"><UserIcon className="w-16 h-16 text-[#D7CCC8]" /></div>
              <h3 className="text-2xl font-medium text-[#8D6E63] mb-3">Select a Student</h3>
              <p className="text-[#A1887F] max-w-xs font-medium text-sm leading-relaxed">Choose a student to see their call history and AI analysis.</p>
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-4xl h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[#8B4513] rounded-xl flex items-center justify-center"><Headphones className="w-6 h-6 text-white" /></div>
                <div>
                  <h2 className="text-xl font-medium text-[#3E2723]">Session Intelligence</h2>
                  <p className="text-[#8D6E63] font-medium text-xs font-sans">{selectedRecording.studentName} • {new Date(selectedRecording.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecording(null)} className="w-10 h-10 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {selectedRecording.type === "manual" ? (
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-10 shadow-sm text-center space-y-4">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <Phone className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-medium text-[#3E2723]">Manual Call Log</h3>
                  <p className="text-[#8D6E63] font-medium">This report was manually logged by the student.</p>
                  <div className="inline-block px-8 py-4 bg-[#FAF9F6] border border-[#F5F5DC] rounded-2xl text-xl font-bold text-[#8B4513]">
                    {selectedRecording.manualStatus?.replace('_', ' ')}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <Play className="w-10 h-10 text-[#8B4513] fill-[#8B4513] hidden md:block" />
                    <div className="flex-1 w-full space-y-3">
                      <p className="font-medium text-[#5D4037] text-lg">Playback Recording</p>
                      <audio controls src={selectedRecording.publicUrl} className="w-full h-10 rounded-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-medium text-[#3E2723]"><FileText className="w-5 h-5 text-[#8B4513]" /> Transcript</h4>
                      <div className="bg-white p-6 rounded-[2rem] border border-[#F5F5DC] h-[300px] overflow-y-auto custom-scrollbar shadow-sm">
                        <p className="text-[#5D4037] leading-relaxed text-sm font-medium whitespace-pre-wrap">{selectedRecording.transcriptClean || selectedRecording.transcriptRaw || "Transcript pending..."}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-medium text-[#3E2723]"><BarChart2 className="w-5 h-5 text-[#8B4513]" /> AI Outcome</h4>
                      <div className="bg-[#FFF9F0] p-6 rounded-[2rem] border border-[#F5F5DC] space-y-6 shadow-sm h-[300px]">
                        {selectedRecording.analysis ? (
                          <>
                            <div>
                              <span className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">Code</span>
                              <p className="text-2xl font-medium text-[#8B4513]">{selectedRecording.analysis.outcomeCode || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">Summary</span>
                              <p className="text-[#5D4037] font-medium text-sm leading-snug">{selectedRecording.analysis.summary || "Summary pending."}</p>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1 bg-white p-3 rounded-xl border border-[#F5F5DC] text-center">
                                <p className="text-[8px] font-medium text-[#D2B48C] uppercase mb-1">Outcome</p>
                                <p className="text-xs font-medium text-[#8B4513]">{selectedRecording.analysis.outcome || "N/A"}</p>
                              </div>
                              <div className="flex-1 bg-white p-3 rounded-xl border border-[#F5F5DC] text-center">
                                <p className="text-[8px] font-medium text-[#D2B48C] uppercase mb-1">Confidence</p>
                                <p className="text-xs font-medium text-[#8B4513] capitalize">{selectedRecording.analysis.confidence || "High"}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                            <BarChart2 className="w-10 h-10 text-[#D2B48C]" />
                            <p className="text-[#A1887F] font-medium italic text-sm">AI Insight Pending</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-8 bg-white/80 border-t border-[#F5F5DC] flex justify-end">
              <button onClick={() => setSelectedRecording(null)} className="px-10 py-4 bg-[#3E2723] text-white rounded-2xl font-medium hover:bg-black transition-all shadow-lg active:scale-95">Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${(selectedAnalytics.analysis?.areasOfImprovement?.overallCallQuality || "").toLowerCase() === "good"
                      ? "bg-green-100 text-green-700"
                      : (selectedAnalytics.analysis?.areasOfImprovement?.overallCallQuality || "").toLowerCase() === "average"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }`}
                >
                  <BarChart2 className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-xl font-medium text-[#3E2723]">
                    Call Analytics
                  </h2>
                  <p className="text-[#8D6E63] font-medium text-xs">
                    {selectedAnalytics.studentName} •{" "}
                    {new Date(selectedAnalytics.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnalytics(null)}
                className="w-10 h-10 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FFFDFB]">
              <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest text-[#A1887F] font-medium mb-2">
                  Overall Call Quality
                </p>

                <span
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold capitalize ${(selectedAnalytics.analysis?.areasOfImprovement?.overallCallQuality || "").toLowerCase() === "good"
                      ? "bg-green-50 text-green-700"
                      : (selectedAnalytics.analysis?.areasOfImprovement?.overallCallQuality || "").toLowerCase() === "average"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-red-50 text-red-700"
                    }`}
                >
                  {selectedAnalytics.analysis?.areasOfImprovement?.overallCallQuality || "N/A"}
                </span>
              </div>

              <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest text-[#A1887F] font-medium mb-3">
                  Student Response Feedback
                </p>

                <p className="text-sm leading-relaxed text-[#5D4037] font-medium">
                  {selectedAnalytics.analysis?.areasOfImprovement?.studentResponseFeedback ||
                    "No student response feedback available."}
                </p>
              </div>

              {selectedAnalytics?.analysis?.areasOfImprovement?.issues?.length > 0 ? (
                <div className="bg-white border border-red-100 rounded-[2rem] p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-[#3E2723] mb-4">Issues Found</h4>

                  <div className="space-y-4">
                    {selectedAnalytics.analysis.areasOfImprovement.issues.map(
                      (issue: any, index: number) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-[#F5D7D7] bg-[#FFF8F8] p-4 space-y-2"
                        >
                          <p className="text-sm font-semibold text-red-700">
                            {issue.category || "Issue"}
                          </p>

                          <p className="text-sm text-[#5D4037]">
                            <span className="font-medium">Problem:</span> {issue.problem || "N/A"}
                          </p>

                          <p className="text-sm text-[#5D4037]">
                            <span className="font-medium">Why it matters:</span>{" "}
                            {issue.whyItMatters || "N/A"}
                          </p>

                          <p className="text-sm text-[#5D4037]">
                            <span className="font-medium">Suggestion:</span>{" "}
                            {issue.suggestion || "N/A"}
                          </p>

                          {issue.evidenceQuote && (
                            <div className="rounded-xl bg-white border border-[#EFE7E2] px-3 py-2 text-xs text-[#8D6E63] italic">
                              “{issue.evidenceQuote}”
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-green-100 rounded-[2rem] p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-[#3E2723] mb-2">Issues Found</h4>
                  <p className="text-sm text-green-700">No specific issues found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
