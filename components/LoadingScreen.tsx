
import React from 'react';

interface LoadingScreenProps {
  status: string;
  progress: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ status, progress }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-4">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-2xl font-black italic animate-pulse">{status}</p>
      <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mx-auto">
        <div 
          className="h-full bg-blue-500 transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default LoadingScreen;
