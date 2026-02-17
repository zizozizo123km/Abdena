
import React, { useState } from 'react';
import { Zap } from 'lucide-react';

interface SetupScreenProps {
  onStart: (script: string) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [script, setScript] = useState<string>(
    "مقارنة سريعة بين كريستيانو رونالدو و ليونال ميسي صورة مشهد اول\n" +
    "السرعة قم بتكرر صورة مشهد اول هنا\n" +
    "ليونال ميسي. وهنا اصنع صورة العب\n" +
    "الكنترول وهنا كرر صور مشهد صورة اولى\n" +
    "ليونال ميسي وهنا صورة العب\n" +
    "القوة البدنيةوهنا كرر صورة مشهد اول\n" +
    "كريستيانو رونالدو صورة مشهد العب وهنا"
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 z-10 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 bg-[#0d0d0d] p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative">
        <div className="text-center space-y-4">
          <div className="inline-block bg-blue-500/10 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
            Smart Comparison V3
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic leading-tight">
            مونتاج <span className="text-blue-500">ميسي ورونالدو</span>
          </h2>
          <p className="text-gray-400 text-sm italic">
            استخدم "كرر صورة مشهد اول" للاستمرارية، و"صورة العب" للقطات الحماسية.
          </p>
        </div>
        
        <div className="space-y-4">
          <textarea 
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full h-64 bg-black border border-white/10 rounded-3xl p-6 text-lg outline-none focus:border-blue-500 transition-all resize-none text-right"
            placeholder="اكتب السكريبت هنا..."
          />
          
          <button 
            onClick={() => onStart(script)}
            className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl transform active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Zap className="w-6 h-6 fill-current" />
            توليد المونتاج الذكي
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
