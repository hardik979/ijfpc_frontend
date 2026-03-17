export type RecordingStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "TRANSCRIBING"
  | "CLEANING"
  | "ANALYZING"
  | "DONE"
  | "FAILED";

export type Recording = {
  _id: string;
  leadId: string;
  agentId?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  r2ObjectKey: string;
  publicUrl: string;
  status: RecordingStatus;
  transcriptRaw?: string;
  transcriptClean?: string;
  analysis?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type ListRecordingsResponse = {
  ok: boolean;
  items: Recording[];
  total: number;
  page: number;
  limit: number;
};
