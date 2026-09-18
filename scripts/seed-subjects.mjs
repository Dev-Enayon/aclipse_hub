#!/usr/bin/env node

/**
 * Seed Nigerian secondary-school subjects.
 *   node scripts/seed-subjects.mjs
 *
 * Idempotent — existing subjects (including "General") are untouched.
 * Uses DIRECT_DATABASE_URL if available (safe for scripts), else falls back to
 * DATABASE_URL.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL },
  },
});

const SUBJECTS = [
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

const existing = await prisma.subject.findMany({ select: { name: true } });
const names = new Set(existing.map((s) => s.name));
let created = 0;
for (const subj of SUBJECTS) {
  if (names.has(subj.name)) continue;
  await prisma.subject.create({ data: subj });
  names.add(subj.name);
  created += 1;
}

console.log(`Subjects: ${created} created, ${existing.size} already existed (total ${names.size}).`);
await prisma.$disconnect();