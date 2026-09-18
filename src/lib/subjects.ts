import { prisma } from "@/lib/prisma";

/**
 * Core Nigerian secondary-school subjects (UTME / WASSCE / NECO) used for
 * structuring question banks. Idempotent — names are unique and the seed never
 * deletes or modifies existing rows (including the "General" subject used by
 * the Premium Access feature).
 */
export const NIGERIAN_SCHOOL_SUBJECTS: { name: string; description: string }[] = [
  { name: "Mathematics", description: "Arithmetic, algebra, geometry, statistics and calculus" },
  { name: "English Language", description: "Comprehension, grammar, lexis and structure" },
  { name: "Physics", description: "Mechanics, waves, electricity, magnetism and modern physics" },
  { name: "Chemistry", description: "Atomic structure, bonding, reactions and organic chemistry" },
  { name: "Biology", description: "Cell biology, genetics, ecology and human physiology" },
  { name: "Further Mathematics", description: "Advanced algebra, calculus, mechanics and probability" },
  { name: "Literature in English", description: "Prose, poetry, drama and literary analysis" },
  { name: "Government", description: "Political systems, constitutions and civic governance" },
  { name: "Economics", description: "Micro and macro economics, money and development" },
  { name: "Commerce", description: "Trade, finance, marketing and business organization" },
  { name: "Accounting", description: "Financial accounting, ledger systems and final accounts" },
  { name: "Geography", description: "Physical and human geography, map reading" },
  { name: "History", description: "Nigerian, African and world history" },
  { name: "Agricultural Science", description: "Crop and animal production, farm management and economics" },
  { name: "Civic Education", description: "Citizenship, rights, responsibilities and national values" },
  { name: "Christian Religious Studies", description: "Biblical knowledge and Christian ethics" },
  { name: "Islamic Religious Studies", description: "Quranic knowledge, hadith and Islamic ethics" },
  { name: "Yoruba", description: "Yoruba language, literature and culture" },
  { name: "Igbo", description: "Igbo language, literature and culture" },
  { name: "Hausa", description: "Hausa language, literature and culture" },
];

/** Returns all subjects ordered by name. */
export async function listSubjects() {
  return prisma.subject.findMany({ orderBy: { name: "asc" } });
}

/**
 * Seeds subjects that do not already exist. Safe to run repeatedly — existing
 * subjects (including "General") are left untouched.
 */
export async function seedSubjects(): Promise<{ created: number; skipped: number }> {
  const existing = await prisma.subject.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((s) => s.name));
  let created = 0;
  let skipped = 0;
  for (const subject of NIGERIAN_SCHOOL_SUBJECTS) {
    if (existingNames.has(subject.name)) {
      skipped += 1;
      continue;
    }
    await prisma.subject.create({ data: subject });
    existingNames.add(subject.name);
    created += 1;
  }
  return { created, skipped };
}