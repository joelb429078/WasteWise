'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Set loaded after a short delay to ensure smooth animation after page load
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className={`sm:text-center lg:text-left transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Transform your</span>
                <span className="block text-green-600">Waste Management</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Empower your business with smart waste tracking and analytics. Join the movement towards sustainable business practices.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link href="/signup" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:py-4 md:text-lg md:px-10 transition-colors duration-300">
                    Get Started
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link href="/public-info" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 md:py-4 md:text-lg md:px-10 transition-colors duration-300">
                    View Reports
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <div className={`h-56 w-full sm:h-72 md:h-96 lg:w-full lg:h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {/* Static SVG that looks like an interactive visualization */}
          <svg className="h-full w-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background */}
            <rect width="800" height="600" fill="#E8F5E9" />
            <circle cx="400" cy="300" r="250" fill="#C8E6C9" fillOpacity="0.7" />
            <circle cx="400" cy="300" r="180" fill="#A5D6A7" fillOpacity="0.5" />
            
            {/* Waste Management Data Visualization */}
            
            {/* Central Hexagon */}
            <g className="central-hexagon">
              <path d="M400 150 L487 195 L487 285 L400 330 L313 285 L313 195 Z" fill="#4CAF50" fillOpacity="0.9" />
              <path d="M400 175 L462 208 L462 273 L400 305 L338 273 L338 208 Z" fill="#E8F5E9" />
              
              {/* Inside Icon */}
              <path d="M380 235 L400 225 L420 235 L420 265 L400 275 L380 265 Z" fill="#4CAF50" />
              <circle cx="400" cy="250" r="5" fill="white" />
            </g>
            
            {/* Connecting Data Points */}
            {/* Green Nodes */}
            <circle cx="250" cy="150" r="20" fill="#81C784" />
            <circle cx="550" cy="150" r="20" fill="#81C784" />
            <circle cx="250" cy="450" r="20" fill="#81C784" />
            <circle cx="550" cy="450" r="20" fill="#81C784" />
            
            {/* Blue Data Points */}
            <circle cx="150" cy="300" r="15" fill="#2196F3" />
            <circle cx="650" cy="300" r="15" fill="#2196F3" />
            <circle cx="320" cy="100" r="15" fill="#2196F3" />
            <circle cx="480" cy="100" r="15" fill="#2196F3" />
            <circle cx="320" cy="500" r="15" fill="#2196F3" />
            <circle cx="480" cy="500" r="15" fill="#2196F3" />
            
            {/* Connecting Lines */}
            {/* Green connections */}
            <line x1="400" y1="150" x2="250" y2="150" stroke="#4CAF50" strokeWidth="3" strokeDasharray="5,5" />
            <line x1="400" y1="150" x2="550" y2="150" stroke="#4CAF50" strokeWidth="3" strokeDasharray="5,5" />
            <line x1="313" y1="285" x2="250" y2="450" stroke="#4CAF50" strokeWidth="3" strokeDasharray="5,5" />
            <line x1="487" y1="285" x2="550" y2="450" stroke="#4CAF50" strokeWidth="3" strokeDasharray="5,5" />
            
            {/* Blue connections */}
            <line x1="313" y1="195" x2="150" y2="300" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="487" y1="195" x2="650" y2="300" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="400" y1="150" x2="320" y2="100" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="400" y1="150" x2="480" y2="100" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="400" y1="330" x2="320" y2="500" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="400" y1="330" x2="480" y2="500" stroke="#2196F3" strokeWidth="2" strokeDasharray="5,5" />
            
            {/* Animated elements that don't rely on JavaScript */}
            <g className="pulse-elements">
              <circle cx="400" cy="300" r="40" fill="#4CAF50" fillOpacity="0.2" className="pulse-circle" />
              <circle cx="250" cy="150" r="25" fill="#81C784" fillOpacity="0.3" className="pulse-circle" style={{ animationDelay: "0.5s" }} />
              <circle cx="550" cy="150" r="25" fill="#81C784" fillOpacity="0.3" className="pulse-circle" style={{ animationDelay: "0.7s" }} />
              <circle cx="250" cy="450" r="25" fill="#81C784" fillOpacity="0.3" className="pulse-circle" style={{ animationDelay: "0.9s" }} />
              <circle cx="550" cy="450" r="25" fill="#81C784" fillOpacity="0.3" className="pulse-circle" style={{ animationDelay: "1.1s" }} />
            </g>
            
            {/* Data flow animations */}
            <circle cx="0" cy="0" r="5" fill="#4CAF50" className="moving-dot green-path-1" />
            <circle cx="0" cy="0" r="5" fill="#4CAF50" className="moving-dot green-path-2" />
            <circle cx="0" cy="0" r="5" fill="#2196F3" className="moving-dot blue-path-1" />
            <circle cx="0" cy="0" r="5" fill="#2196F3" className="moving-dot blue-path-2" />
          </svg>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        .pulse-circle {
          animation: pulse 3s infinite ease-in-out;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        .moving-dot {
          opacity: 0.8;
        }
        
        .green-path-1 {
          animation: movePath1 8s infinite linear;
        }
        
        .green-path-2 {
          animation: movePath2 8s infinite linear;
          animation-delay: 4s;
        }
        
        .blue-path-1 {
          animation: movePath3 6s infinite linear;
        }
        
        .blue-path-2 {
          animation: movePath4 6s infinite linear;
          animation-delay: 3s;
        }
        
        @keyframes movePath1 {
          0% { transform: translate(250px, 150px); }
          50% { transform: translate(400px, 150px); }
          100% { transform: translate(550px, 150px); }
        }
        
        @keyframes movePath2 {
          0% { transform: translate(313px, 285px); }
          50% { transform: translate(250px, 450px); }
          100% { transform: translate(313px, 285px); }
        }
        
        @keyframes movePath3 {
          0% { transform: translate(150px, 300px); }
          50% { transform: translate(313px, 195px); }
          100% { transform: translate(400px, 150px); }
        }
        
        @keyframes movePath4 {
          0% { transform: translate(650px, 300px); }
          50% { transform: translate(487px, 195px); }
          100% { transform: translate(400px, 150px); }
        }
        
        .central-hexagon {
          animation: gentle-float 5s infinite ease-in-out;
        }
        
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};