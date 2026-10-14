import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Free CBT Practice - Aclipse Hub" };

const TIER_LABELS: Record<string, string> = {
  JSS1: "JSS 1", JSS2: "JSS 2", JSS3: "JSS 3",
  SS1: "SS 1", SS2: "SS 2", SS3: "SS 3",
};

async function getPublished(tier?: string | null, type?: string | null) {
  return prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      ...(tier ? { schoolTier: tier } : {}),
      ...(type ? { examType: type } : {}),
    },
    include: {
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
}

export default async function CbtListPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; type?: string }>;
}) {
  const { tier, type } = await searchParams;
  const cbts = await getPublished(tier, type);
  const tiers = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
  const types = ["CBT", "JAMB"];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-gray-900">Free CBT Practice</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Practice free Computer-Based Tests, or take a CBT a Sub-Admin set up for your class — you will need an entry code from the Head Admin.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/cbt"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!tier && !type ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            All
          </Link>
          {types.map((t) => (
            <Link
              key={t}
              href={{ pathname: "/cbt", query: { ...(tier ? { tier } : {}), type: t } }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${type === t ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {t}
            </Link>
          ))}
          <span className="w-px bg-gray-200 mx-1" />
          {tiers.map((tr) => (
            <Link
              key={tr}
              href={{ pathname: "/cbt", query: { tier: tr, ...(type ? { type } : {}) } }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tier === tr ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {TIER_LABELS[tr]}
            </Link>
          ))}
        </div>

        {cbts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-600 font-medium mb-1">No CBTs available yet</p>
            <p className="text-sm text-gray-500">Check back soon — new CBTs are published regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cbts.map((c) => (
              <Link
                key={c.id}
                href={`/cbt/${c.id}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  {c.schoolTier && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {TIER_LABELS[c.schoolTier] ?? c.schoolTier}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.examType === "JAMB" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>
                    {c.examType}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description ?? c.subject.name}</p>
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>{c.subject.name}</span>
                  <span>{c._count.questions} questions · {c.timer} min</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}