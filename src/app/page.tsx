import Link from 'next/link';
import {
  ArrowRightIcon,
  AcademicCapIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Nuggets LMS</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Demo
          </Link>
          <Link
            href="https://studio42.dev/contact?source=nuggets-lms"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Contact Sales
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">AI Microlearning LMS</h1>
        <p className="text-2xl md:text-3xl text-gray-600 mb-4">
          Zero-human-authoring adaptive microlearning platform
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
          Transform any content into personalized learning experiences with AI-powered adaptive
          microlearning. No human authoring required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Try Demo</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <Link
            href="https://studio42.dev/contact?source=nuggets-lms"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Contact Sales
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose Nuggets LMS?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <SparklesIcon className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Authoring</h3>
            <p className="text-gray-600">
              Automatically convert any content (PDFs, URLs, documents) into interactive learning
              nuggets with zero human intervention.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <AcademicCapIcon className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Adaptive Learning</h3>
            <p className="text-gray-600">
              Personalized learning paths that adapt to each learner's knowledge gaps and mastery
              levels in real-time.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <ChartBarIcon className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Progress</h3>
            <p className="text-gray-600">
              Track learner progress, identify knowledge gaps, and measure mastery with detailed
              analytics and insights.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Experience the future of microlearning with our AI-powered platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Try Demo Now</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="https://studio42.dev/contact?source=nuggets-lms"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>&copy; 2025 Nuggets LMS. Powered by Studio42.dev</p>
      </footer>
    </main>
  );
}
