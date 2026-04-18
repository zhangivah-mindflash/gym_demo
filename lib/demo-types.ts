export type Role = "member" | "coach" | "admin";

export type UserSession = {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  role: Role | null;
  displayName: string | null;
  memberId: string | null;
  coachId: string | null;
  locationName: string | null;
};

export type MemberProfile = {
  id: string;
  memberName: string;
  coachName: string;
  coachId: string;
  locationName: string;
  age: number;
  sex: string;
  heightCm: number;
  weightKg: number;
  goalLabel: string;
  goalWindow: string;
  trainingDays: number;
  sessionMinutes: number;
  equipmentAccess: string;
  trainingLevel: string;
  injuryHistory: string;
  dietPreference: string;
  wearablePermissionStatus: string;
  lastCoachEditReason: string;
  planVersion: number;
  updatedAt: string;
};

export type PlanDay = {
  id: string;
  memberId: string;
  dayLabel: string;
  focus: string;
  duration: string;
  intensity: string;
  completed: boolean;
  coachNote: string;
};

export type WeeklyPlan = {
  memberId: string;
  version: number;
  days: PlanDay[];
};

export type CoachEdit = {
  id: string;
  memberId: string;
  dayId: string;
  exercise: string;
  editor: string;
  aiVersion: string;
  coachVersion: string;
  reason: string;
  createdAt: string;
};

export type KnowledgeBaseEntry = {
  id: string;
  name: string;
  description: string;
  documents: number;
  enabled: boolean;
  category: string;
  updatedAt: string;
};

export type ModelSetting = {
  id: string;
  label: string;
  value: string;
  group?: string;
  helpText?: string;
  inputType?: "text" | "textarea" | "password";
  placeholder?: string;
  secret?: boolean;
};

export type AssistantMode = "plan" | "guidance" | "review";

export type AssistantPlanDay = {
  dayLabel: string;
  focus: string;
  duration: string;
  intensity: string;
  note: string;
};

export type AssistantCitation = {
  title: string;
  source: string;
  note: string;
};

export type AssistantResponse = {
  mode: AssistantMode;
  title: string;
  summary: string;
  highlights: string[];
  trainingPlan: AssistantPlanDay[];
  nutritionTips: string[];
  guidancePoints: string[];
  reviewInsights: string[];
  recoveryActions: string[];
  safetyFlags: string[];
  citations: AssistantCitation[];
  nextSteps: string[];
  providerLabel: string;
  disclaimer: string;
  usedFallback: boolean;
};

export type AppliedAssistantOutput = AssistantResponse & {
  appliedAt: string;
};

export type CoachQueueItem = {
  id: string;
  memberId: string;
  member: string;
  location: string;
  task: string;
  owner: string;
  status: string;
  createdAt: string;
};

export type UserGroup = {
  coach: string;
  location: string;
  members: number;
};

export type ReviewRecord = {
  id: string;
  memberId: string;
  memberName: string;
  coachName: string;
  locationName: string;
  completedSessions: number;
  totalSessions: number;
  fatigueScore: number;
  weightChangeKg: number;
  note: string;
  riskLevel: "normal" | "watch" | "high";
  nextAdjustment: string;
  createdAt: string;
};

export type MemberListItem = {
  id: string;
  memberName: string;
  coachName: string;
  coachId: string;
  locationName: string;
  goalLabel: string;
  trainingLevel: string;
  planVersion: number;
  latestReviewRisk: "normal" | "watch" | "high";
  updatedAt: string;
};

export type DemoState = {
  session: UserSession;
  currentRole: Role;
  memberProfile: MemberProfile;
  weeklyPlan: WeeklyPlan;
  coachEdits: CoachEdit[];
  knowledgeBase: KnowledgeBaseEntry[];
  modelSettings: ModelSetting[];
  coachQueue: CoachQueueItem[];
  usersByCoach: UserGroup[];
  review: ReviewRecord;
  members: MemberListItem[];
  reviews: ReviewRecord[];
  appliedAssistantOutputs: {
    plan: AppliedAssistantOutput | null;
    guidance: AppliedAssistantOutput | null;
    review: AppliedAssistantOutput | null;
  };
};
