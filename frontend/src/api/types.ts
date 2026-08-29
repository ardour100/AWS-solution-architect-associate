/** DTOs mirroring the backend responses (backend/src/*). */

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface ApiErrorBody {
  error?: string;
  details?: Array<{ path: string; message: string }>;
}

/** Question option as returned by admin question endpoints (includes the answer key). */
export interface AdminOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface QuestionView {
  id: string;
  groupId: string;
  version: number;
  isLatest: boolean;
  isDeleted: boolean;
  title: string;
  explanation: string;
  qType: 'single' | 'multiple';
  createdAt: string;
  options: AdminOption[];
}

export interface QuestionListResult {
  items: QuestionView[];
  total: number;
}

/** Question option inside an exam — the answer key is stripped by the backend. */
export interface ExamOption {
  id: string;
  label: string;
  content: string;
}

export interface ExamRecordView {
  id: string;
  questionId: string;
  title: string;
  qType: 'single' | 'multiple';
  explanation?: string;
  selectedOptionIds: string[];
  correctOptionIds?: string[];
  isCorrect?: boolean;
  options: ExamOption[];
}

export interface ExamView {
  id: string;
  userId: string | null;
  status: 'in_progress' | 'completed';
  totalCount: number;
  correctCount: number;
  createdAt: string;
  completedAt: string | null;
  records: ExamRecordView[];
}
