import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ALOC_EXAM_TYPES,
  ALOC_SUBJECTS,
  AlocError,
  fetchAlocQuestions,
  type AlocExamType,
  type AlocSubject,
} from "@/lib/aloc";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const subject = sp.get("subject") ?? "";
  const type = sp.get("type") ?? undefined;
  const yearRaw = sp.get("year");
  const countRaw = sp.get("count");

  if (!(subject in ALOC_SUBJECTS)) {
    return NextResponse.json(
      {
        error: "Invalid subject",
        validSubjects: Object.keys(ALOC_SUBJECTS),
      },
      { status: 400 }
    );
  }

  let typeParam: AlocExamType | undefined;
  if (type) {
    const normalized = type.toLowerCase();
    if (!ALOC_EXAM_TYPES.includes(normalized as AlocExamType)) {
      return NextResponse.json(
        { error: "Invalid exam type", validTypes: ALOC_EXAM_TYPES },
        { status: 400 }
      );
    }
    typeParam = normalized as AlocExamType;
  }

  let yearParam: number | undefined;
  if (yearRaw !== null && yearRaw !== "") {
    if (!/^\d{4}$/.test(yearRaw)) {
      return NextResponse.json(
        { error: "Year must be a four-digit number" },
        { status: 400 }
      );
    }
    yearParam = Number(yearRaw);
  }

  let countParam = 1;
  if (countRaw !== null && countRaw !== "") {
    if (!/^\d+$/.test(countRaw)) {
      return NextResponse.json(
        { error: "Count must be a positive integer" },
        { status: 400 }
      );
    }
    countParam = Number(countRaw);
  }

  try {
    const questions = await fetchAlocQuestions({
      subject: subject as AlocSubject,
      type: typeParam,
      year: yearParam,
      count: countParam,
    });
    return NextResponse.json({ questions, total: questions.length });
  } catch (err) {
    if (err instanceof AlocError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[aloc] unexpected error", err);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
