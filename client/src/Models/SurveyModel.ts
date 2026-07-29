export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type QuestionType = 'choice' | 'open_text';

export type SurveyAnswerOption = {
  id: number;
  text: string;
};

export type SurveyQuestion = {
  id: number;
  questionText: string;
  type: QuestionType;
  allowMultiple?: boolean;
  answers?: SurveyAnswerOption[];
  maxLength?: number;
};

export type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  isRewarded: boolean;
  rewardPoints: number;
  timeLimitMinutes: number;
  maxResponses: number | null;
  questions: SurveyQuestion[];
  imageUrl: string | null;
  backgroundColor: string | null;
  thankYouMessage: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  completedResponses?: number;
};

export type SurveyListItem = Pick<
  Survey,
  | 'id'
  | 'title'
  | 'description'
  | 'status'
  | 'isRewarded'
  | 'rewardPoints'
  | 'timeLimitMinutes'
  | 'maxResponses'
  | 'createdAt'
  | 'updatedAt'
> & {
  completedResponses?: number;
};

export type CreateSurveyPayload = {
  title: string;
  description?: string | null;
  questions: {
    questionText: string;
    type?: QuestionType;
    allowMultiple?: boolean;
    answers?: string[];
    maxLength?: number;
  }[];
  isRewarded?: boolean;
  rewardPoints?: number;
  timeLimitMinutes?: number;
  maxResponses?: number | null;
  thankYouMessage?: string | null;
  imageUrl?: string | null;
  backgroundColor?: string | null;
  publish?: boolean;
};

export type StartSurveyResult = {
  success: boolean;
  responseId: string;
  status: string;
  expiresAt: string;
  timeLimitMinutes: number;
  resumed: boolean;
};

export type CompleteSurveyResult = {
  success: boolean;
  response: { id: string; status: string };
  pointsAwarded: number;
  thankYouMessage: string | null;
};

export type SurveyStats = {
  surveyId: string;
  title: string;
  status: SurveyStatus;
  maxResponses: number | null;
  completed: number;
  started: number;
  expired: number;
};

export type PointTransactionType =
  | 'SURVEY_COMPLETION'
  | 'JOIN_BONUS'
  | 'REFERRAL_BONUS'
  | 'GIFT_REDEMPTION'
  | 'ADJUSTMENT';

export type PointTransaction = {
  id: string;
  amount: number;
  type: PointTransactionType;
  typeLabel: string;
  note: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type PointsSummary = {
  balance: number;
  transactions: PointTransaction[];
};
