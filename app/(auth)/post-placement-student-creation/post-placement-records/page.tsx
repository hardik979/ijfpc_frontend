"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Calendar,
  Building,
  User,
  DollarSign,
  Clock,
  X,
  Save,
  Trash2,
  CreditCard,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

const PAYMENT_MODES = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

interface CompanyExperience {
  companyName?: string;
  yearsOfExperience?: number | null;
  pf?: boolean | null; // tri-state
  doj?: string | null; // yyyy-mm-dd
  doe?: string | null; // yyyy-mm-dd
}

interface HRContact {
  name?: string;
  contactNumber?: string;
  email?: string;
}

interface Installment {
  _id: string;
  label: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  note?: string;
}

interface PostPlacementOffer {
  _id: string;
  studentName: string;
  offerDate?: string;
  joiningDate?: string;
  companyName?: string;
  location?: string;
  hr?: HRContact;
  packageLPA?: number;
  totalPostPlacementFee: number;
  remainingPrePlacementFee: number;
  discount: number;
  installments: Installment[];
  remainingFee: number;
  remainingFeeNote?: string;
  dedupeKey: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
  companyExperience?: CompanyExperience;
}

interface NewInstallment {
  label: string;
  amount: string;
  date: string;
  mode: PaymentMode;
  note: string;
}

interface CreateStudentFormData {
  studentName: string;
  offerDate: string;
  joiningDate: string;
  companyName: string;
  location: string;
  hr: HRContact;
  packageLPA: string;
  totalPostPlacementFee: string;
  remainingPrePlacementFee: string;
  discount: string;
  remainingFeeNote: string;

