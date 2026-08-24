"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-gray-900">Aclipse Hub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/quiz"
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Weekly Quiz
            </Link>
            <Link
              href="/store"
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Store
            </Link>
            <Link
              href="/login"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Student Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/quiz"
              className="block text-gray-600 hover:text-primary transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Weekly Quiz
            </Link>
            <Link
              href="/store"
              className="block text-gray-600 hover:text-primary transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Store
            </Link>
            <Link
              href="/login"
              className="block bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Student Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
