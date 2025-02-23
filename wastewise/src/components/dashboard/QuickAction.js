'use client';
import Link from 'next/link';

export const QuickAction = ({ title, description, href, icon }) => {
  return (
    <Link href={href}>
      <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
        <div className="text-green-500 mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
};