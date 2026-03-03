import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
(async () => {
    try {
        const response = await ai.models.list({});
        for await (const model of response) {
            console.log(model.name);
        }
    } catch (e: any) {
        console.log("ERROR:", e.message);
    }
})();
