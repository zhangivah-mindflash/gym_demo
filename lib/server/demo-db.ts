import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { demoAccounts, initialDemoState } from "@/lib/mock-data";
import { defaultModelSettings, withModelSettingMeta } from "@/lib/model-settings";
import type {
  AppliedAssistantOutput,
  AssistantResponse,
  CoachEdit,
  CoachQueueItem,
  DemoState,
  KnowledgeBaseEntry,
  MemberListItem,
  MemberProfile,
  ModelSetting,
  ReviewRecord,
  Role,
  UserGroup,
  UserSession,
  WeeklyPlan,
} from "@/lib/demo-types";

type BetterSqlite = InstanceType<typeof Database>;

type DbUser = {
  id: string;
  username: string;
  password: string;
  role: Role;
  display_name: string;
  member_id: string | null;
  coach_id: string | null;
  location_name: string | null;
};

declare global {
  var __demoDb: BetterSqlite | undefined;
}

function dbPath() {
  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "app.sqlite");
}

function boolToInt(value: boolean) {
  return value ? 1 : 0;
}

function intToBool(value: number) {
  return value === 1;
}

function containsRiskSignal(note: string) {
  return /(痛|疼|晕|眩晕|胸闷|旧伤|麻|不适)/.test(note);
}

function deriveAdjustmentText(payload: { completedSessions: number; fatigueScore: number; note: string }) {
  if (payload.fatigueScore >= 8 || containsRiskSignal(payload.note)) {
    return "降低下肢训练总量并提醒教练线下复查动作。";
  }
  if (payload.completedSessions < 3) {
    return "保持核心训练结构，缩短单次训练长度以提升依从性。";
  }
  return "维持当前减脂节奏，追加低冲击有氧并小幅推进负荷。";
}

function deriveRiskLevel(payload: { fatigueScore: number; note: string }): ReviewRecord["riskLevel"] {
  if (payload.fatigueScore >= 8 || containsRiskSignal(payload.note)) {
    return "high";
  }
  if (payload.fatigueScore >= 6) {
    return "watch";
  }
  return "normal";
}

function getDb() {
  if (!global.__demoDb) {
    global.__demoDb = new Database(dbPath());
    global.__demoDb.pragma("journal_mode = WAL");
    initialize(global.__demoDb);
  }
  return global.__demoDb;
}

