"use client";
const openSheet = (link: string): void => {
  window.open(link, "_blank", "noopener,noreferrer");
};

const goBack = (): void => {
  window.history.back();
};
import React, { useState } from "react";
import {
  Copy,
  ExternalLink,
  Database,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

// TypeScript interfaces
interface ExcelSheet {
  id: number;
  name: string;
  description: string;
  link: string;
  category:
    | "Development"
    | "Data"
    | "Infrastructure"
    | "Design"
    | "Security"
    | "Testing";
}

type CategoryColors = {
  [key in ExcelSheet["category"]]: string;
};

// Database of Excel sheets - easily extendable
const excelSheets: ExcelSheet[] = [
  {
    id: 1,
    name: "Interview Feedback Sheet",
    description: "Frontend, Backend, and Full-stack opportunities",
    link: "https://docs.google.com/spreadsheets/d/1KlcPB1jeALX7trbqcMNBt02DzTpFc1B6yz4PBK3TZf4/edit?usp=sharing",
    category: "Development",
  },
  {
    id: 2,
    name: "Post-Placement Sheet",
    description: "Data Scientists, Analysts, and ML Engineers",
    link: "https://docs.google.com/spreadsheets/d/1aZrjuurXzR60o70hZi46fvU1bhuu26zJwZXH8-ueoVA/edit?usp=sharing",
    category: "Data",
  },
  {
    id: 3,
    name: "Ongoing Batch Sheet",
    description: "AWS, Azure, GCP, and Infrastructure roles",
    link: "https://docs.google.com/spreadsheets/d/1quNRJtrz1Z_KAXpU96zc981ynBB5dGX0nQAGbFAxUFs/edit?usp=sharing",
    category: "Infrastructure",
  },
  {
    id: 4,
    name: "Pre-Placement Sheet",
    description: "Product Designers, UI/UX specialists",
    link: "https://docs.google.com/spreadsheets/d/1cfI8e82IrHu-PponfZ-QAfJkCU2RXye2aagDSJWdBFw/edit?usp=sharing",
    category: "Design",
  },
];

const ITJobsDatabase: React.FC = () => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [notification, setNotification] = useState<boolean>(false);

  const copyToClipboard = async (link: string, id: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setNotification(true);

      // Reset notification after 3 seconds
      setTimeout(() => {
        setCopiedId(null);
        setNotification(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const goBack = (): void => {
    window.history.back();
  };

  const getCategoryColor = (category: ExcelSheet["category"]): string => {
    const colors: CategoryColors = {
      Development: "bg-purple-100 text-purple-800 border-purple-200",
      Data: "bg-blue-100 text-blue-800 border-blue-200",
      Infrastructure: "bg-green-100 text-green-800 border-green-200",
      Design: "bg-pink-100 text-pink-800 border-pink-200",
      Security: "bg-red-100 text-red-800 border-red-200",
      Testing: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-white rounded-lg shadow-xl border border-purple-200 px-6 py-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-gray-800 font-medium">
              Excel sheet link copied!
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-6 py-8 sm:px-12 lg:px-16">
          {/* Back Button */}
          <div className="max-w-7xl mx-auto mb-8">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-medium">Back</span>
            </button>
          </div>

          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-yellow-300">IT</span> Jobs Factory
            </h1>
            <h2 className="text-xl md:text-2xl text-purple-100 mb-4">
              Excel Sheet Database
            </h2>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">
              Access our comprehensive collection of IT job opportunities across
              various domains. Click to open or copy links to share with your
              network.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-16 sm:px-12 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {excelSheets.length}
              </div>
              <div className="text-purple-200">Total Sheets</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/10 border-b border-white/10">
                    <th className="text-left py-6 px-6 font-semibold text-white text-lg">
                      Sheet Name
                    </th>

                    <th className="text-center py-6 px-6 font-semibold text-white text-lg">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {excelSheets.map((sheet: ExcelSheet, index: number) => (
                    <tr
                      key={sheet.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-all duration-300 group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <td className="py-6 px-6">
                        <div className="flex items-center gap-3">
                          <div>
                            <button
                              onClick={() => openSheet(sheet.link)}
                              className="text-white font-medium text-lg hover:text-purple-200 transition-colors duration-200 text-left"
                            >
                              {sheet.name}
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-6 px-6">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => openSheet(sheet.link)}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-colors duration-200 group/btn"
                            title="Open Sheet"
                          >
                            <ExternalLink className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() =>
                              copyToClipboard(sheet.link, sheet.id)
                            }
                            className={`p-2 rounded-lg transition-all duration-200 group/btn ${
                              copiedId === sheet.id
                                ? "bg-green-600 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white"
                            }`}
                            title="Copy Link"
                          >
                            {copiedId === sheet.id ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-purple-300 text-sm">
              Need to add a new sheet? Update the{" "}
              <code className="bg-white/10 px-2 py-1 rounded text-purple-200">
                excelSheets
              </code>{" "}
              array in the component.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITJobsDatabase;
