'use client';
import Link from 'next/link';


export const LeaderboardPreview = () => {
    return (
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Leading in Sustainability
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                See how businesses are making a difference. Our public leaderboard showcases top performers in waste reduction and sustainable practices.
              </p>
              <div className="mt-8 sm:flex">
                <div className="rounded-md shadow">
                  <Link href="/leaderboard" className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                    View Leaderboard
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-0.5 md:grid-cols-3 lg:mt-0 lg:grid-cols-2">
              <div className="col-span-1 flex justify-center py-8 px-8 bg-gray-50">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">50%</p>
                  <p className="mt-1 text-gray-500">Average Waste Reduction</p>
                </div>
              </div>
              <div className="col-span-1 flex justify-center py-8 px-8 bg-gray-50">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">100+</p>
                  <p className="mt-1 text-gray-500">Active Businesses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };