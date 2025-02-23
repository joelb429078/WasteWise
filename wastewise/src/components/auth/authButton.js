'use client';

export const AuthButton = ({ children, loading, ...props }) => {
  return (
    <button
      {...props}
      className={`
        w-full px-4 py-2 text-white font-medium rounded-lg
        transition-all duration-300 transform
        ${loading 
          ? 'bg-green-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700 active:scale-95 hover:shadow-lg'
        }
      `}
      disabled={loading}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
          <span className="ml-2">Processing...</span>
        </div>
      ) : children}
    </button>
  );
};