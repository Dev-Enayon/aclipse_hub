import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";

const products = [
  {
    id: 1,
    title: "JAMB Past Questions Bundle",
    description: "Complete JAMB past questions from 2010-2024 with solutions",
    price: "₦5,000",
    image: "📚",
    link: "#",
  },
  {
    id: 2,
    title: "WAEC Mathematics Guide",
    description: "Comprehensive mathematics preparation for WAEC exams",
    price: "₦3,500",
    image: "🔢",
    link: "#",
  },
  {
    id: 3,
    title: "NECO Physics Study Pack",
    description: "Physics questions and explanations for NECO exams",
    price: "₦4,000",
    image: "⚡",
    link: "#",
  },
  {
    id: 4,
    title: "Post-UTME Practice Kit",
    description: "University-specific Post-UTME questions and answers",
    price: "₦6,000",
    image: "🎓",
    link: "#",
  },
];

export default function StorePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Study Materials Store
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Access premium study materials, past questions, and exam guides to
              boost your preparation.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <span className="text-6xl">{product.image}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {product.price}
                    </span>
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      Buy on Selar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div className="mt-12 bg-blue-50 rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Need Help Choosing?
            </h2>
            <p className="text-gray-600 mb-4">
              Contact our support team for personalized recommendations based on
              your exam goals.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
