"use client";

import { useId, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  Image as ImageIcon,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  OFFER_LETTER_ACCEPT,
  validateOfferLetter,
} from "@/lib/postPlacementOfferLetter";
import styles from "./OfferLetterUpload.module.css";

gsap.registerPlugin(useGSAP);

interface OfferLetterUploadProps {
  file: File | null;
  onFileChange?: (file: File | null) => void;
  existingUrl?: string;
  existingName?: string;
  uploadedAt?: string;
  isUploading?: boolean;
  uploadError?: string;
  onUpload?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function OfferLetterUpload({
  file,
  onFileChange = () => undefined,
  existingUrl,
  existingName,
  uploadedAt,
  isUploading = false,
  uploadError = "",
  onUpload,
  disabled = false,
  readOnly = false,
  className = "",
}: OfferLetterUploadProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const error = localError || uploadError;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".offer-letter-state",
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.24,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    {
      scope: rootRef,
      dependencies: [file?.name, existingUrl, isUploading, error],
      revertOnUpdate: true,
    },
  );

  const handleFile = (nextFile?: File) => {
    if (!nextFile) return;
    const validationError = validateOfferLetter(nextFile);
    if (validationError) {
      setLocalError(validationError);
      onFileChange(null);
      return;
    }
    setLocalError("");
    onFileChange(nextFile);
  };

  const clearSelection = () => {
    setLocalError("");
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const activeName = file?.name || existingName || "Offer letter";
  const isImage = file?.type.startsWith("image/");

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`}>
      {!readOnly ? (
        <input
          ref={inputRef}
          id={inputId}
          className={styles.hiddenInput}
          type="file"
          accept={OFFER_LETTER_ACCEPT}
          disabled={disabled || isUploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      ) : null}

      <div className={styles.headingRow}>
        <div className={styles.headingGroup}>
          <span className={styles.iconBox}>
            <FileText size={19} aria-hidden="true" />
          </span>
          <div>
            <h3 className={styles.title}>Offer letter</h3>
            <p className={styles.subtitle}>PDF, JPG, PNG, or WebP · Maximum 10 MB</p>
          </div>
        </div>
        <span className={styles.securityNote}>
          <ShieldCheck size={14} aria-hidden="true" /> Stored securely in R2
        </span>
      </div>

      <div className={`${styles.state} offer-letter-state`} aria-live="polite">
        <div className={styles.fileSummary}>
          <span className={styles.fileIcon}>
            {isImage ? (
              <ImageIcon size={19} aria-hidden="true" />
            ) : (
              <FileText size={19} aria-hidden="true" />
            )}
          </span>
          <div className={styles.fileCopy}>
            <p className={styles.fileName}>
              {file || existingUrl ? activeName : "No offer letter attached"}
            </p>
            <p className={styles.fileMeta}>
              {file
                ? `${formatBytes(file.size)} · Ready to upload`
                : existingUrl
                  ? uploadedAt
                    ? `Uploaded ${new Date(uploadedAt).toLocaleDateString("en-IN")}`
                    : "Available to view"
                  : "Choose the signed or issued document for this placement."}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          {existingUrl && !file ? (
            <a
              className={styles.viewButton}
              href={existingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} aria-hidden="true" /> View
            </a>
          ) : null}
          {file && !readOnly ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={clearSelection}
              disabled={disabled || isUploading}
            >
              <X size={15} aria-hidden="true" /> Remove
            </button>
          ) : null}
          {!readOnly ? (
            <label
              htmlFor={inputId}
              className={`${styles.chooseButton} ${disabled || isUploading ? styles.disabled : ""}`}
              aria-disabled={disabled || isUploading}
            >
              <FileUp size={16} aria-hidden="true" />
              {existingUrl ? "Replace file" : "Choose file"}
            </label>
          ) : null}
          {file && onUpload && !readOnly ? (
            <button
              type="button"
              className={styles.uploadButton}
              onClick={onUpload}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <LoaderCircle className={styles.spinner} size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              {isUploading ? "Uploading…" : existingUrl ? "Save replacement" : "Upload now"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!onUpload && file && !error && !readOnly ? (
        <p className={styles.readyNote}>
          The file will upload automatically after the record is created.
        </p>
      ) : null}
    </div>
  );
}
