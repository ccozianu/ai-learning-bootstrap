export interface User {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  roles: string[];
  accountStatus: string;
  signInTypes: string[];
  lastSignInType: string | null;
}

export interface KnowledgeNodeView {
  id: string;
  title: string;
  description: string;
  prerequisiteIds: string[];
  unmetPrerequisites: Array<{ id: string; title: string }>;
  status: "MASTERED" | "READY" | "PREREQUISITE_NEEDED";
  attemptsCount: number;
  correctCount: number;
}

export interface ParentKidSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  birthYear: number | null;
  accountStatus: string;
  gdprConsentGrantedAt: string | null;
  gdprConsentWithdrawnAt: string | null;
  attemptsTotal: number;
  approvedVersionIds: string[];
  mastery: KnowledgeNodeView[];
}

export interface CurriculumCatalogVersion {
  id: string;
  version: string;
  title: string;
  curriculumTitle: string;
  description: string;
  license: string;
  attribution: string;
  series: Array<{
    id: string;
    orderIndex: number;
    title: string;
    subtitle: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      kind: string;
      knowledgeNodeId: string;
    }>;
  }>;
}

export interface ParentDashboardData {
  kids: ParentKidSummary[];
  curricula: CurriculumCatalogVersion[];
}

export interface LearnOverviewData {
  knowledgeGraph: KnowledgeNodeView[];
  curricula: Array<{
    versionId: string;
    title: string;
    description: string;
    attribution: string;
    license: string;
    series: Array<{
      id: string;
      orderIndex: number;
      slug: string;
      title: string;
      subtitle: string;
      description: string;
      knowledgeNodeId: string;
      lessons: Array<{
        id: string;
        orderIndex: number;
        slug: string;
        title: string;
        kind: string;
        knowledgeNodeId: string;
        solvedCount: number;
      }>;
    }>;
  }>;
}

export interface VerbSpec {
  inf: string;
  part: string;
  pres: string[];
  enPres: string[];
  enInf: string;
  enPart: string;
  group: number;
  path?: "regular" | "ez";
  complements: Array<[string, string]>;
}

export type RoSegment =
  { type: "text"; value: string } | { type: "blank"; index: number };

export interface SanitizedExercise {
  id: string;
  orderIndex: number;
  exerciseType: "FILL_IN_BLANKS" | "MULTIPLE_CHOICE" | "CATEGORY_SORT";
  promptEn: string;
  promptRoTemplate: string;
  knowledgeNodeId: string;
  roSegments?: RoSegment[];
  blanksCount?: number;
  hint?: string;
  options?: string[];
  verbs?: Array<{ ro: string; en: string }>;
}

export interface LessonDetailData {
  id: string;
  seriesId: string;
  seriesTitle: string;
  title: string;
  kind: string;
  knowledgeNodeId: string;
  contentJson: {
    badge?: string;
    hero?: string;
    instructions?: string;
    showVerbDeck?: string;
    showNumeralExplorer?: boolean;
    cards?: Array<{
      heading: string;
      body: string;
      highlights?: Array<{ ro: string; en: string; note?: string }>;
    }>;
  };
  verbDeck?: VerbSpec[];
  exercises: SanitizedExercise[];
}

export async function api<T>(
  path: string,
  data?: unknown,
  method?: "GET" | "POST" | "DELETE",
): Promise<T> {
  const actualMethod = method ?? (data === undefined ? "GET" : "POST");
  const response = await fetch(`/api${path}`, {
    method: actualMethod,
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const rawText = await response.text();
  let result: Record<string, unknown> = {};
  if (rawText) {
    try {
      result = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
      }
    }
  }
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Request could not be completed.",
    );
  }
  return result as T;
}
