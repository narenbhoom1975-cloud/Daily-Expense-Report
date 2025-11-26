import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseResponse } from '../types';

// Manual declaration to satisfy TypeScript without strict node types
declare const process: {
  env: {
    API_KEY: string;
  };
};

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

// Retry helper function to handle transient API errors
async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Gemini API call failed, retrying... Attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const processAudioWithGemini = async (audioBlob: Blob): Promise<ExpenseResponse> => {
  // Use the declared process.env.API_KEY
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

  // Wrap the entire API call in a retry block
  return retryOperation(async () => {
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
          temperature: 0.1, // Low temperature for factual extraction
          // Lower safety settings to prevent false positives on normal speech
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }
      });

      if (response.text) {
        // Robust cleaning of the response text before parsing
        let cleanText = response.text.trim();
        // Remove markdown formatting if present (Gemini sometimes wraps JSON in ```json ... ```)
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
        }
        
        return JSON.parse(cleanText) as ExpenseResponse;
      } else {
        throw new Error("Empty response from Gemini");
      }
    } catch (error) {
      console.error("Gemini API Error (Attempt failed):", error);
      throw error;
    }
  });
};