'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Award, ArrowUpRight, RefreshCw, FileText, Download, ExternalLink } from 'lucide-react';

// Mock data with correct waste per employee values (lower is better)
const leaderboardData = [
  { id: 1, company: "EcoCare Consulting", position: 1, wastePerEmployee: "1.8", category: "Consulting" },
  { id: 2, company: "GreenTech Solutions", position: 2, wastePerEmployee: "3.2", category: "Technology" },
  { id: 3, company: "Urban Recyclers Ltd", position: 3, wastePerEmployee: "4.1", category: "Recycling" },
  { id: 4, company: "Sustainable Foods Inc", position: 4, wastePerEmployee: "4.8", category: "Food & Beverage" },
  { id: 5, company: "Green Planet Logistics", position: 5, wastePerEmployee: "5.3", category: "Logistics" }
];

// Mock data for reports
const reportData = [
  { 
    id: 1, 
    title: "Annual Sustainability Report 2025", 
    description: "Comprehensive analysis of waste reduction efforts across industries",
    fileSize: "3.2 MB", 
    format: "PDF", 
    date: "March 1, 2025"
  },
  { 
    id: 2, 
    title: "Waste Management Best Practices", 
    description: "Guidelines and recommendations for effective waste management strategies",
    fileSize: "2.8 MB", 
    format: "PDF", 
    date: "February 15, 2025"
  },
  { 
    id: 3, 
    title: "Environmental Impact Data", 
    description: "Raw data on environmental impact of various waste management approaches",
    fileSize: "4.7 MB", 
    format: "XLSX", 
    date: "January 22, 2025"
  },
  { 
    id: 4, 
    title: "Industry Benchmarks 2025", 
    description: "Comparative analysis and benchmarks for different industry sectors",
    fileSize: "2.1 MB", 
    format: "PDF", 
    date: "January 10, 2025"
  },
];

// Stats with correct interpretation of waste metrics
const staticStats = {
  averageWastePerEmployee: 4.2, // kg per employee (lower is better)
  totalCompanies: 124,
  co2Avoided: '15.7K',
  industrySectors: 27
};

