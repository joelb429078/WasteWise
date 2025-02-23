import Link from 'next/link';

export const HeroSection = () => {
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Transform your</span>
                <span className="block text-green-600">Waste Management</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Empower your business with smart waste tracking and analytics. Join the movement towards sustainable business practices.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link href="/signup" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:py-4 md:text-lg md:px-10">
                    Get Started
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link href="/public-info" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 md:py-4 md:text-lg md:px-10">
                    View Reports
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <svg className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full" viewBox="0 0 400 400">
          <rect width="400" height="400" fill="#E5F3E5"/>
          <circle cx="200" cy="200" r="120" fill="#4CAF50" opacity="0.1"/>
          <path d="M160 140 L240 140 L200 80 Z" fill="#2E7D32"/>
          <path d="M140 180 L260 180 L200 120 Z" fill="#388E3C"/>
          <path d="M120 220 L280 220 L200 160 Z" fill="#43A047"/>
        </svg>
      </div>
    </div>
  );
};