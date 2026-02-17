
import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || "";

// Helper to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic retry wrapper for API calls
 * Handles 429 (Rate Limit) errors with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes("429") || error?.message?.includes("quota");
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit reached. Retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i, sample, offset = 0, pos = 0;

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([bufferArray], { type: "audio/wav" });
  function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }
}

export const generateImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey });
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "9:16" } }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });
  } catch (error) { 
    console.error("Image generation failed after retries:", error); 
    return null;
  }
};

export const generateTTS = async (text: string): Promise<{ blob: Blob; url: string } | null> => {
  const ai = new GoogleGenAI({ apiKey });
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `بصوت معلق رياضي حماسي جداً، اذكر النص التالي كاملاً: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const wavBlob = audioBufferToWav(audioBuffer);
      return { blob: wavBlob, url: URL.createObjectURL(wavBlob) };
    });
  } catch (error) { 
    console.error("TTS failed after retries:", error); 
    return null;
  }
};

export const createPromptFromText = (line: string, isAction: boolean = false): string => {
  let basePrompt = "Hyper-realistic 8k cinematic football photography, professional sports broadcasting style, volumetric lighting, high shutter speed. ";
  
  if (isAction) {
    basePrompt += "Dynamic in-game action shot, motion blur on background, player sweating, intense facial expression of effort, grass particles flying, high energy. ";
  } else {
    basePrompt += "Heroic portrait, majestic stadium floodlights, cinematic fog, epic composition. ";
  }

  const isMessi = line.includes("ميسي") || line.includes("ليونال");
  const isRonaldo = line.includes("رونالدو") || line.includes("كريستيانو");

  if (isMessi && isRonaldo) {
    return basePrompt + "Cristiano Ronaldo and Lionel Messi standing face to face in a dramatic dark stadium, legendary confrontation, movie poster style, high detail.";
  } else if (isMessi) {
    const actionDesc = isAction ? "performing a magical dribble, twisting past defenders, ball glued to feet" : "standing proudly in Argentina kit, golden light on face";
    return basePrompt + `Lionel Messi ${actionDesc}, hyper-detailed realistic facial features, stadium atmosphere.`;
  } else if (isRonaldo) {
    const actionDesc = isAction ? "sprinting powerfully, leg muscles tensed, explosive movement" : "intense look in Al Nassr kit, stadium floodlights creating lens flare";
    return basePrompt + `Cristiano Ronaldo ${actionDesc}, hyper-detailed realistic facial features, cinematic aesthetic.`;
  }
  
  return basePrompt + line + ", professional football aesthetic.";
};
