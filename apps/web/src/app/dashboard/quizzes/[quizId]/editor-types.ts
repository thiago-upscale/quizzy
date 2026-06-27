import type { SaveQuizState } from "../../actions";

export type EditorQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "poll";
  imageUrl: string | null;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
};

export type BrandingState = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  backgroundDimming: "leve" | "medio" | "forte";
  logoUrl: string | null;
  showQuestionOnMobile: boolean;
};

export type QuizEditorProps = {
  branding: BrandingState;
  description: string;
  initialQuestions: EditorQuestion[];
  liveSessionAction: (formData: FormData) => void;
  quizId: string;
  saveAction: (
    state: SaveQuizState,
    formData: FormData,
  ) => Promise<SaveQuizState>;
  deleteQuizAction: (formData: FormData) => Promise<void>;
  individualSessionDefaults: {
    maxAttempts: number;
    requireParticipantEmail?: boolean;
  };
  liveSessionDefaults?: {
    requireParticipantEmail?: boolean;
  };
  sessionSummary: {
    activeLiveCount: number;
    latestLivePin: string | null;
    latestShareToken: string | null;
  };
  startIndividualSessionAction: (formData: FormData) => void;
  status: string;
  title: string;
};

export type ContrastWarning = {
  key: keyof Pick<
    BrandingState,
    "accentColor" | "primaryColor" | "secondaryColor"
  >;
  label: string;
  ratio: number;
  suggestion: string;
};

export const initialSaveState: SaveQuizState = { status: "idle" };

export const fontOptions = [
  "DM Sans",
  "Montserrat",
  "Raleway",
  "Playfair Display",
  "Space Grotesk",
];

export const acceptedImageTypes =
  "image/png,image/jpeg,image/webp,image/gif,image/avif";