function initialize(db: BetterSqlite) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      display_name TEXT NOT NULL,
      member_id TEXT,
      coach_id TEXT,
      location_name TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      member_name TEXT NOT NULL,
      coach_name TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      location_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      height_cm INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      goal_label TEXT NOT NULL,
      goal_window TEXT NOT NULL,
      training_days INTEGER NOT NULL,
      session_minutes INTEGER NOT NULL,
      equipment_access TEXT NOT NULL,
      training_level TEXT NOT NULL,
      injury_history TEXT NOT NULL,
      diet_preference TEXT NOT NULL,
      wearable_permission_status TEXT NOT NULL,
      last_coach_edit_reason TEXT NOT NULL,
      plan_version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_days (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      day_label TEXT NOT NULL,
      focus TEXT NOT NULL,
      duration TEXT NOT NULL,
      intensity TEXT NOT NULL,
      completed INTEGER NOT NULL,
      coach_note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coach_edits (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      day_id TEXT NOT NULL,
      exercise TEXT NOT NULL,
      editor TEXT NOT NULL,
      ai_version TEXT NOT NULL,
      coach_version TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      documents INTEGER NOT NULL,
      enabled INTEGER NOT NULL,
      category TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_settings (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      coach_name TEXT NOT NULL,
      location_name TEXT NOT NULL,
      completed_sessions INTEGER NOT NULL,
      total_sessions INTEGER NOT NULL,
      fatigue_score INTEGER NOT NULL,
      weight_change_kg REAL NOT NULL,
      note TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      next_adjustment TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coach_queue (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member TEXT NOT NULL,
      location TEXT NOT NULL,
      task TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistant_outputs (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      payload TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const seeded = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (seeded.count === 0) {
    seed(db);
  }

  ensureModelSettings(db);
}

function ensureModelSettings(db: BetterSqlite) {
  const insert = db.prepare("INSERT OR IGNORE INTO model_settings (id, label, value) VALUES (?, ?, ?)");
  const updateLabel = db.prepare("UPDATE model_settings SET label = ? WHERE id = ?");
  const allowedIds = defaultModelSettings().map((setting) => setting.id);
  defaultModelSettings().forEach((setting) => {
    insert.run(setting.id, setting.label, setting.value);
    updateLabel.run(setting.label, setting.id);
  });
  db.prepare(
    `DELETE FROM model_settings WHERE id NOT IN (${allowedIds.map(() => "?").join(", ")})`,
  ).run(...allowedIds);
}

function seed(db: BetterSqlite) {
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password, role, display_name, member_id, coach_id, location_name)
    VALUES (@id, @username, @password, @role, @display_name, @member_id, @coach_id, @location_name)
  `);
  const insertMember = db.prepare(`
    INSERT INTO members (
      id, member_name, coach_name, coach_id, location_name, age, sex, height_cm, weight_kg,
      goal_label, goal_window, training_days, session_minutes, equipment_access, training_level,
      injury_history, diet_preference, wearable_permission_status, last_coach_edit_reason, plan_version, updated_at
    ) VALUES (
      @id, @member_name, @coach_name, @coach_id, @location_name, @age, @sex, @height_cm, @weight_kg,
      @goal_label, @goal_window, @training_days, @session_minutes, @equipment_access, @training_level,
      @injury_history, @diet_preference, @wearable_permission_status, @last_coach_edit_reason, @plan_version, @updated_at
    )
  `);
  const insertPlanDay = db.prepare(`
    INSERT INTO plan_days (id, member_id, day_label, focus, duration, intensity, completed, coach_note)
    VALUES (@id, @member_id, @day_label, @focus, @duration, @intensity, @completed, @coach_note)
  `);
  const insertCoachEdit = db.prepare(`
    INSERT INTO coach_edits (id, member_id, day_id, exercise, editor, ai_version, coach_version, reason, created_at)
    VALUES (@id, @member_id, @day_id, @exercise, @editor, @ai_version, @coach_version, @reason, @created_at)
  `);
  const insertKnowledgeBase = db.prepare(`
    INSERT INTO knowledge_base (id, name, description, documents, enabled, category, updated_at)
    VALUES (@id, @name, @description, @documents, @enabled, @category, @updated_at)
  `);
  const insertModelSetting = db.prepare(`
    INSERT INTO model_settings (id, label, value) VALUES (@id, @label, @value)
  `);
  const insertReview = db.prepare(`
    INSERT INTO reviews (
      id, member_id, member_name, coach_name, location_name,
      completed_sessions, total_sessions, fatigue_score, weight_change_kg, note, risk_level, next_adjustment, created_at
    ) VALUES (
      @id, @member_id, @member_name, @coach_name, @location_name,
      @completed_sessions, @total_sessions, @fatigue_score, @weight_change_kg, @note, @risk_level, @next_adjustment, @created_at
    )
  `);
  const insertQueue = db.prepare(`
    INSERT INTO coach_queue (id, member_id, member, location, task, owner, status, created_at)
    VALUES (@id, @member_id, @member, @location, @task, @owner, @status, @created_at)
  `);

  const members = [
    initialDemoState.memberProfile,
    {
      id: "member-zhou",
      memberName: "周可心",
      coachName: "教练 王洁",
      coachId: "coach-wang",
      locationName: "PulseLab 静安店",
      age: 26,
      sex: "女",
      heightCm: 166,
      weightKg: 56,
      goalLabel: "改善体态与核心稳定",
      goalWindow: "2026-04-05 至 2026-05-30",
      trainingDays: 3,
      sessionMinutes: 50,
      equipmentAccess: "健身房",
      trainingLevel: "新手",
      injuryHistory: "无明显伤病史。",
      dietPreference: "高蛋白、轻断食谨慎使用",
      wearablePermissionStatus: "已授权心率数据",
      lastCoachEditReason: "动作熟练度提升后，加入更多核心稳定训练。",
      planVersion: 2,
      updatedAt: "2026-04-16T10:00:00.000Z",
    },
    {
      id: "member-song",
      memberName: "宋一帆",
      coachName: "教练 林策",
      coachId: "coach-lin",
      locationName: "PulseLab 浦东店",
      age: 31,
      sex: "男",
      heightCm: 182,
      weightKg: 81,
      goalLabel: "增肌与卧推表现提升",
      goalWindow: "2026-03-20 至 2026-06-20",
      trainingDays: 4,
      sessionMinutes: 60,
      equipmentAccess: "健身房",
      trainingLevel: "进阶",
      injuryHistory: "卧推后肩前侧偶有不适。",
      dietPreference: "高蛋白高碳水",
      wearablePermissionStatus: "待接入",
      lastCoachEditReason: "肩前侧不适，降低推动作总量。",
      planVersion: 4,
      updatedAt: "2026-04-16T08:00:00.000Z",
    },
    {
      id: "member-lin",
      memberName: "林诗语",
      coachName: "教练 李安",
      coachId: "coach-li",
      locationName: "PulseLab 徐汇店",
      age: 34,
      sex: "女",
      heightCm: 162,
      weightKg: 58,
      goalLabel: "产后恢复基础训练",
      goalWindow: "2026-04-10 至 2026-06-10",
      trainingDays: 2,
      sessionMinutes: 40,
      equipmentAccess: "健身房",
      trainingLevel: "新手",
      injuryHistory: "产后恢复阶段，避免高冲击动作。",
      dietPreference: "规律饮食",
      wearablePermissionStatus: "待接入",
      lastCoachEditReason: "优先保证呼吸与核心控制，不加大冲击。",
      planVersion: 1,
      updatedAt: "2026-04-15T14:00:00.000Z",
    },
    {
      id: "member-guo",
      memberName: "郭子航",
      coachName: "教练 王洁",
      coachId: "coach-wang",
      locationName: "PulseLab 静安店",
      age: 22,
      sex: "男",
      heightCm: 188,
      weightKg: 79,
      goalLabel: "篮球专项体能提升",
      goalWindow: "2026-04-01 至 2026-07-01",
      trainingDays: 5,
      sessionMinutes: 55,
      equipmentAccess: "健身房",
      trainingLevel: "高级",
      injuryHistory: "踝关节旧伤已恢复。",
      dietPreference: "高碳水训练期",
      wearablePermissionStatus: "已授权运动手表",
      lastCoachEditReason: "增加单腿稳定与落地控制训练。",
      planVersion: 5,
      updatedAt: "2026-04-14T17:00:00.000Z",
    },
    {
      id: "member-he",
      memberName: "何予安",
      coachName: "教练 林策",
      coachId: "coach-lin",
      locationName: "PulseLab 浦东店",
      age: 29,
      sex: "女",
      heightCm: 168,
      weightKg: 63,
      goalLabel: "减脂与代谢提升",
      goalWindow: "2026-04-08 至 2026-06-08",
      trainingDays: 3,
      sessionMinutes: 45,
      equipmentAccess: "居家 + 有限器械",
      trainingLevel: "新手",
      injuryHistory: "久坐导致下背紧张。",
      dietPreference: "轻量高蛋白",
      wearablePermissionStatus: "待接入",
      lastCoachEditReason: "优先动作学习与低冲击代谢训练。",
      planVersion: 2,
      updatedAt: "2026-04-13T09:00:00.000Z",
    },
  ];

  const planTemplate = (memberId: string) => [
    {
      id: `${memberId}-day-1`,
      member_id: memberId,
      day_label: "Day 1",
      focus: "上肢推拉 + 核心",
      duration: "45 分钟",
      intensity: "RPE 7",
      completed: 1,
      coach_note: "维持动作质量，控制节奏。",
    },
    {
      id: `${memberId}-day-2`,
      member_id: memberId,
      day_label: "Day 2",
      focus: "下肢稳定 + 有氧",
      duration: "45 分钟",
      intensity: "RPE 6-7",
      completed: memberId === "member-chen" ? 1 : 0,
      coach_note: "优先动作稳定，再考虑推进强度。",
    },
    {
      id: `${memberId}-day-3`,
      member_id: memberId,
      day_label: "Day 3",
      focus: "后链 + 核心抗旋转",
      duration: "45 分钟",
      intensity: "RPE 7",
      completed: 0,
      coach_note: "动作标准优先。",
    },
    {
      id: `${memberId}-day-4`,
      member_id: memberId,
      day_label: "Day 4",
      focus: "代谢循环",
      duration: "45 分钟",
      intensity: "RPE 7-8",
      completed: 0,
      coach_note: "根据状态调整有氧方式。",
    },
  ];

  const tx = db.transaction(() => {
    const accountRows = [
      {
        id: "user-member-chen",
        username: "member_chen",
        password: "123456",
        role: "member",
        display_name: "陈奕辰",
        member_id: "member-chen",
        coach_id: null,
        location_name: "PulseLab 徐汇店",
      },
      {
        id: "user-member-zhou",
        username: "member_zhou",
        password: "123456",
        role: "member",
        display_name: "周可心",
        member_id: "member-zhou",
        coach_id: null,
        location_name: "PulseLab 静安店",
      },
      {
        id: "user-coach-li",
        username: "coach_li",
        password: "123456",
        role: "coach",
        display_name: "教练 李安",
        member_id: null,
        coach_id: "coach-li",
        location_name: "PulseLab 徐汇店",
      },
      {
        id: "user-admin-root",
        username: "admin_root",
        password: "123456",
        role: "admin",
        display_name: "总部运营",
        member_id: null,
        coach_id: null,
        location_name: "PulseLab 总部",
      },
    ];

    accountRows.forEach((row) => insertUser.run(row));
    members.forEach((member) =>
      insertMember.run({
        id: member.id,
        member_name: member.memberName,
        coach_name: member.coachName,
        coach_id: member.coachId,
        location_name: member.locationName,
        age: member.age,
        sex: member.sex,
        height_cm: member.heightCm,
        weight_kg: member.weightKg,
        goal_label: member.goalLabel,
        goal_window: member.goalWindow,
        training_days: member.trainingDays,
        session_minutes: member.sessionMinutes,
        equipment_access: member.equipmentAccess,
        training_level: member.trainingLevel,
        injury_history: member.injuryHistory,
        diet_preference: member.dietPreference,
        wearable_permission_status: member.wearablePermissionStatus,
        last_coach_edit_reason: member.lastCoachEditReason,
        plan_version: member.planVersion,
        updated_at: member.updatedAt,
      }),
    );

    members.flatMap((member) => planTemplate(member.id)).forEach((row) => insertPlanDay.run(row));
    initialDemoState.coachEdits.forEach((edit) =>
      insertCoachEdit.run({
        id: edit.id,
        member_id: edit.memberId,
        day_id: edit.dayId,
        exercise: edit.exercise,
        editor: edit.editor,
        ai_version: edit.aiVersion,
        coach_version: edit.coachVersion,
        reason: edit.reason,
        created_at: edit.createdAt,
      }),
    );
    initialDemoState.knowledgeBase.forEach((entry) =>
      insertKnowledgeBase.run({
        ...entry,
        enabled: boolToInt(entry.enabled),
        updated_at: entry.updatedAt,
      }),
    );
    initialDemoState.modelSettings.forEach((setting) => insertModelSetting.run(setting));
    initialDemoState.reviews.forEach((review) =>
      insertReview.run({
        id: review.id,
        member_id: review.memberId,
        member_name: review.memberName,
        coach_name: review.coachName,
        location_name: review.locationName,
        completed_sessions: review.completedSessions,
        total_sessions: review.totalSessions,
        fatigue_score: review.fatigueScore,
        weight_change_kg: review.weightChangeKg,
        note: review.note,
        risk_level: review.riskLevel,
        next_adjustment: review.nextAdjustment,
        created_at: review.createdAt,
      }),
    );
    initialDemoState.coachQueue.forEach((item) =>
      insertQueue.run({
        id: item.id,
        member_id: item.memberId,
        member: item.member,
        location: item.location,
        task: item.task,
        owner: item.owner,
        status: item.status,
        created_at: item.createdAt,
      }),
    );
  });

  tx();
}

function mapSession(user?: DbUser): UserSession {
  if (!user) {
    return {
      isAuthenticated: false,
      userId: null,
      username: null,
      role: null,
      displayName: null,
      memberId: null,
      coachId: null,
      locationName: null,
    };
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    memberId: user.member_id,
    coachId: user.coach_id,
    locationName: user.location_name,
  };
}

function getUserById(userId?: string | null) {
  if (!userId) return undefined;
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as DbUser | undefined;
}

export function verifyUser(username: string, password: string) {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as DbUser | undefined;
  if (!user || user.password !== password) {
    return null;
  }
  return mapSession(user);
}

function accessibleMembers(user?: DbUser) {
  const db = getDb();
  if (!user) return [];
  if (user.role === "member" && user.member_id) {
    return db.prepare("SELECT * FROM members WHERE id = ?").all(user.member_id) as Array<Record<string, string | number>>;
  }
  if (user.role === "coach" && user.coach_id) {
    return db.prepare("SELECT * FROM members WHERE coach_id = ? ORDER BY updated_at DESC").all(user.coach_id) as Array<
      Record<string, string | number>
    >;
  }
  return db.prepare("SELECT * FROM members ORDER BY updated_at DESC").all() as Array<Record<string, string | number>>;
}

function accessibleReviews(user?: DbUser) {
  const db = getDb();
  if (!user) return [];
  if (user.role === "member" && user.member_id) {
    return db.prepare("SELECT * FROM reviews WHERE member_id = ? ORDER BY created_at DESC").all(user.member_id) as Array<
      Record<string, string | number>
    >;
  }
  if (user.role === "coach" && user.coach_id) {
    return db.prepare("SELECT * FROM reviews WHERE coach_name LIKE ? ORDER BY created_at DESC").all(`%${user.display_name?.replace("教练 ", "") ?? ""}%`) as Array<
      Record<string, string | number>
    >;
  }
  return db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all() as Array<Record<string, string | number>>;
}

function accessibleQueue(user?: DbUser) {
  const db = getDb();
  if (!user) return [];
  if (user.role === "member" && user.member_id) {
    return db.prepare("SELECT * FROM coach_queue WHERE member_id = ? ORDER BY created_at DESC").all(user.member_id) as Array<
      Record<string, string>
    >;
  }
  if (user.role === "coach") {
    return db.prepare("SELECT * FROM coach_queue WHERE owner = ? ORDER BY created_at DESC").all(user.display_name) as Array<
      Record<string, string>
    >;
  }
  return db.prepare("SELECT * FROM coach_queue ORDER BY created_at DESC").all() as Array<Record<string, string>>;
}

function mapMemberListItem(row: Record<string, string | number>, latestRisk: ReviewRecord["riskLevel"]): MemberListItem {
  return {
    id: String(row.id),
    memberName: String(row.member_name),
    coachName: String(row.coach_name),
    coachId: String(row.coach_id),
    locationName: String(row.location_name),
    goalLabel: String(row.goal_label),
    trainingLevel: String(row.training_level),
    planVersion: Number(row.plan_version),
    latestReviewRisk: latestRisk,
    updatedAt: String(row.updated_at),
  };
}

function mapReview(row: Record<string, string | number>): ReviewRecord {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    memberName: String(row.member_name),
    coachName: String(row.coach_name),
    locationName: String(row.location_name),
    completedSessions: Number(row.completed_sessions),
    totalSessions: Number(row.total_sessions),
    fatigueScore: Number(row.fatigue_score),
    weightChangeKg: Number(row.weight_change_kg),
    note: String(row.note),
    riskLevel: String(row.risk_level) as ReviewRecord["riskLevel"],
    nextAdjustment: String(row.next_adjustment),
    createdAt: String(row.created_at),
  };
}

function currentMemberId(user: DbUser | undefined, selectedMemberId?: string | null) {
  if (!user) return initialDemoState.memberProfile.id;
  if (user.role === "member" && user.member_id) return user.member_id;
  const visible = accessibleMembers(user);
  const ids = new Set(visible.map((row) => String(row.id)));
  if (selectedMemberId && ids.has(selectedMemberId)) {
    return selectedMemberId;
  }
  return visible.length > 0 ? String(visible[0].id) : initialDemoState.memberProfile.id;
}

function buildGroups(members: Array<Record<string, string | number>>): UserGroup[] {
  const map = new Map<string, UserGroup>();
  members.forEach((row) => {
    const key = `${row.coach_name}-${row.location_name}`;
    const current = map.get(key);
    if (current) {
      current.members += 1;
    } else {
      map.set(key, {
        coach: String(row.coach_name),
        location: String(row.location_name),
        members: 1,
      });
    }
  });
  return Array.from(map.values());
}

function defaultDemoState(): DemoState {
  return {
    ...initialDemoState,
    modelSettings: initialDemoState.modelSettings.map((setting) => withModelSettingMeta(setting, false)),
  };
}

function mapAppliedAssistantOutput(row?: { payload: string; applied_at: string } | undefined): AppliedAssistantOutput | null {
  if (!row) return null;

  try {
    const payload = JSON.parse(row.payload) as AssistantResponse;
    return {
      ...payload,
      appliedAt: row.applied_at,
    };
  } catch {
    return null;
  }
}

export function getDemoState(userId?: string | null, selectedMemberId?: string | null): DemoState {
  const db = getDb();
  const user = getUserById(userId);
  if (!user) {
    return defaultDemoState();
  }

  const membersRows = accessibleMembers(user);
  const reviewsRows = accessibleReviews(user);
  const reviews = reviewsRows.map(mapReview);
  const reviewRiskByMember = new Map<string, ReviewRecord["riskLevel"]>();
  reviews.forEach((review) => {
    if (!reviewRiskByMember.has(review.memberId)) {
      reviewRiskByMember.set(review.memberId, review.riskLevel);
    }
  });

  const members = membersRows.map((row) =>
    mapMemberListItem(row, reviewRiskByMember.get(String(row.id)) ?? "normal"),
  );
  const activeMemberId = currentMemberId(user, selectedMemberId);
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(activeMemberId) as Record<string, string | number>;
  const planDays = db.prepare("SELECT * FROM plan_days WHERE member_id = ? ORDER BY day_label ASC").all(activeMemberId) as Array<
    Record<string, string | number>
  >;
  const coachEdits = db.prepare("SELECT * FROM coach_edits WHERE member_id = ? ORDER BY created_at DESC").all(activeMemberId) as Array<
    Record<string, string>
  >;
  const knowledgeBase = db.prepare("SELECT * FROM knowledge_base ORDER BY updated_at DESC").all() as Array<
    Record<string, string | number>
  >;
  const modelSettings = db.prepare("SELECT * FROM model_settings ORDER BY rowid ASC").all() as Array<Record<string, string>>;
  const queue = accessibleQueue(user);
  const latestReview = reviews.find((item) => item.memberId === activeMemberId) ?? initialDemoState.review;
  const allowSecretValue = user.role === "admin";
  const appliedRows = db.prepare("SELECT mode, payload, applied_at FROM assistant_outputs WHERE member_id = ?").all(activeMemberId) as Array<{
    mode: string;
    payload: string;
    applied_at: string;
  }>;
  const appliedMap = new Map(appliedRows.map((row) => [row.mode, row]));

  return {
    session: mapSession(user),
    currentRole: user.role,
    memberProfile: {
      id: String(member.id),
      memberName: String(member.member_name),
      coachName: String(member.coach_name),
      coachId: String(member.coach_id),
      locationName: String(member.location_name),
      age: Number(member.age),
      sex: String(member.sex),
      heightCm: Number(member.height_cm),
      weightKg: Number(member.weight_kg),
      goalLabel: String(member.goal_label),
      goalWindow: String(member.goal_window),
      trainingDays: Number(member.training_days),
      sessionMinutes: Number(member.session_minutes),
      equipmentAccess: String(member.equipment_access),
      trainingLevel: String(member.training_level),
      injuryHistory: String(member.injury_history),
      dietPreference: String(member.diet_preference),
      wearablePermissionStatus: String(member.wearable_permission_status),
      lastCoachEditReason: String(member.last_coach_edit_reason),
      planVersion: Number(member.plan_version),
      updatedAt: String(member.updated_at),
    },
    weeklyPlan: {
      memberId: activeMemberId,
      version: Number(member.plan_version),
      days: planDays.map((day) => ({
        id: String(day.id),
        memberId: String(day.member_id),
        dayLabel: String(day.day_label),
        focus: String(day.focus),
        duration: String(day.duration),
        intensity: String(day.intensity),
        completed: intToBool(Number(day.completed)),
        coachNote: String(day.coach_note),
      })),
    },
    coachEdits: coachEdits.map((edit) => ({
      id: edit.id,
      memberId: edit.member_id,
      dayId: edit.day_id,
      exercise: edit.exercise,
      editor: edit.editor,
      aiVersion: edit.ai_version,
      coachVersion: edit.coach_version,
      reason: edit.reason,
      createdAt: edit.created_at,
    })),
    knowledgeBase: knowledgeBase.map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
      description: String(entry.description),
      documents: Number(entry.documents),
      enabled: intToBool(Number(entry.enabled)),
      category: String(entry.category),
      updatedAt: String(entry.updated_at),
    })),
    modelSettings: modelSettings.map((setting) =>
      withModelSettingMeta(
        {
          id: setting.id,
          label: setting.label,
          value: setting.value,
        },
        allowSecretValue,
      ),
    ),
    coachQueue: queue.map(
      (item) =>
        ({
          id: item.id,
          memberId: item.member_id,
          member: item.member,
          location: item.location,
          task: item.task,
          owner: item.owner,
          status: item.status,
          createdAt: item.created_at,
        }) satisfies CoachQueueItem,
    ),
    usersByCoach: buildGroups(membersRows),
    review: latestReview,
    members,
    reviews,
    appliedAssistantOutputs: {
      plan: mapAppliedAssistantOutput(appliedMap.get("plan")),
      guidance: mapAppliedAssistantOutput(appliedMap.get("guidance")),
      review: mapAppliedAssistantOutput(appliedMap.get("review")),
    },
  };
}

export function selectMember(userId: string | null | undefined, memberId: string) {
  return getDemoState(userId, memberId);
}

export function saveProfile(userId: string | null | undefined, profile: MemberProfile) {
  const db = getDb();
  db.prepare(`
    UPDATE members SET
      member_name = @member_name,
      coach_name = @coach_name,
      coach_id = @coach_id,
      location_name = @location_name,
      age = @age,
      sex = @sex,
      height_cm = @height_cm,
      weight_kg = @weight_kg,
      goal_label = @goal_label,
      goal_window = @goal_window,
      training_days = @training_days,
      session_minutes = @session_minutes,
      equipment_access = @equipment_access,
      training_level = @training_level,
      injury_history = @injury_history,
      diet_preference = @diet_preference,
      wearable_permission_status = @wearable_permission_status,
      last_coach_edit_reason = @last_coach_edit_reason,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: profile.id,
    member_name: profile.memberName,
    coach_name: profile.coachName,
    coach_id: profile.coachId,
    location_name: profile.locationName,
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    goal_label: profile.goalLabel,
    goal_window: profile.goalWindow,
    training_days: profile.trainingDays,
    session_minutes: profile.sessionMinutes,
    equipment_access: profile.equipmentAccess,
    training_level: profile.trainingLevel,
    injury_history: profile.injuryHistory,
    diet_preference: profile.dietPreference,
    wearable_permission_status: profile.wearablePermissionStatus,
    last_coach_edit_reason: profile.lastCoachEditReason,
    updated_at: new Date().toISOString(),
  });
  return getDemoState(userId, profile.id);
}

export function togglePlanDay(userId: string | null | undefined, dayId: string) {
  const db = getDb();
  const row = db.prepare("SELECT member_id FROM plan_days WHERE id = ?").get(dayId) as { member_id: string };
  db.prepare(`
    UPDATE plan_days SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END WHERE id = ?
  `).run(dayId);
  return getDemoState(userId, row.member_id);
}

export function applyCoachEdit(
  userId: string | null | undefined,
  payload: { memberId: string; dayId: string; focus: string; intensity: string; coachNote: string; reason: string },
) {
  const db = getDb();
  if (!payload.reason.trim()) {
    return getDemoState(userId, payload.memberId);
  }

  const day = db.prepare("SELECT * FROM plan_days WHERE id = ?").get(payload.dayId) as Record<string, string | number>;
  const session = getUserById(userId);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE plan_days SET focus = ?, intensity = ?, coach_note = ? WHERE id = ?
    `).run(payload.focus, payload.intensity, payload.coachNote, payload.dayId);

    db.prepare(`
      UPDATE members SET
        last_coach_edit_reason = ?,
        plan_version = plan_version + 1,
        updated_at = ?
      WHERE id = ?
    `).run(payload.reason, new Date().toISOString(), payload.memberId);

    db.prepare(`
      INSERT INTO coach_edits (id, member_id, day_id, exercise, editor, ai_version, coach_version, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `edit-${Date.now()}`,
      payload.memberId,
      payload.dayId,
      String(day.day_label),
      session?.display_name ?? "教练",
      `${day.focus} · ${day.intensity} · ${day.coach_note}`,
      `${payload.focus} · ${payload.intensity} · ${payload.coachNote}`,
      payload.reason,
      new Date().toISOString(),
    );

    const member = db.prepare("SELECT member_name, location_name FROM members WHERE id = ?").get(payload.memberId) as {
      member_name: string;
      location_name: string;
    };
    db.prepare(`
      INSERT INTO coach_queue (id, member_id, member, location, task, owner, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `queue-${Date.now()}`,
      payload.memberId,
      member.member_name,
      member.location_name,
      `计划已更新：${payload.reason}`,
      session?.display_name ?? "教练",
      "待确认",
      new Date().toISOString(),
    );
  });
  tx();
  return getDemoState(userId, payload.memberId);
}

export function submitReview(
  userId: string | null | undefined,
  payload: { memberId: string; completedSessions: number; fatigueScore: number; weightChangeKg: number; note: string },
) {
  const db = getDb();
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(payload.memberId) as Record<string, string | number>;
  const riskLevel = deriveRiskLevel({ fatigueScore: payload.fatigueScore, note: payload.note });
  const nextAdjustment = deriveAdjustmentText({
    completedSessions: payload.completedSessions,
    fatigueScore: payload.fatigueScore,
    note: payload.note,
  });

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO reviews (
        id, member_id, member_name, coach_name, location_name,
        completed_sessions, total_sessions, fatigue_score, weight_change_kg, note, risk_level, next_adjustment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `review-${Date.now()}`,
      payload.memberId,
      String(member.member_name),
      String(member.coach_name),
      String(member.location_name),
      payload.completedSessions,
      Number(member.training_days),
      payload.fatigueScore,
      payload.weightChangeKg,
      payload.note,
      riskLevel,
      nextAdjustment,
      new Date().toISOString(),
    );

    db.prepare(`
      INSERT INTO coach_queue (id, member_id, member, location, task, owner, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `queue-${Date.now()}`,
      payload.memberId,
      String(member.member_name),
      String(member.location_name),
      `复盘更新：${nextAdjustment}`,
      String(member.coach_name),
      riskLevel === "high" ? "高优先级" : "待确认",
      new Date().toISOString(),
    );
  });

  tx();
  return getDemoState(userId, payload.memberId);
}

