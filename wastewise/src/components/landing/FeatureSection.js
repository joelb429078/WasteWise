'use client';
import { useState } from 'react';

export const FeatureSection = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features = [
    {
      title: "Real-time Tracking",
      description: "Monitor waste collection and disposal in real-time with our advanced tracking system. Get instant notifications and status updates.",
      icon: (
        <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          <path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      bgColor: "bg-green-50",
      hoverColor: "group-hover:bg-green-100"
    },
    {
      title: "Analytics Dashboard",
      description: "Gain insights through comprehensive analytics and reporting tools. Visualize trends and make data-driven decisions.",
      icon: (
        <svg className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
          <path d="M7 16l3-4 3 4 4-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      bgColor: "bg-blue-50",
      hoverColor: "group-hover:bg-blue-100"
    },
    {
      title: "Sustainability Metrics",
      description: "Track your environmental impact and progress towards sustainability goals. Measure carbon footprint reduction and more.",
      icon: (
        <svg className="w-10 h-10 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2l.324.001a10 10 0 019.675 9.675L22 12l-.001.324a10 10 0 01-9.675 9.675L12 22l-.324-.001a10 10 0 01-9.675-9.675L2 12l.001-.324a10 10 0 019.675-9.675L12 2z" strokeWidth="1.5" />
          <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" strokeWidth="1.5" />
          <path d="M12 7V5M17 12h2M12 17v2M7 12H5" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      bgColor: "bg-teal-50",
      hoverColor: "group-hover:bg-teal-100"
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium text-sm mb-4">
            FEATURES
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Smart Waste Management Solutions
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Our platform provides everything you need to optimize your waste management processes.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer ${
                  activeFeature === index ? 'ring-2 ring-green-500 shadow-xl' : 'shadow-md hover:shadow-xl'
                }`}
                onMouseEnter={() => setActiveFeature(index)}
                onClick={() => setActiveFeature(index)}
              >
                <div className={`absolute inset-0 rounded-2xl ${feature.bgColor} transition-colors duration-300 ${feature.hoverColor}`}></div>
                
                <div className="relative flex flex-col h-full">
                  <div className="mb-5">
                    <span className={`inline-flex items-center justify-center p-3 rounded-xl
                                    ${activeFeature === index ? 'bg-white shadow-md' : 'bg-white bg-opacity-60'} 
                                    transition-all duration-300`}>
                      {feature.icon}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 flex-grow">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};