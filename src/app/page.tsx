import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-blue-700 to-blue-900 text-white py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-block bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                Free Weekly Quizzes Available Now
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Ace Your Exams with{" "}
                <span className="text-accent">Aclipse Hub</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Practice with thousands of exam questions. Take free weekly quizzes
                and premium CBT exams to boost your confidence and achieve your goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/quiz"
                  className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 text-lg"
                >
                  Take Free Quiz
                </Link>
                <Link
                  href="/login"
                  className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-all border border-white/20 text-lg"
                >
                  Join Premium
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Our platform provides comprehensive tools to help you prepare effectively
                for your examinations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: (
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: "Free Weekly Quizzes",
                  description: "Test your knowledge every week with our curated quizzes covering various subjects. No payment required.",
                  color: "bg-blue-100",
                },
                {
                  icon: (
                    <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                  title: "Premium CBT Exams",
                  description: "Access our extensive question bank with realistic CBT exam simulations that mirror real test conditions.",
                  color: "bg-orange-100",
                },
                {
                  icon: (
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  title: "Track Your Progress",
                  description: "Monitor your improvement with detailed analytics, performance reports, and personalized recommendations.",
                  color: "bg-green-100",
                },
              ].map((feature, index) => (
                <div key={index} className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-to-r from-primary to-blue-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10K+", label: "Questions", color: "text-white" },
                { value: "5K+", label: "Students", color: "text-blue-100" },
                { value: "50+", label: "Subjects", color: "text-blue-100" },
                { value: "95%", label: "Success Rate", color: "text-accent" },
              ].map((stat, index) => (
                <div key={index}>
                  <div className={`text-4xl md:text-5xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                  <div className="text-blue-200">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Students Say
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join thousands of students who have improved their exam scores with Aclipse Hub.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Adebayo Olamide",
                  role: "JAMB Candidate",
                  content: "Aclipse Hub helped me prepare for JAMB effectively. The weekly quizzes kept me on track and the CBT exams gave me confidence.",
                  score: "Score: 290/400",
                },
                {
                  name: "Chioma Nwosu",
                  role: "WAEC Student",
                  content: "The question bank is amazing! I found questions similar to what appeared in my actual WAEC exam. Highly recommended!",
                  score: "Score: 8A's",
                },
                {
                  name: "Fatima Abdullahi",
                  role: "Post-UTME Applicant",
                  content: "The analytics helped me identify my weak areas. I improved my score by 40% after using Aclipse Hub for just 2 months.",
                  score: "Score: 78%",
                },
              ].map((testimonial, index) => (
                <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      {testimonial.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Get started in three simple steps and begin your journey to exam success.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Take a Free Quiz",
                  description: "Start with our weekly quizzes to test your knowledge and get familiar with the platform.",
                },
                {
                  step: "02",
                  title: "Review Your Results",
                  description: "See detailed explanations for each question and understand where you need improvement.",
                },
                {
                  step: "03",
                  title: "Go Premium",
                  description: "Unlock full CBT exams, analytics, and track your progress to achieve your best score.",
                },
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-accent to-orange-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-orange-100 mb-8 max-w-2xl mx-auto text-lg">
              Join thousands of students who are already improving their exam
              scores with Aclipse Hub. Start your free quiz today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/quiz"
                className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 text-lg"
              >
                Start Free Quiz
              </Link>
              <Link
                href="/login"
                className="bg-orange-700 hover:bg-orange-800 text-white px-8 py-4 rounded-lg font-semibold transition-all border border-orange-500 text-lg"
              >
                Get Premium Access
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
