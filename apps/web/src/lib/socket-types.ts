export type SessionStatus =
  | "waiting"
  | "countdown"
  | "playing"
  | "question_result"
  | "interrupted"
  | "finished";

export type InterruptionReason = "host_disconnected" | null;

export type LeaderboardEntry = {
  answeredCurrentQuestion: boolean;
  avatar: string;
  currentStreak: number;
  id: string;
  lastIsCorrect: boolean | null;
  lastPointsEarned: number;
  nickname: string;
  rank: number;
  score: number;
  totalTimeMs: number;
};

export type SessionStatePayload = {
  connectedParticipantsCount: number;
  countdownSeconds: number | null;
  hostRecoveryDeadlineAt: number | null;
  hostLastSeenAt: number | null;
  hostPresenceStatus: "offline" | "online";
  interruptionReason: InterruptionReason;
  lastEventAt: number | null;
  offlineParticipantsCount: number;
  rejectedAnswersCount: number;
  status: SessionStatus;
};

export type ActiveQuestion = {
  id: string;
  imageUrl: string | null;
  options: string[];
  orderIndex: number;
  prompt: string;
  startedAt: number;
  serverNow: number;
  submittedCount: number;
  timeLimitSeconds: number;
  totalQuestions: number;
  type: "multiple_choice" | "true_false" | "poll";
};

export type QuestionResult = {
  correctCount: number;
  correctOptionIndex: number;
  imageUrl: string | null;
  leaderboard: LeaderboardEntry[];
  options: string[];
  prompt: string;
  questionId: string;
  questionOrderIndex: number;
  questionType: "multiple_choice" | "true_false" | "poll";
  submittedCount: number;
  totalQuestions: number;
  voteCounts: number[];
};
