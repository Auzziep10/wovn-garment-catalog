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

export async function generateMockup(baseImage: string, compositeImageBase64: string, prompt: string, isRotationRequested: boolean = false) {
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

  const compositeData = compositeImageBase64.split(",")[1] || compositeImageBase64;
  const compositeMatch = compositeImageBase64.match(/^data:(image\/[a-z]+);base64,/);
  const compositeMimeType = compositeMatch ? compositeMatch[1] : "image/png";

  const modelObj = getGenerativeModel(ai, {
    model,
    // Note: Do not specify aspectRatio here so it exactly inherits 
    // the source dimension aspect ratio and prevents off-centering/cropping
    // generationConfig: {
    //   // @ts-ignore
    //   imageConfig: { aspectRatio: "3:4" }
    // }
  });

  // We send both images and a prompt to the model
  const result = await modelObj.generateContent([
    {
      text: `TASK: Create a professional product mockup.
          
CRITICAL CONSTRAINTS:
${isRotationRequested ?
          '1. ROTATION REQUESTED: You are instructed to rotate the garment based on the USER PLACEMENT & FINISH INSTRUCTIONS below. DO NOT preserve the original camera angle. The background should remain similar, but the garment should be generated from the requested new perspective.'
          :
          '1. NO CROPPING: You MUST preserve the exact same framing, zoom level, and camera angle as the first image. The garment should be in the same position and scale.'}
2. BACKGROUND: Keep the background from the first image identical.
3. LOGO INTEGRATION: The second image shows the garment with the logo manually placed as a flat overlay. Please update the first image to incorporate this logo realistically into the fabric.
4. 3D WRAPPING & PERSPECTIVE: Do NOT leave the logo perfectly flat. You MUST warp, curve, and distort the logo so that it perfectly wraps around the 3D contours, folds, and cylindrical shapes of the garment (e.g. curving around a sleeve, bending over a hat, or sinking into fabric folds) at that exact location.
5. FINISH: Follow the fabric's lighting, shadows, and texture perfectly at that specific location.

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
        data: compositeData,
        mimeType: compositeMimeType,
      }
    }
  ]);

  const response = result.response;
  const candidates = response.candidates;

  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
      }
      if (part.text && part.text.startsWith('iVBORw0KGgo')) {
        return `data:image/png;base64,${part.text}`;
      }
    }
  }

  throw new Error("Failed to generate mockup image");
}
