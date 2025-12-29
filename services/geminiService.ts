
import { GoogleGenAI } from "@google/genai";
import { EntityProfile, TimeSlot, AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are an expert Timetable Data Extractor. 
    Your task is to analyze the provided document (PDF/Image/Text) and extract the timetable data with 100% accuracy.

    First, determine if the document is a "TEACHER_WISE" timetable (Main headers are Teacher Names) or a "CLASS_WISE" timetable (Main headers are Class Names).

    Return a JSON object with this exact structure:
    {
      "detectedType": "TEACHER_WISE" or "CLASS_WISE",
      "profiles": [
         {
            "name": "Name of the Teacher or Class",
            "schedule": {
                "Mon": { "1": { "subject": "MATH", "room": "R1", "code": "The code found in this slot" }, ... },
                ...
            }
         }
      ],
      "unknownCodes": ["List", "of", "all", "unique", "codes", "found", "inside", "the", "slots"]
    }

    CRITICAL RULES:
    1. "code": If this is a Teacher-wise timetable, the "code" inside a slot is the Class Code (e.g., "10A", "G9").
    2. "code": If this is a Class-wise timetable, the "code" inside a slot is the Teacher Code (e.g., "JD", "SMT").
    3. Extract ALL profiles found in the file.
    4. "unknownCodes" must be a unique list of all the codes found inside the schedule slots.
`;

/**
 * Parses raw text or file using Gemini 3 Pro with high context.
 */
export const processTimetableImport = async (input: { text?: string, base64?: string, mimeType?: string }): Promise<AiImportResult | null> => {
  // Always initialize right before use to ensure the latest API Key is picked up from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    let contentPart: any;
    
    if (input.base64 && input.mimeType) {
        contentPart = { parts: [{ inlineData: { data: input.base64, mimeType: input.mimeType } }] };
    } else if (input.text) {
        contentPart = { parts: [{ text: input.text }] };
    } else {
        return null;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: contentPart,
      config: {
        systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 1000 } // Add thinking budget for complex parsing
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    const processedProfiles = data.profiles?.map((p: any) => ({
        ...p,
        schedule: mapScheduleCodes(p.schedule)
    }));

    return {
        detectedType: data.detectedType || 'CLASS_WISE',
        profiles: processedProfiles || [],
        unknownCodes: data.unknownCodes || [],
        rawTextResponse: text
    };

  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};

const mapScheduleCodes = (rawSchedule: any) => {
    const newSchedule: any = {};
    if (!rawSchedule) return {};

    Object.keys(rawSchedule).forEach(day => {
        newSchedule[day] = {};
        if (rawSchedule[day]) {
            Object.keys(rawSchedule[day]).forEach(period => {
                const slot = rawSchedule[day][period];
                if (slot) {
                    newSchedule[day][period] = {
                        subject: slot.subject,
                        room: slot.room,
                        teacherOrClass: slot.code
                    };
                }
            });
        }
    });
    return newSchedule;
};

/**
 * Generates an assistant response using Gemini 3 Flash.
 */
export const generateAiResponse = async (userPrompt: string, dataContext: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are an AI assistant for ${dataContext.schoolName}. 
    Answer questions based on this data: ${JSON.stringify(dataContext.entities.filter((d: any) => Object.keys(d.schedule || {}).length > 0))}
    Be helpful and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Error processing request.";
  }
};
