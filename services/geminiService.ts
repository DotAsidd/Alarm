
import { GoogleGenAI, Modality } from "@google/genai";

// Standard decoding helper as per @google/genai guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Standard audio data decoding helper as per @google/genai guidelines
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

export const generateReminderMessage = async (currentTime: string): Promise<string> => {
  try {
    // Fixed: Initialize client within the call for consistent API key usage
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The current Philippine Time is ${currentTime}. It's a 10-minute reminder interval. Give me a short, powerful, and encouraging productivity tip or motivational quote (max 15 words) that feels personal and helpful. Avoid generic greetings.`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    // Fixed: Accessed response.text property directly without parentheses
    return response.text || "Time for a quick check-in! Stay focused.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep pushing forward! You're doing great.";
  }
};

export const speakMessage = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        // Fixed: Use Modality.AUDIO from @google/genai
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Fixed: Use guidelines-compliant decoding logic for raw PCM data
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        24000,
        1,
      );
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Error:", error);
    // Fallback to browser SpeechSynthesis
    const ut = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(ut);
  }
};
