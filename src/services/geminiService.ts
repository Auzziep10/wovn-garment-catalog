import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel } from "firebase/ai";

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Initialize Firebase App for the frontend
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app);

async function toBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({
      data: (reader.result as string).split(',')[1],
      mimeType
    });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateMockup(baseImage: string, logoBase64: string, prompt: string) {
  // Nano Banana is the Gemini 2.5 Flash Image model
  const model = "gemini-2.5-flash-image";

  let baseImageData: string;
  let baseMimeType = "image/png";

  if (baseImage.startsWith('http')) {
    const result = await toBase64(baseImage);
    baseImageData = result.data;
    baseMimeType = result.mimeType;
  } else {
    baseImageData = baseImage.split(",")[1] || baseImage;
    const match = baseImage.match(/^data:(image\/[a-z]+);base64,/);
    if (match) baseMimeType = match[1];
  }

  const logoData = logoBase64.split(",")[1] || logoBase64;
  const logoMatch = logoBase64.match(/^data:(image\/[a-z]+);base64,/);
  const logoMimeType = logoMatch ? logoMatch[1] : "image/png";

  const modelObj = getGenerativeModel(ai, {
    model,
    generationConfig: {
      // @ts-ignore
      imageConfig: { aspectRatio: "3:4" }
    }
  });

  // We send both images and a prompt to the model
  const result = await modelObj.generateContent([
    {
      text: `TASK: Create a professional product mockup.
          
CRITICAL CONSTRAINTS:
1. NO CROPPING: You MUST preserve the exact same framing, zoom level, and camera angle as the first image. The garment should be in the same position and scale.
2. BACKGROUND: Keep the background from the first image identical.
3. LOGO INTEGRATION: Take the logo from the second image and place it realistically on the garment.
4. PLACEMENT: Follow the user's specific placement coordinates and finish description provided below. The logo should follow the fabric's lighting, shadows, and texture at that specific location.

USER PLACEMENT & FINISH INSTRUCTIONS:
${prompt}`
    },
    {
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
      }
    },
    {
      inlineData: {
        data: logoData,
        mimeType: logoMimeType,
      }
    }
  ]);

  const response = result.response;
  const candidates = response.candidates;

  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (part.text && part.text.startsWith('iVBORw0KGgo')) {
        return `data:image/png;base64,${part.text}`;
      }
    }
  }

  throw new Error("Failed to generate mockup image");
}
