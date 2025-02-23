'use client';
import Link from 'next/link';

export const CTASection = () => {
    return (
      <div className="bg-green-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block">Start managing waste efficiently today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-green-100">
            Join hundreds of businesses already using WasteWise to make a difference.
          </p>
          <Link href="/signup" className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-white hover:bg-green-50 sm:w-auto">
            Sign up for free
          </Link>
        </div>
      </div>
    );
  };