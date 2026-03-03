import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
(async () => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: "hi",
        });
        console.log("SUCCESS:", response.text);
    } catch (e: any) {
        console.log("ERROR:", e.message);
    }
})();