export default function PublicInfo() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(staticStats);
  const [dataSource, setDataSource] = useState(leaderboardData);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', request: '' });
  const [formSuccess, setFormSuccess] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsFormSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsFormSubmitting(false);
      setFormSuccess(true);
      setFormData({ name: '', email: '', request: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setFormSuccess(false);
      }, 5000);
    }, 1500);
  };
  
  // Try to fetch from API but fallback to static data
  useEffect(() => {
    const attemptDataFetch = async () => {
      try {
        setLoading(true);
        
        // Use the same API endpoint as in your other pages
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        
        // Try to get auth data from localStorage 
        // (this will only work if the user is logged in on this browser)
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        
        // Only attempt API call if we have authentication data
        if (token && userId && userEmail) {
          const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=season`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-ID': userId,
              'User-Email': userEmail,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.length > 0) {
              // Process the data into the format we need - companies with lower waste per employee are ranked higher
              const processedData = data.data
                .sort((a, b) => {
                  const wastePerEmployeeA = parseFloat(a.wastePerEmployee || a.formattedWastePerEmployee || 1000);
                  const wastePerEmployeeB = parseFloat(b.wastePerEmployee || b.formattedWastePerEmployee || 1000);
                  return wastePerEmployeeA - wastePerEmployeeB; // Lower waste is better
                })
                .slice(0, 5) // Just take top 5
                .map((entry, index) => {
                  // Create a category based on index (since API doesn't provide categories)
                  const categories = ["Consulting", "Technology", "Recycling", "Food & Beverage", "Logistics"];
                  
                  return {
                    id: entry.businessID || index + 1,
                    company: entry.companyName || entry.username || `Company ${index + 1}`,
                    position: index + 1, // Rank based on our sort (1-based)
                    wastePerEmployee: entry.formattedWastePerEmployee || (entry.wastePerEmployee || 0).toFixed(1),
                    category: categories[index % categories.length]
                  };
                });
              
              // Update data if we successfully processed it
              if (processedData.length > 0) {
                setDataSource(processedData);
                
                // Calculate average waste per employee
                const avgWaste = data.data.reduce((sum, item) => {
                  return sum + parseFloat(item.wastePerEmployee || item.formattedWastePerEmployee || 0);
                }, 0) / data.data.length;
                
                // Update the stats with real data
                setStats({
                  ...staticStats,
                  totalCompanies: data.data.length || 124,
                  averageWastePerEmployee: avgWaste.toFixed(1) || 4.2
                });
              }
            }
          }
        }
      } catch (error) {
        console.log("Error fetching data, using static data:", error);
        // Continue with static data (already set)
      } finally {
        setLoading(false);
      }
    };
    
    attemptDataFetch();
  }, []);
  
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-green-700">WasteWise</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className="text-gray-700 hover:text-green-600 px-3 py-2 transition-colors">
                Home
              </Link>
              <Link href="/public-info" className="border-b-2 border-green-500 text-green-600 font-medium px-3 py-2">
                Public Reports
              </Link>
              <Link href="/signup" className="text-gray-700 hover:text-green-600 px-3 py-2 transition-colors">
                Join Us
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-green-600 px-3 py-2 transition-colors">
                Log In
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500">
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-green-700 to-green-600 overflow-hidden">
        <div className="absolute inset-0">
          <svg className="absolute right-0 bottom-0 transform translate-x-1/3" width="404" height="384" fill="none" viewBox="0 0 404 384">
            <defs>
              <pattern id="beehive" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M10 17.3205L1.33975 12.5V2.5L10 7.5L18.6603 2.5V12.5L10 17.3205Z" fill="none" stroke="rgba(255,255,255,0.2)" />
              </pattern>
            </defs>
            <rect width="404" height="384" fill="url(#beehive)" />
          </svg>
          <svg className="absolute left-0 top-0 transform -translate-y-1/4" width="404" height="384" fill="none" viewBox="0 0 404 384">
            <defs>
              <pattern id="circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="5" fill="none" stroke="rgba(255,255,255,0.2)" />
              </pattern>
            </defs>
            <rect width="404" height="384" fill="url(#circles)" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Public Sustainability Data
          </h1>
          <p className="mt-4 max-w-3xl text-xl text-green-100">
            Explore our comprehensive database of waste management statistics, sustainability reports, and industry benchmarks. Together, we're building a more sustainable future.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`${
                activeTab === 'leaderboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm sm:text-base flex-shrink-0 transition-colors`}
            >
              <div className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                <span>Sustainability Leaderboard</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm sm:text-base flex-shrink-0 transition-colors`}
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <span>Downloadable Reports</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Leaderboard Content */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">2025 Sustainability Leaders</h2>
              <p className="mt-2 text-gray-600">
                Companies achieving the lowest waste per employee and highest environmental efficiency. Updated quarterly based on verified data submissions.
              </p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg transition-transform hover:scale-105 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Waste Per Employee</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.averageWastePerEmployee} kg</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg transition-transform hover:scale-105 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Participating Companies</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.totalCompanies}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg transition-transform hover:scale-105 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">CO₂ Emissions Avoided</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.co2Avoided}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg transition-transform hover:scale-105 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Industry Sectors</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.industrySectors}</dd>
                </div>
              </div>
            </div>
            
            {/* Leaderboard Table */}
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    {loading ? (
                      <div className="bg-white px-6 py-12 text-center">
                        <RefreshCw className="animate-spin h-10 w-10 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-500">Loading leaderboard data...</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rank
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Company
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Waste/Employee
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dataSource.map((company) => (
                            <tr 
                              key={company.id} 
                              className={`${company.position <= 3 ? "bg-green-50" : ""} transition-colors hover:bg-gray-50`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full 
                                  ${company.position === 1 ? 'bg-yellow-100 text-yellow-700' : 
                                    company.position === 2 ? 'bg-gray-100 text-gray-700' : 
                                    company.position === 3 ? 'bg-orange-100 text-orange-700' : 
                                    'bg-white text-gray-500'}`}>
                                  {company.position}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{company.company}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{company.category}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {company.wastePerEmployee} kg
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Leaderboard Info */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">About the Leaderboard</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <p className="text-gray-600 mb-4">
                  Our sustainability leaderboard recognizes companies that are making significant strides in waste reduction and environmental responsibility. Rankings are determined based on:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Waste generated per employee (lower is better)</li>
                  <li>Implementation of circular economy principles</li>
                  <li>Innovation in waste management processes</li>
                  <li>Transparency in environmental reporting</li>
                </ul>
                <p className="mt-4 text-gray-600">
                  All data is independently verified by our team of environmental experts. The leaderboard is updated quarterly to reflect the most current sustainability achievements.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Reports Content */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Public Reports & Resources</h2>
              <p className="mt-2 text-gray-600">
                Access our collection of sustainability reports, research papers, and data resources. All downloads are free and available for public use.
              </p>
            </div>
            
            {/* Reports List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {reportData.map((report) => (
                  <li key={report.id}>
                    <div className="block hover:bg-gray-50 transition-colors">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {report.format === 'PDF' ? (
                              <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-md flex items-center justify-center">
                                <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-md flex items-center justify-center">
                                <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{report.title}</div>
                              <div className="text-sm text-gray-500">{report.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">
                              <div>{report.date}</div>
                              <div>{report.fileSize} • {report.format}</div>
                            </div>
                            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Request Form */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Request Custom Data</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Need specific information or reports? Let us know what you're looking for.
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {formSuccess ? (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Request submitted successfully</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Thank you for your request. Our team will review it and get back to you shortly.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-6">
                      <label htmlFor="request" className="block text-sm font-medium text-gray-700">
                        Data Request
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="request"
                          name="request"
                          rows={3}
                          value={formData.request}
                          onChange={handleInputChange}
                          required
                          className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Please describe the specific data or reports you're looking for..."
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-6">
                      <button
                        type="submit"
                        disabled={isFormSubmitting}
                        className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${isFormSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isFormSubmitting ? (
                          <>
                            <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      
      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <h1 className="text-2xl font-bold text-green-400">WasteWise</h1>
              <p className="text-gray-400 text-base">
                Empowering businesses with smart waste tracking and analytics since 2024. Together, we're building a more sustainable future.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-300 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-300 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Resources</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Guides
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        API Status
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Company</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        About
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Blog
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Careers
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Legal</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Privacy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Terms
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Support</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Contact
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-400 hover:text-gray-300 transition-colors">
                        Help Center
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8">
            <p className="text-base text-gray-400 text-center">
              &copy; 2025 WasteWise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}