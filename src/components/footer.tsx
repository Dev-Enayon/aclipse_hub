import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold">Aclipse Hub</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Modern educational platform helping students prepare for exams with
              free quizzes and premium CBT practice tests.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/quiz"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Weekly Quiz
                </Link>
              </li>
              <li>
                <Link
                  href="/store"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Student Login
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Contact Support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Aclipse Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
