// Service for the ALOC past-questions API (https://questions.aloc.com.ng).
// Spec source: official docs at github.com/Seunope/aloc-endpoints wiki.
// Auth: AccessToken header, token read from ALOC_ACCESS_TOKEN env var.
const BASE_URL = "https://questions.aloc.com.ng/api/v2";

export const ALOC_SUBJECTS = {
  english: "English language",
  mathematics: "Mathematics",
  commerce: "Commerce",
  accounting: "Accounting",
  biology: "Biology",
  physics: "Physics",
  chemistry: "Chemistry",
  englishlit: "English literature",
  government: "Government",
  crk: "Christian Religious Knowledge",
  geography: "Geography",
  economics: "Economics",
  irk: "Islamic Religious Knowledge",
  civiledu: "Civic Education",
  insurance: "Insurance",
  currentaffairs: "Current Affairs",
  history: "History",
} as const;

export type AlocSubject = keyof typeof ALOC_SUBJECTS;

// Documented exam types. Note: NECO is NOT available on this legacy API —
// only utme / wassce / post-utme are supported upstream.
export const ALOC_EXAM_TYPES = ["utme", "wassce", "post-utme"] as const;
export type AlocExamType = (typeof ALOC_EXAM_TYPES)[number];

const MAX_COUNT = 120; // documented upstream limit for /m/{count}

export interface AlocQuestion {
  id: number | null;
  question: string;
  options: string[];
  answer: string | null;
  year: number | null;
  examType: string | null;
  section: string | null;
  image: string | null;
  solution: string | null;
}

interface FetchQuestionsParams {
  subject: AlocSubject;
  /** Exam type filter (utme | wassce | post-utme) */
  type?: AlocExamType;
  /** Four-digit exam year */
  year?: number;
  /** How many questions to fetch (1–120). Defaults to 1. */
  count?: number;
}

export class AlocError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AlocError";
    this.status = status;
  }
}

function assertValidParams({ subject, type, year, count = 1 }: FetchQuestionsParams): void {
  if (!(subject in ALOC_SUBJECTS)) {
    throw new AlocError(
      `Unknown subject "${subject}". Valid subjects: ${Object.keys(ALOC_SUBJECTS).join(", ")}`,
      400
    );
  }
  if (type && !ALOC_EXAM_TYPES.includes(type)) {
    throw new AlocError(
      `Unknown exam type "${type}". Valid types: ${ALOC_EXAM_TYPES.join(", ")}`,
      400
    );
  }
  if (!Number.isInteger(year) && year !== undefined) {
    throw new AlocError("Year must be an integer", 400);
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new AlocError(`Count must be an integer between 1 and ${MAX_COUNT}`, 400);
  }
}

/** Picks the endpoint per docs: /q for ≤40 questions, /m/{count} above that. */
function buildPath(count: number): string {
  if (count === 1) return "/q";
  if (count <= 40) return `/q/${count}`;
  return `/m/${count}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stringField(body: unknown, key: string): string | null {
  if (isRecord(body) && body[key] != null) return String(body[key]);
  return null;
}

function recordField(body: unknown, key: string): unknown {
  return isRecord(body) ? body[key] : undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Shape verified against the live API (Aug 2026):
// { id, question, option: { a,b,c,d,e }, answer, section, image,
//   solution, examtype, examyear }
function mapQuestion(raw: unknown): AlocQuestion {
  const r = (raw ?? {}) as Record<string, any>;

  let options: string[];
  if (Array.isArray(r.option)) {
    options = r.option.map((o: unknown) => String(o));
  } else if (isRecord(r.option)) {
    // Upstream returns an object keyed a–e; "e" may be null/absent.
    options = ["a", "b", "c", "d", "e"]
      .map((k) => r.option[k])
      .filter((v: unknown) => v != null && String(v).trim() !== "")
      .map((v: unknown) => String(v));
  } else if (typeof r.option === "string" && r.option.trim() !== "") {
    options = [r.option];
  } else {
    options = [];
  }

  const yearRaw = r.examyear ?? r.exam_year;
  return {
    id: typeof r.id === "number" ? r.id : null,
    question: String(r.question ?? ""),
    options,
    answer: r.answer != null ? String(r.answer) : null,
    year:
      yearRaw != null && Number.isFinite(Number(yearRaw))
        ? Number(yearRaw)
        : null,
    examType: r.examtype != null ? String(r.examtype) : r.exam_type != null ? String(r.exam_type) : null,
    section: r.section != null ? String(r.section) : null,
    image: r.image != null ? String(r.image) : null,
    solution: r.solution != null ? String(r.solution) : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Fetches past-exam questions from ALOC.
 * Returns a clean array of normalized question objects.
 */
export async function fetchAlocQuestions(
  params: FetchQuestionsParams
): Promise<AlocQuestion[]> {
  assertValidParams(params);
  const { subject, type, year, count = 1 } = params;

  const token = process.env.ALOC_ACCESS_TOKEN;
  if (!token) {
    throw new AlocError(
      "ALOC_ACCESS_TOKEN is not configured on the server",
      500
    );
  }

  const search = new URLSearchParams({ subject });
  if (type) search.set("type", type);
  if (year !== undefined) search.set("year", String(year));

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${buildPath(count)}?${search.toString()}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        AccessToken: token,
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new AlocError(
      err instanceof Error && err.name === "TimeoutError"
        ? "ALOC request timed out"
        : "Could not reach the ALOC service",
      504
    );
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      stringField(body, "error") ??
      stringField(body, "message") ??
      `ALOC request failed with status ${res.status}`;
    // Upstream auth/credit problems surface as client-class codes; pass through
    const status = res.status === 406 || res.status === 400 ? 400 : 502;
    throw new AlocError(msg, status);
  }

  const data = recordField(body, "data");
  const rawList: unknown[] = Array.isArray(data)
    ? data
    : data != null && typeof data === "object"
      ? [data]
      : [];

  const questions = rawList.map(mapQuestion).filter((q) => q.question);

  if (questions.length === 0) {
    throw new AlocError(
      "ALOC returned no questions for this subject/year/type combination",
      404
    );
  }
  return questions;
}