  // NEW
  companyExperience: {
    companyName?: string;
    yearsOfExperience?: number | null;
    pf?: boolean | null;
    doj?: string | null; // yyyy-mm-dd
    doe?: string | null; // yyyy-mm-dd
  };
}
interface StudentDetailPanelProps {
  student: PostPlacementOffer;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (id: string, data: Partial<PostPlacementOffer>) => Promise<boolean>;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onAddInstallment: (
    studentId: string,
    data: Omit<Installment, "_id">
  ) => Promise<boolean>;
  onDeleteInstallment: (studentId: string, installmentId: string) => void;
  onUpdateInstallment: (
    studentId: string,
    installmentId: string,
    data: Partial<Omit<Installment, "_id">>
  ) => Promise<boolean>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

interface EditFormProps {
  formData: PostPlacementOffer;
  setFormData: React.Dispatch<React.SetStateAction<PostPlacementOffer>>;
}

interface CreateStudentFormProps {
  onCreate: (data: Partial<PostPlacementOffer>) => Promise<boolean>;
  onCancel: () => void;
}

const PostPlacementDashboard: React.FC = () => {
  const [students, setStudents] = useState<PostPlacementOffer[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<
    PostPlacementOffer[]
  >([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStudent, setSelectedStudent] =
    useState<PostPlacementOffer | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch students from API
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/offers/list`);
      if (!response.ok) throw new Error("Failed to fetch students");
      const data: PostPlacementOffer[] = await response.json();
      setStudents(data);
      setFilteredStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = students.filter(
      (student) =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const createStudent = async (
    studentData: Partial<PostPlacementOffer>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentData),
      });
      if (!response.ok) throw new Error("Failed to create student");
      const newStudent: PostPlacementOffer = await response.json();
      setStudents([newStudent, ...students]);
      setIsCreating(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const updateStudent = async (
    id: string,
    updateData: Partial<PostPlacementOffer>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update student");
      const updatedStudent: PostPlacementOffer = await response.json();
      setStudents(students.map((s) => (s._id === id ? updatedStudent : s)));
      setSelectedStudent(updatedStudent);
      setIsEditing(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const deleteStudent = async (id: string): Promise<void> => {
    if (!window.confirm("Are you sure you want to delete this student record?"))
      return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete student");
      setStudents(students.filter((s) => s._id !== id));
      setSelectedStudent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };
  const updateInstallment = async (
    studentId: string,
    installmentId: string,
    updateData: Partial<Omit<Installment, "_id">>
  ): Promise<boolean> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/offers/${studentId}/installments/${installmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );
      if (!res.ok) throw new Error("Failed to update installment");
      const updated: PostPlacementOffer = await res.json();
      setStudents((prev) =>
        prev.map((s) => (s._id === studentId ? updated : s))
      );
      setSelectedStudent(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const addInstallment = async (
    studentId: string,
    installmentData: Omit<Installment, "_id">
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/offers/${studentId}/installments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(installmentData),
        }
      );
      if (!response.ok) throw new Error("Failed to add installment");
      const updatedStudent: PostPlacementOffer = await response.json();
      setStudents(
        students.map((s) => (s._id === studentId ? updatedStudent : s))
      );
      setSelectedStudent(updatedStudent);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const deleteInstallment = async (
    studentId: string,
    installmentId: string
  ): Promise<void> => {
    if (!window.confirm("Are you sure you want to delete this installment?"))
      return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/offers/${studentId}/installments/${installmentId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete installment");
      const updatedStudent: PostPlacementOffer = await response.json();
      setStudents(
        students.map((s) => (s._id === studentId ? updatedStudent : s))
      );
      setSelectedStudent(updatedStudent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-purple-700 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Post Placement Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage student placements and payments
                </p>
              </div>
            </div>
            <Link href="/post-placement-student-creation/student-data-fill">
              {" "}
              <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Plus className="h-5 w-5" />
                <span>New Student</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Students List */}
          <div className="w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-purple-100">
              <div className="p-6 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No students found</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsEditing(false);
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors ${
                        selectedStudent?._id === student._id
                          ? "bg-purple-50 border-l-4 border-l-purple-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {student.studentName}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <Building className="h-4 w-4 mr-1" />
                            {student.companyName || "No company"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-600">
                            {formatCurrency(student.remainingFee)}
                          </p>
                          <p className="text-xs text-gray-500">Remaining</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="flex-1">
            {selectedStudent ? (
              <StudentDetailPanel
                student={selectedStudent}
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={updateStudent}
                onCancel={() => setIsEditing(false)}
                onDelete={deleteStudent}
                onAddInstallment={addInstallment}
                onDeleteInstallment={deleteInstallment}
                onUpdateInstallment={updateInstallment}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            ) : isCreating ? (
              <CreateStudentForm
                onCreate={createStudent}
                onCancel={() => setIsCreating(false)}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-12 text-center">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Student
                </h3>
                <p className="text-gray-600">
                  Choose a student from the list to view and edit their details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDetailPanel: React.FC<StudentDetailPanelProps> = ({
  student,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onAddInstallment,
  onDeleteInstallment,
  onUpdateInstallment,
  formatCurrency,
  formatDate,
}) => {
  const [formData, setFormData] = useState<PostPlacementOffer>(student);
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [editInst, setEditInst] = useState<{
    label: string;
    amount: string; // keep as string for inputs
    date: string; // yyyy-mm-dd
    mode: PaymentMode;
    note: string;
  }>({
    label: "",
    amount: "",
    date: "",
    mode: "UPI",
    note: "",
  });
  const [showInstallmentForm, setShowInstallmentForm] =
    useState<boolean>(false);
  const [newInstallment, setNewInstallment] = useState<NewInstallment>({
    label: "",
    amount: "",
    date: "",
    mode: "UPI",
    note: "",
  });

  useEffect(() => {
    setFormData(student);
  }, [student]);

  const handleSave = async (): Promise<void> => {
    const success = await onSave(student._id, formData);
    if (success) {
      onCancel();
    }
  };

  const handleAddInstallment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const success = await onAddInstallment(student._id, {
      ...newInstallment,
      amount: parseFloat(newInstallment.amount),
    });
    if (success) {
      setNewInstallment({
        label: "",
        amount: "",
        date: "",
        mode: "UPI",
        note: "",
      });
      setShowInstallmentForm(false);
    }
  };
  const toYMD = (d?: string) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return ""; // fallback if unparseable
    // strip timezone so the date input shows the exact day
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10); // yyyy-mm-dd
  };
  const startEdit = (inst: Installment) => {
    setEditingInstId(inst._id);
    setEditInst({
      label: inst.label ?? "",
      amount: String(inst.amount ?? ""),
      date: toYMD(inst.date),
      mode: inst.mode ?? "UPI",
      note: inst.note ?? "",
    });
  };
  const saveEdit = async () => {
    if (!editingInstId) return;
    // cast amount to number (input returns string)
    const payload = {
      ...editInst,
      amount: Number(editInst.amount) || 0,
    };
    const ok = await onUpdateInstallment(student._id, editingInstId, payload);
    if (ok) {
      setEditingInstId(null);
    }
  };

  const cancelEdit = () => {
    setEditingInstId(null);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-purple-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Student</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <EditForm formData={formData} setFormData={setFormData} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {student.studentName}
          </h2>
          <p className="text-gray-600">{student.companyName}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(student._id)}
            className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Student Name
                </label>
                <p className="text-gray-900">{student.studentName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Company
                </label>
                <p className="text-gray-900">
                  {student.companyName || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Location
                </label>
                <p className="text-gray-900">
                  {student.location || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Package (LPA)
                </label>
                <p className="text-gray-900">
                  {student.packageLPA || "Not specified"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Important Dates
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Offer Date
                </label>
                <p className="text-gray-900">
                  {formatDate(student.offerDate || "")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Joining Date
                </label>
                <p className="text-gray-900">
                  {formatDate(student.joiningDate || "")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HR Details */}
        {student.hr &&
          (student.hr.name || student.hr.contactNumber || student.hr.email) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2 text-purple-600" />
                HR Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-gray-900">
                    {student.hr.name || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Contact
                  </label>
                  <p className="text-gray-900">
                    {student.hr.contactNumber || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-gray-900">
                    {student.hr.email || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          )}
        {/* Company Experience */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2 text-purple-600" />
            Company Experience
          </h3>
          {(() => {
            const ce = student.companyExperience || {};
            const pfLabel =
              ce.pf === true ? "Yes" : ce.pf === false ? "No" : "Unknown";
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Company
                  </label>
                  <p className="text-gray-900">{ce.companyName || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Experience
                  </label>
                  <p className="text-gray-900">
                    {ce.yearsOfExperience ?? "—"}
                    {ce.yearsOfExperience != null ? " yrs" : ""}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    PF
                  </label>
                  <p className="text-gray-900">{pfLabel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    DOJ
                  </label>
                  <p className="text-gray-900">
                    {ce.doj
                      ? new Date(ce.doj).toLocaleDateString("en-IN")
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    DOE
                  </label>
                  <p className="text-gray-900">
                    {ce.doe
                      ? new Date(ce.doe).toLocaleDateString("en-IN")
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Financial Details */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
            Financial Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Total Fee</p>
              <p className="text-lg font-semibold text-purple-900">
                {formatCurrency(student.totalPostPlacementFee)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">
                Pre-Placement Fee
              </p>
              <p className="text-lg font-semibold text-blue-900">
                {formatCurrency(student.remainingPrePlacementFee)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Discount</p>
              <p className="text-lg font-semibold text-green-900">
                {formatCurrency(student.discount)}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-700">Remaining</p>
              <p className="text-lg font-semibold text-red-900">
                {formatCurrency(student.remainingFee)}
              </p>
            </div>
          </div>
        </div>

        {/* Installments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
              Payment Installments
            </h3>
            <button
              onClick={() => setShowInstallmentForm(true)}
              className="flex items-center space-x-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Payment</span>
            </button>
          </div>

          {showInstallmentForm && (
            <form
              onSubmit={handleAddInstallment}
              className="bg-gray-50 p-4 rounded-lg mb-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    required
                    value={newInstallment.label}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        label: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="1ST INSTALLMENT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    value={newInstallment.amount}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newInstallment.date}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    value={newInstallment.mode}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        mode: e.target.value as PaymentMode,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInstallmentForm(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={newInstallment.note}
                  onChange={(e) =>
                    setNewInstallment({
                      ...newInstallment,
                      note: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Receipt number, remarks..."
                />
              </div>
            </form>
          )}

          {student.installments && student.installments.length > 0 ? (
            <div className="space-y-2">
              {student.installments.map((inst) => {
                const isEditingRow = editingInstId === inst._id;
                return (
                  <div
                    key={inst._id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {isEditingRow ? (
                      /* EDIT MODE (unchanged) */

                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={editInst.label}
                            onChange={(e) =>
                              setEditInst((p) => ({
                                ...p,
                                label: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="1ST INSTALLMENT"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={editInst.amount}
                            onChange={(e) =>
                              setEditInst((p) => ({
                                ...p,
                                amount: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={editInst.date}
                            onChange={(e) =>
                              setEditInst((p) => ({
                                ...p,
                                date: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Mode
                          </label>
                          <select
                            value={editInst.mode}
                            onChange={(e) =>
                              setEditInst((p) => ({
                                ...p,
                                mode: e.target.value as PaymentMode,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {PAYMENT_MODES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">
                            Note
                          </label>
                          <input
                            type="text"
                            value={editInst.note}
                            onChange={(e) =>
                              setEditInst((p) => ({
                                ...p,
                                note: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Receipt, remarks…"
                          />
                        </div>

                        <div className="flex gap-2 md:col-span-6 justify-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE (unchanged) */
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-medium text-gray-900">
                              {inst.label}
                            </span>
                            <span className="text-purple-600 font-semibold">
                              {formatCurrency(inst.amount)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(inst.date)}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {inst.mode}
                            </span>
                          </div>
                          {inst.note && (
                            <p className="text-sm text-gray-600 mt-1">
                              {inst.note}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(inst)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              onDeleteInstallment(student._id, inst._id)
                            }
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No payments recorded yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const EditForm: React.FC<EditFormProps> = ({ formData, setFormData }) => {
  const updateField = (field: string, value: any): void => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...((prev as any)[parent] ?? {}), // 👈 fallback so we can edit nested fields
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };
  const toYMD = (d?: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Student Name *
          </label>
          <input
            type="text"
            required
            value={formData.studentName || ""}
            onChange={(e) => updateField("studentName", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={formData.companyName || ""}
            onChange={(e) => updateField("companyName", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={formData.location || ""}
            onChange={(e) => updateField("location", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Package (LPA)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.packageLPA || ""}
            onChange={(e) =>
              updateField("packageLPA", parseFloat(e.target.value) || null)
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offer Date
          </label>
          <input
            type="date"
            value={
              formData.offerDate
                ? new Date(formData.offerDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => updateField("offerDate", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joining Date
          </label>
          <input
            type="date"
            value={
              formData.joiningDate
                ? new Date(formData.joiningDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => updateField("joiningDate", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* HR Details */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          HR Contact Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HR Name
            </label>
            <input
              type="text"
              value={formData.hr?.name || ""}
              onChange={(e) => updateField("hr.name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HR Contact
            </label>
            <input
              type="text"
              value={formData.hr?.contactNumber || ""}
              onChange={(e) => updateField("hr.contactNumber", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HR Email
            </label>
            <input
              type="email"
              value={formData.hr?.email || ""}
              onChange={(e) => updateField("hr.email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      {/* Company Experience */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Company Experience
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.companyExperience?.companyName || ""}
              onChange={(e) =>
                updateField("companyExperience.companyName", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={formData.companyExperience?.yearsOfExperience ?? ""}
              onChange={(e) =>
                updateField(
                  "companyExperience.yearsOfExperience",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PF
            </label>
            <select
              value={
                formData.companyExperience?.pf === true
                  ? "true"
                  : formData.companyExperience?.pf === false
                  ? "false"
                  : ""
              }
              onChange={(e) =>
                updateField(
                  "companyExperience.pf",
                  e.target.value === "" ? null : e.target.value === "true"
                )
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DOJ
            </label>
            <input
              type="date"
              value={toYMD(formData.companyExperience?.doj ?? null)}
              onChange={(e) =>
                updateField("companyExperience.doj", e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DOE
            </label>
            <input
              type="date"
              value={toYMD(formData.companyExperience?.doe ?? null)}
              onChange={(e) =>
                updateField("companyExperience.doe", e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Financial Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Post Placement Fee
            </label>
            <input
              type="number"
              min="0"
              value={formData.totalPostPlacementFee || ""}
              onChange={(e) =>
                updateField(
                  "totalPostPlacementFee",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remaining Pre-Placement Fee
            </label>
            <input
              type="number"
              min="0"
              value={formData.remainingPrePlacementFee || ""}
              onChange={(e) =>
                updateField(
                  "remainingPrePlacementFee",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount
            </label>
            <input
              type="number"
              min="0"
              value={formData.discount || ""}
              onChange={(e) =>
                updateField("discount", parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Remaining Fee Note
        </label>
        <textarea
          rows={2}
          value={formData.remainingFeeNote || ""}
          onChange={(e) => updateField("remainingFeeNote", e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Any notes about the remaining fee..."
        />
      </div>
    </div>
  );
};

const CreateStudentForm: React.FC<CreateStudentFormProps> = ({
  onCreate,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateStudentFormData>({
    studentName: "",
    offerDate: "",
    joiningDate: "",
    companyName: "",
    location: "",
    hr: {
      name: "",
      contactNumber: "",
      email: "",
    },
    packageLPA: "",
    totalPostPlacementFee: "",
    remainingPrePlacementFee: "",
    discount: "",
    remainingFeeNote: "",
    companyExperience: {
      companyName: "",
      yearsOfExperience: null,
      pf: null,
      doj: null,
      doe: null,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const updateField = (field: string, value: any): void => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CreateStudentFormData] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    // Clean up the data before sending
    const cleanedData: Partial<PostPlacementOffer> = {
      ...formData,
      packageLPA: formData.packageLPA
        ? parseFloat(formData.packageLPA)
        : undefined,
      totalPostPlacementFee: parseFloat(formData.totalPostPlacementFee) || 0,
      remainingPrePlacementFee:
        parseFloat(formData.remainingPrePlacementFee) || 0,
      discount: parseFloat(formData.discount) || 0,
      dedupeKey: `${formData.studentName}-${
        formData.companyName
      }-${Date.now()}`,
      installments: [],
    };

    const success = await onCreate(cleanedData);
    setIsSubmitting(false);

    if (success) {
      onCancel();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Create New Student
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-2"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name *
              </label>
              <input
                type="text"
                required
                value={formData.studentName}
                onChange={(e) => updateField("studentName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter student name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package (LPA)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.packageLPA}
                onChange={(e) => updateField("packageLPA", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter package in LPA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offer Date
              </label>
              <input
                type="date"
                value={formData.offerDate}
                onChange={(e) => updateField("offerDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Joining Date
              </label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => updateField("joiningDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          {/* Company Experience */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Company Experience
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyExperience?.companyName || ""}
                  onChange={(e) =>
                    updateField("companyExperience.companyName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={formData.companyExperience?.yearsOfExperience ?? ""}
                  onChange={(e) =>
                    updateField(
                      "companyExperience.yearsOfExperience",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PF
                </label>
                <select
                  value={
                    formData.companyExperience?.pf === true
                      ? "true"
                      : formData.companyExperience?.pf === false
                      ? "false"
                      : ""
                  }
                  onChange={(e) =>
                    updateField(
                      "companyExperience.pf",
                      e.target.value === "" ? null : e.target.value === "true"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DOJ
                </label>
                <input
                  type="date"
                  value={
                    formData.companyExperience?.doj
                      ? new Date(formData.companyExperience.doj)
                          .toISOString()
                          .slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    updateField("companyExperience.doj", e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DOE
                </label>
                <input
                  type="date"
                  value={
                    formData.companyExperience?.doe
                      ? new Date(formData.companyExperience.doe)
                          .toISOString()
                          .slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    updateField("companyExperience.doe", e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* HR Details */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              HR Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Name
                </label>
                <input
                  type="text"
                  value={formData.hr.name}
                  onChange={(e) => updateField("hr.name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="HR name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Contact
                </label>
                <input
                  type="text"
                  value={formData.hr.contactNumber}
                  onChange={(e) =>
                    updateField("hr.contactNumber", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Email
                </label>
                <input
                  type="email"
                  value={formData.hr.email}
                  onChange={(e) => updateField("hr.email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="hr@company.com"
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Financial Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Post Placement Fee
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalPostPlacementFee}
                  onChange={(e) =>
                    updateField("totalPostPlacementFee", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remaining Pre-Placement Fee
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.remainingPrePlacementFee}
                  onChange={(e) =>
                    updateField("remainingPrePlacementFee", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => updateField("discount", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remaining Fee Note
            </label>
            <textarea
              rows={2}
              value={formData.remainingFeeNote}
              onChange={(e) => updateField("remainingFeeNote", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Any notes about the remaining fee..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Create Student</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostPlacementDashboard;
