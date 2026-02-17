
import React from 'react';
import { Award, RotateCcw, Download } from 'lucide-react';

interface HeaderProps {
  showExport: boolean;
  onExport: () => void;
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ showExport, onExport, onReset }) => {
  return (
    <nav className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur-xl z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
          <Award className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-black italic text-lg uppercase tracking-tighter">
            Foot_ben <span className="text-blue-500 underline decoration-2">PRO</span>
          </span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">SMART COMPARISON ENGINE</span>
        </div>
      </div>
      <div className="flex gap-4">
        {showExport && (
          <button 
            onClick={onExport}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all"
          >
            <Download className="w-4 h-4" />
            تصدير الفيديو
          </button>
        )}
        <button 
          onClick={onReset}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-gray-400"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};

export default Header;
