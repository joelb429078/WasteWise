// src/app/page.js
'use client'; 

import Link from 'next/link';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { LeaderboardPreview } from '@/components/landing/LeaderboardPreview';
import { CTASection } from '@/components/landing/CTASection';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-green-700">WasteWise</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/public-info" className="text-gray-700 hover:text-green-600 px-3 py-2">
                Public Reports
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-green-600 px-3 py-2">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Sections */}
      <FeatureSection />

      {/* Leaderboard Preview */}
      <LeaderboardPreview />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>© 2024 WasteWise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}