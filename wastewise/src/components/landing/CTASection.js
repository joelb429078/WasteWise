'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export const CTASection = () => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const element = document.getElementById('cta-section');
      if (element) {
        const position = element.getBoundingClientRect();
        if (position.top < window.innerHeight - 100) {
          setAnimated(true);
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on initial load
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div id="cta-section" className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-green-700">
        <svg className="absolute left-0 top-0 h-full w-48 text-white transform -translate-x-1/2" fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">

        </svg>
        
        {/* Decorative circles */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-green-800 mix-blend-multiply filter blur-xl opacity-70"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%)`
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className={`transform transition-all duration-1000 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-green-800 bg-opacity-30 text-white text-sm font-medium mb-6">
              JOIN THE MOVEMENT
            </span>
            
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Ready to get started?</span>
              <span className="block mt-1">Start managing waste efficiently today.</span>
            </h2>
            
            <p className="mt-6 text-lg leading-6 text-green-100">
              Join hundreds of businesses already using WasteWise to make a difference.
              Our platform makes it easy to track, analyse, and optimise your waste management.
            </p>
          </div>
          
          <div className={`mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center transform transition-all duration-1000 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
            <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
              <Link
                href="/signup"
                className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-green-700 bg-white hover:bg-green-50 transition-colors duration-300 sm:px-8"
              >
                Sign up for free
              </Link>
              <Link
                href="/public-info"
                className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-800 bg-opacity-60 hover:bg-opacity-70 transition-colors duration-300 sm:px-8"
              >
                Read More
              </Link>
            </div>
          </div>
          
          {/* Testimonial */}
          <div className={`mt-12 transform transition-all duration-1000 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '400ms' }}>
            <blockquote className="mt-8">
              <div className="max-w-3xl mx-auto text-center text-xl leading-7 font-medium text-white">
                <p>
                  "WasteWise has transformed how we handle waste management. The insights we've gained have helped us reduce costs while meeting our sustainability goals."
                </p>
              </div>
              <footer className="mt-4">
                <div className="md:flex md:items-center md:justify-center">
                  <div className="md:flex-shrink-0">
                    <div className="mx-auto h-10 w-10 rounded-full bg-green-800 bg-opacity-30 flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 text-center md:mt-0 md:ml-4 md:flex md:items-center">
                    <div className="text-base font-medium text-white">Liam Johnson</div>
                    <svg className="hidden md:block mx-1 h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 0h3L9 20H6l5-20z" />
                    </svg>
                    <div className="text-base font-medium text-green-100">CEO, EcoCare Consulting</div>
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
};