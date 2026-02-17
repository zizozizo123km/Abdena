
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import Header from './components/Header.tsx';
import SetupScreen from './components/SetupScreen.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import { Scene, AppStep } from './types.ts';
import { generateImage, generateTTS, createPromptFromText } from './services/geminiService.ts';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("جاري التحضير...");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startProduction = async (scriptText: string) => {
    setStep(AppStep.LOADING);
    const lines = scriptText.split('\n').filter(l => l.trim() !== '');
    const generatedScenes: Scene[] = [];
    let firstSceneImage: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      setLoadingStatus(`توليد المشهد ${i + 1} من ${lines.length}`);
      setLoadingProgress(((i + 1) / lines.length) * 100);

      const isRepeatRequested = line.includes("كرر") || 
                                line.includes("تكرر") || 
                                line.includes("صورة أولى") || 
                                line.includes("مشهد اول") ||
                                line.includes("السرعة") || 
                                line.includes("الكنترول") || 
                                line.includes("القوة") || 
                                line.includes("الخصائص");

      const isActionRequested = line.includes("صورة العب") || 
                                line.includes("مشهد العب") || 
                                line.includes("أكشن") || 
                                line.includes("اصنع صورة العب");

      let imgData: string | null = null;

      if (i === 0) {
        imgData = await generateImage(createPromptFromText(line, false));
        firstSceneImage = imgData;
      } else if (isRepeatRequested && firstSceneImage && !isActionRequested) {
        imgData = firstSceneImage;
      } else if (isActionRequested) {
        imgData = await generateImage(createPromptFromText(line, true));
      } else {
        imgData = await generateImage(createPromptFromText(line, false));
      }

      await new Promise(r => setTimeout(r, 800));
      const ttsResult = await generateTTS(line);

      if (imgData && ttsResult) {
        const newScene = {
          text: line,
          image: imgData,
          audioBlob: ttsResult.blob,
          audioUrl: ttsResult.url
        };
        generatedScenes.push(newScene);
        
        if (i === 0) {
          setScenes([...generatedScenes]);
          setStep(AppStep.PLAYER);
        }
      } else if (i === 0) {
        alert("فشل توليد المشهد الأول. يرجى التأكد من كوتا الـ API أو المحاولة لاحقاً.");
        setStep(AppStep.SETUP);
        return;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    setScenes(generatedScenes);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playScene(currentSceneIndex);
    }
  };

  const playScene = (index: number) => {
    if (index >= scenes.length) {
      setIsPlaying(false);
      return;
    }
    setCurrentSceneIndex(index);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && scenes[currentSceneIndex]) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = scenes[currentSceneIndex].audioUrl;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      audioRef.current.onended = () => {
        if (currentSceneIndex + 1 < scenes.length) playScene(currentSceneIndex + 1);
        else setIsPlaying(false);
      };
    }
    return () => { if (audioRef.current) audioRef.current.onended = null; };
  }, [isPlaying, currentSceneIndex, scenes]);

  const regenerateCurrentScene = async () => {
    const scene = scenes[currentSceneIndex];
    if (!scene) return;
    setLoadingStatus("جاري التحديث...");
    const isAction = scene.text.includes("صورة العب") || scene.text.includes("مشهد العب") || scene.text.includes("أكشن");
    const newImg = await generateImage(createPromptFromText(scene.text, isAction));
    if (newImg) {
      const updatedScenes = [...scenes];
      updatedScenes[currentSceneIndex].image = newImg;
      setScenes(updatedScenes);
    }
  };

  const cleanTextForDisplay = (text: string) => {
    return text
      .replace(/صورة مشهد اول/g, '')
      .replace(/كرر صورة مشهد اول/g, '')
      .replace(/كرر/g, '')
      .replace(/وهنا اصنع صورة العب/g, '')
      .replace(/وهنا صورة العب/g, '')
      .replace(/صورة مشهد العب وهنا/g, '')
      .replace(/وهنا/g, '')
      .trim();
  };

  const handleExport = async () => {
    if (scenes.length === 0) return;
    setExporting(true);
    setExportProgress(0);
    setLoadingStatus("جاري تحضير المحرك الصوتي...");

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // تهيئة الصوت
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();
    
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(new MediaStream([...stream.getTracks(), ...dest.stream.getTracks()]), {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FootBen_AI_Export_${Date.now()}.webm`;
      a.click();
      setExporting(false);
    };

    // تحميل مسبق للصور وفك تشفير الصوت
    setLoadingStatus("جاري معالجة البيانات...");
    const loadedAssets = await Promise.all(scenes.map(async (scene) => {
      const img = new Image();
      img.src = scene.image;
      await new Promise(resolve => img.onload = resolve);
      
      const arrayBuffer = await scene.audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      return { img, audioBuffer, text: cleanTextForDisplay(scene.text) };
    }));

    recorder.start();
    const startTime = audioCtx.currentTime;
    let currentScheduleTime = startTime;

    // وظيفة الرسم
    const draw = (asset: any, progress: number) => {
      const scale = 1 + (progress * 0.05);
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(asset.img, x, y, w, h);

      // ظل النصوص
      const grad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

      // رسم العلامة
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height - 200);
      ctx.transform(1, 0, -0.15, 1, 0, 0);
      
      ctx.font = '900 42px "Cairo"';
      const tw = ctx.measureText(asset.text).width + 60;
      ctx.fillStyle = '#DFFF00';
      ctx.fillRect(-tw/2, -40, tw, 80);
      
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(asset.text, 0, 0);
      ctx.restore();

      // شعارFootBen
      ctx.font = 'bold 24px "Cairo"';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText("FOOTBEN PRO AI", canvas.width/2, 60);
    };

    // معالجة المشاهد بجدولة زمنية دقيقة
    for (let i = 0; i < loadedAssets.length; i++) {
      const asset = loadedAssets[i];
      setLoadingStatus(`رندر المشهد ${i + 1}...`);
      setExportProgress(((i + 1) / scenes.length) * 100);

      const source = audioCtx.createBufferSource();
      source.buffer = asset.audioBuffer;
      source.connect(dest);
      source.start(currentScheduleTime);

      const duration = asset.audioBuffer.duration;
      const sceneEndTime = currentScheduleTime + duration;

      // حلقة الرسم متزامنة مع وقت AudioContext
      while (audioCtx.currentTime < sceneEndTime) {
        const elapsed = audioCtx.currentTime - currentScheduleTime;
        const progress = Math.min(elapsed / duration, 1);
        draw(asset, progress);
        await new Promise(r => requestAnimationFrame(r));
      }

      currentScheduleTime = sceneEndTime;
    }

    // انتظر قليلاً لضمان تسجيل آخر إطارات
    await new Promise(r => setTimeout(r, 500));
    recorder.stop();
    audioCtx.close();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-hidden">
      <Header 
        showExport={step === AppStep.PLAYER} 
        onExport={handleExport} 
        onReset={() => window.location.reload()} 
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {exporting && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 border-4 border-[#DFFF00]/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#DFFF00] rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-black mb-2 italic text-[#DFFF00]">{loadingStatus}</h3>
            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mt-4 shadow-inner">
              <div 
                className="h-full bg-[#DFFF00] transition-all duration-300 shadow-[0_0_15px_#DFFF00]" 
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <p className="mt-6 text-gray-400 text-sm font-bold uppercase tracking-widest animate-pulse">
              جاري معالجة الصوت والصورة بجودة احترافية
            </p>
          </div>
        )}

        {step === AppStep.SETUP && <SetupScreen onStart={startProduction} />}
        {step === AppStep.LOADING && <LoadingScreen status={loadingStatus} progress={loadingProgress} />}

        {step === AppStep.PLAYER && scenes.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 bg-black flex items-center justify-center relative p-4">
              <div className="absolute top-8 right-8 z-30">
                <button onClick={regenerateCurrentScene} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 transition-all group shadow-lg">
                  <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-all" />
                </button>
              </div>

              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-[#080808] group h-[80vh] aspect-[9/16] max-w-full">
                <img src={scenes[currentSceneIndex]?.image} className="w-full h-full object-cover image-zoom" alt="AI Content" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent"></div>
                
                <div className="absolute bottom-28 left-0 right-0 px-6 text-center z-10">
                  <div className="inline-block bg-[#DFFF00] text-black px-6 py-4 rounded-2xl font-black text-xl md:text-2xl italic shadow-[0_15px_40px_rgba(223,255,0,0.4)] skew-tag leading-tight border-b-4 border-black/20">
                    {cleanTextForDisplay(scenes[currentSceneIndex]?.text)}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20">
                  <button onClick={handleTogglePlay} className="w-20 h-20 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/30 shadow-2xl scale-90 hover:scale-100 transition-transform">
                    {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="h-20 bg-[#0a0a0a] border-t border-white/5 p-4 overflow-x-auto no-scrollbar flex items-center gap-4">
              <div className="flex gap-4 px-2">
                {scenes.map((s, i) => (
                  <div key={i} onClick={() => { setIsPlaying(false); setCurrentSceneIndex(i); }}
                    className={`w-10 h-14 rounded-md overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
                      i === currentSceneIndex ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'
                    }`}>
                    <img src={s.image} className="w-full h-full object-cover" alt="thumb" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
