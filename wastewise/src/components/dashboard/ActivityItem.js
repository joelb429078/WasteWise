'use client';

export const ActivityItem = ({ type, description, timestamp, user }) => {
  const getIcon = () => {
    switch (type) {
      case 'waste':
        return '🗑️';
      case 'achievement':
        return '🏆';
      default:
        return '📝';
    }
  };

  return (
    <div className="flex items-start space-x-4 p-4 hover:bg-gray-50 transition-colors duration-200 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{description}</p>
        <p className="text-sm text-gray-500">
          {user} • {new Date(timestamp).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};