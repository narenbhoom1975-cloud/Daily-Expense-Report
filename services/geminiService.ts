import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseResponse } from '../types';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data:audio/xyz;base64, prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
  });
};

export const processAudioWithGemini = async (audioBlob: Blob): Promise<ExpenseResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Audio = await blobToBase64(audioBlob);

  // Using a schema to ensure perfect structure and type extraction
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      transcription: {
        type: Type.STRING,
        description: "The exact Hindi or English transcription of the audio."
      },
      translation: {
        type: Type.STRING,
        description: "The English translation of the transcription."
      },
      expenses: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            item: { type: Type.STRING, description: "The name of the item purchased." },
            amount: { type: Type.NUMBER, description: "The cost of the item. Resolve words like 'lakh', 'hazar' to numbers." },
            category: { 
              type: Type.STRING, 
              description: "Category of the expense (e.g., Food, Electronics, Transport)." 
            }
          }
        }
      },
      totalAmount: {
        type: Type.NUMBER,
        description: "The sum of all expense amounts detected."
      },
      currency: {
        type: Type.STRING,
        description: "The currency detected (e.g., INR, USD)."
      }
    }
  };

  const systemInstruction = `
    You are an expert financial assistant and translator. 
    Your goal is to listen to audio recordings that may contain mixed Hindi and English speech about daily expenses.
    
    Tasks:
    1. Transcribe the audio accurately in the original script (Devanagari for Hindi).
    2. Translate it to clear English.
    3. Extract every single expense item mentioned.
    4. CRITICAL: Convert number words to digits with extreme precision. 
       - Handle Indian numbering system: "ek lakh" = 100000, "pachis hazar" = 25000, "dedh lakh" = 150000.
       - Handle mixed phrasing: "200 ka aaloo" (200 for potatoes).
    5. Categorize each item accurately.
    6. Calculate the total sum.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: "Please analyze this audio for expenses."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1 // Low temperature for factual extraction
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExpenseResponse;
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};