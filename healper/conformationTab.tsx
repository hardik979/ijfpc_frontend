"use client";
import React from "react";

type ConfirmColor = "red" | "blue" | "green";

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: ConfirmColor;
  loading?: boolean;
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "red",
  loading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const confirmColorClasses: Record<ConfirmColor, string> = {
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-white rounded-md transition font-medium ${
              confirmColorClasses[confirmColor]
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