export function toggleKnowledgeBase(userId: string | null | undefined, id: string, selectedMemberId?: string | null) {
  const db = getDb();
  db.prepare(`
    UPDATE knowledge_base SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?
  `).run(new Date().toISOString(), id);
  return getDemoState(userId, selectedMemberId);
}

export function updateKnowledgeBase(
  userId: string | null | undefined,
  payload: { id: string; name: string; description: string; category: string; documents: number; enabled: boolean },
  selectedMemberId?: string | null,
) {
  const db = getDb();
  db.prepare(`
    UPDATE knowledge_base SET
      name = ?, description = ?, category = ?, documents = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(
    payload.name,
    payload.description,
    payload.category,
    payload.documents,
    boolToInt(payload.enabled),
    new Date().toISOString(),
    payload.id,
  );
  return getDemoState(userId, selectedMemberId);
}

export function updateModelSetting(
  userId: string | null | undefined,
  id: string,
  value: string,
  selectedMemberId?: string | null,
) {
  const session = getUserById(userId);
  if (!session || session.role !== "admin") {
    return getDemoState(userId, selectedMemberId);
  }
  const db = getDb();
  db.prepare("UPDATE model_settings SET value = ? WHERE id = ?").run(value, id);
  return getDemoState(userId, selectedMemberId);
}

export function applyAssistantResult(
  userId: string | null | undefined,
  payload: { memberId: string; mode: "plan" | "guidance" | "review"; response: AssistantResponse },
) {
  const session = getUserById(userId);
  if (!session) {
    return getDemoState(userId, payload.memberId);
  }

  const db = getDb();
  const appliedAt = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM assistant_outputs WHERE member_id = ? AND mode = ?").run(payload.memberId, payload.mode);
    db.prepare(`
      INSERT INTO assistant_outputs (id, member_id, mode, payload, applied_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`assistant-${payload.mode}-${Date.now()}`, payload.memberId, payload.mode, JSON.stringify(payload.response), appliedAt);

    if (payload.mode === "plan" && payload.response.trainingPlan.length) {
      const existingDays = db.prepare("SELECT id, day_label FROM plan_days WHERE member_id = ? ORDER BY day_label ASC").all(payload.memberId) as Array<{
        id: string;
        day_label: string;
      }>;

      payload.response.trainingPlan.slice(0, existingDays.length).forEach((day, index) => {
        const target = existingDays[index];
        if (!target) return;

        db.prepare(`
          UPDATE plan_days
          SET day_label = ?, focus = ?, duration = ?, intensity = ?, coach_note = ?, completed = 0
          WHERE id = ?
        `).run(day.dayLabel, day.focus, day.duration, day.intensity, day.note, target.id);
      });

      db.prepare(`
        UPDATE members
        SET last_coach_edit_reason = ?, plan_version = plan_version + 1, updated_at = ?
        WHERE id = ?
      `).run("已应用智能助理生成的训练计划。", appliedAt, payload.memberId);
    }

    if (payload.mode === "review") {
      const nextAdjustment =
        payload.response.reviewInsights[0] ??
        payload.response.recoveryActions[0] ??
        payload.response.summary;

      db.prepare(`
        UPDATE reviews
        SET next_adjustment = ?
        WHERE id = (
          SELECT id FROM reviews WHERE member_id = ? ORDER BY created_at DESC LIMIT 1
        )
      `).run(nextAdjustment, payload.memberId);
    }
  });

  tx();
  return getDemoState(userId, payload.memberId);
}

export function getModelSettingsMap() {
  const db = getDb();
  const rows = db.prepare("SELECT id, value FROM model_settings").all() as Array<{ id: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.id, row.value])) as Record<string, string>;
}

export function getKnowledgeBaseEntry(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM knowledge_base WHERE id = ?").get(id) as Record<string, string | number> | undefined;
  if (!row) return null;
  const mapped: KnowledgeBaseEntry = {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    documents: Number(row.documents),
    enabled: intToBool(Number(row.enabled)),
    category: String(row.category),
    updatedAt: String(row.updated_at),
  };
  return mapped;
}

export function getMemberPlanDetail(memberId: string) {
  const state = getDemoState("user-admin-root", memberId);
  return {
    member: state.memberProfile,
    plan: state.weeklyPlan,
    edits: state.coachEdits,
  };
}

export function getReviewById(reviewId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId) as Record<string, string | number> | undefined;
  return row ? mapReview(row) : null;
}

export function getMemberById(memberId: string) {
  const state = getDemoState("user-admin-root", memberId);
  return {
    member: state.memberProfile,
    plan: state.weeklyPlan,
    review: state.review,
  };
}

export function demoAccountHints() {
  return demoAccounts;
}
