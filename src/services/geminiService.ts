import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel } from "firebase/ai";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(app);

export async function uploadImageToStorage(base64Str: string, folder: string = "uploads"): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith("data:image/")) return base64Str;

  try {
    const match = base64Str.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return base64Str;

    const ext = match[1].split('/')[1] || 'png';
    const fileName = `${folder}/img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // Decode base64
    const binaryString = window.atob(match[2]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: match[1] });

    // Hardcode the correct bucket
    const bucket = "wovn-catalog.firebasestorage.app";
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(fileName)}`;

    const fireRestRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": match[1]
      },
      body: blob
    });

    if (!fireRestRes.ok) {
      const err = await fireRestRes.text();
      console.error(`Firebase REST upload failed: ${fireRestRes.status} ${err}`);
      throw new Error(`Firebase REST upload failed`);
    }

    const data = await fireRestRes.json();
    const token = data.downloadTokens;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;

    return url;
  } catch (error) {
    console.error("Error uploading directly to Firebase:", error);
    return base64Str;
  }
}

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

export async function generateMockup(baseImage: string, compositeImageBase64: string, prompt: string, isRotationRequested: boolean = false, logoBase64: string | null = null) {
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

  const parts: any[] = [
    {
      text: `TASK: Create a professional product mockup.
          
CRITICAL CONSTRAINTS:
${isRotationRequested ?
          '1. ROTATION REQUESTED: YOU MUST COMPLETELY ROTATE THE GARMENT IN 3D SPACE TO THE REQUESTED ANGLE. DO NOT KEEP IT FACING FORWARD! Disregard the camera angle of the first image. We want what this garment would realistically look like photographed from the new requested perspective/side. \n2. ISOLATE ON PURE WHITE (ULTRA-CRITICAL): The garment MUST be completely isolated on a flat, solid, mathematically pure white background (HEX #FFFFFF). Absolutely NO shadows on the floor. NO cream, off-white, light grey, or transparent backgrounds. NO gradients. Every non-garment pixel MUST be exactly #FFFFFF.\n3. LOGO INTEGRATION: Use the second image ONLY to understand what the logo looks like. Disregard its exact 2D coordinates in the second image. Instead, place it realistically on the rotated garment where it would logically sit in 3D space.\n4. 3D WRAPPING: Ensure the logo perfectly contours to the folds and curves of the garment in its newly rotated viewpoint.'
          :
          '1. EXACT PHYSICAL PLACEMENT (CRITICAL): The SECOND image provides the EXACT intended X/Y coordinates, scale, and location of the logo relative to the garment. You MUST place the logo EXACTLY where it is in the second image. DO NOT move the logo. DO NOT resize or shrink the logo. If it is large and off-centered in the second image, keep it large and off-centered.\n2. NO CROPPING: You MUST preserve the exact same framing, zoom level, and camera angle as the FIRST image. The garment should be in the exact same position and scale.\n3. ISOLATE ON PURE WHITE (ULTRA-CRITICAL): The garment MUST be completely isolated on a flat, solid, mathematically pure white background (HEX #FFFFFF). Absolutely NO shadows on the floor. NO cream, off-white, light grey, or transparent backgrounds. NO gradients. Every non-garment pixel MUST be exactly #FFFFFF.\n4. 3D WRAPPING & PERSPECTIVE: Do NOT leave the logo perfectly flat. You MUST warp, curve, and distort the logo so that it perfectly wraps around the 3D contours, folds, and cylindrical shapes of the garment at the provided exact location.'}
5. TEXT & TYPOGRAPHY PRESERVATION (CRITICAL): You MUST perfectly protect and preserve the exact spelling, typography, and lettering in the logo! Do NOT blur, scramble, or hallucinate the text under any circumstances. Keep it perfectly sharp and completely legible.${logoBase64 ? '\n6. The THIRD image provided is the original high-resolution logo artwork. Use it as the absolute source of truth for the exact shapes, text, and spelling to prevent jumbling!' : ''}
${logoBase64 ? '7' : '6'}. FINISH: Follow the fabric's lighting, shadows, and texture realistically ON THE GARMENT ONLY.

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
  ];

  if (logoBase64) {
    let logoData = logoBase64;
    let logoMimeType = "image/png";
    if (logoBase64.startsWith('http')) {
      const result = await toBase64(logoBase64);
      logoData = result.data;
      logoMimeType = result.mimeType;
    } else {
      logoData = logoBase64.split(",")[1] || logoBase64;
      const match = logoBase64.match(/^data:(image\/[a-z]+);base64,/);
      if (match) logoMimeType = match[1];
    }

    // To prevent Gemini from altering the output aspect ratio when mixing images of different dimensions, we pad the high-res logo to perfectly match the base garment image's aspect ratio.
    const paddedLogoBase64 = await new Promise<string>((resolve) => {
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";
      baseImg.onload = () => {
        const targetAspect = baseImg.width / baseImg.height;

        const lgImg = new Image();
        lgImg.crossOrigin = "anonymous";
        lgImg.onload = () => {
          const logoAspect = lgImg.width / lgImg.height;
          let drawW = lgImg.width;
          let drawH = lgImg.height;
          let canvasW = lgImg.width;
          let canvasH = lgImg.height;

          if (logoAspect > targetAspect) {
            canvasH = canvasW / targetAspect;
          } else {
            canvasW = canvasH * targetAspect;
          }

          const canvas = document.createElement('canvas');
          canvas.width = canvasW;
          canvas.height = canvasH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(`data:${logoMimeType};base64,${logoData}`);

          // Center the logo on this properly proportioned transparent canvas
          const x = (canvasW - drawW) / 2;
          const y = (canvasH - drawH) / 2;
          ctx.drawImage(lgImg, x, y);

          resolve(canvas.toDataURL('image/png'));
        };
        lgImg.onerror = () => resolve(`data:${logoMimeType};base64,${logoData}`);
        lgImg.src = `data:${logoMimeType};base64,${logoData}`;
      };
      baseImg.onerror = () => resolve(`data:${logoMimeType};base64,${logoData}`);
      baseImg.src = baseImage;
    });

    const finalLogoData = paddedLogoBase64.split(",")[1] || paddedLogoBase64;

    parts.push({
      inlineData: {
        data: finalLogoData,
        mimeType: 'image/png',
      }
    });

    // We explicitly tell it the precise layout of the bounding box to prevent the garment 
    // from shifting when the 3rd image is passed in without layout framing
    parts[0].text = parts[0].text.replace(
      '2. NO CROPPING: You MUST preserve the exact same framing, zoom level, and camera angle as the FIRST image. The garment should be in the exact same position and scale.',
      '2. EXACT CROPPING & POSITION (CRITICAL): You MUST output an image with the EXACT same framing, dimensions, padding, zoom level, and centered placement as the FIRST image. The garment MUST perfectly overlap the first image pixel-for-pixel in scale and position.'
    );
  }

  // We send both images (and optional logo) and a prompt to the model
  const result = await modelObj.generateContent(parts);

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

export async function generateModelScene(baseImage: string, prompt: string) {
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

  const modelObj = getGenerativeModel(ai, {
    model,
  });

  const result = await modelObj.generateContent([
    {
      text: `TASK: Create a professional lifestyle photography scene with a real human model wearing the provided garment.
          
CRITICAL CONSTRAINTS:
1. SUBJECT: Render a realistic human model wearing the garment from the provided image.
2. GARMENT ACCURACY: The garment on the model MUST match the provided garment EXACTLY in terms of color, logos, graphics, shape, and style. Ensure the logo is clearly visible and correctly placed.
3. SCENE: ${prompt}
4. QUALITY: The image should be a highly realistic, professional lifestyle photography shot.`
    },
    {
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
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

  throw new Error("Failed to generate model scene image");
}

export async function generateRotatedGarment(baseImage: string, viewAngle: string) {
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

  const modelObj = getGenerativeModel(ai, { model });

  const result = await modelObj.generateContent([
    {
      text: `TASK: Rotate Garment
CRITICAL CONSTRAINTS:
1. COMPLETELY ROTATE THE GARMENT IN 3D SPACE TO DISPLAY THE: ${viewAngle}.
2. DO NOT KEEP IT FACING THE SAME DIRECTION as the original image. We want what this garment would realistically look like photographed from the new requested perspective/side.
3. ISOLATE ON PURE WHITE (ULTRA-CRITICAL): The garment MUST be completely isolated on a flat, solid, mathematically pure white background (HEX #FFFFFF). Absolutely NO shadows on the floor. NO cream, off-white, light grey, or transparent backgrounds. NO gradients. Every non-garment pixel MUST be exactly #FFFFFF.
4. Keep the same exact fabric, collar style, sleeve style, proportions, and details.
5. Do NOT add any logos or graphics. Just the blank garment.`
    },
    {
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
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

  throw new Error("Failed to generate rotated garment image");
}

export async function generateColorVariation(baseImage: string, colorHexOrPattern: string) {
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

  const modelObj = getGenerativeModel(ai, {
    model,
  });

  const isPattern = colorHexOrPattern.startsWith('data:image/') || colorHexOrPattern.startsWith('http');
  const parts: any[] = [];

  if (isPattern) {
    let patternData: string;
    let patternMimeType = "image/png";

    if (colorHexOrPattern.startsWith('http')) {
      const result = await toBase64(colorHexOrPattern);
      patternData = result.data;
      patternMimeType = result.mimeType;
    } else {
      patternData = colorHexOrPattern.split(",")[1] || colorHexOrPattern;
      const match = colorHexOrPattern.match(/^data:(image\/[a-z]+);base64,/);
      if (match) patternMimeType = match[1];
    }

    parts.push({
      text: `TASK: Recoloring / Pattern Application
CRITICAL CONSTRAINTS:
1. APPLY the EXACT pattern and colors from the second image onto the garment in the first image. The garment should be fully covered in this pattern/color.
2. Preserve all lighting, shadows, fabric textures, folds, and details authentically ON THE GARMENT ONLY.
3. ISOLATE ON PURE WHITE (ULTRA-CRITICAL): The garment MUST be completely isolated on a flat, solid, mathematically pure white background (HEX #FFFFFF). Absolutely NO shadows on the floor. NO cream, off-white, light grey, or transparent backgrounds. NO gradients. Every non-garment pixel MUST be exactly #FFFFFF.
4. EXACT CROPPING & POSITION (CRITICAL): You MUST output an image with the EXACT same framing, dimensions, padding, zoom level, and centered placement as the FIRST image. The garment MUST perfectly overlap the first image pixel-for-pixel in scale and position.`
    });
    parts.push({
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
      }
    });
    parts.push({
      inlineData: {
        data: patternData,
        mimeType: patternMimeType,
      }
    });
  } else {
    parts.push({
      text: `TASK: Recoloring
CRITICAL CONSTRAINTS:
1. ONLY change the color of the garment in the image to exactly match this hex color code: ${colorHexOrPattern}.
2. Preserve all lighting, shadows, fabric textures, folds, and details authentically ON THE GARMENT ONLY.
3. ISOLATE ON PURE WHITE (ULTRA-CRITICAL): The garment MUST be completely isolated on a flat, solid, mathematically pure white background (HEX #FFFFFF). Absolutely NO shadows on the floor. NO cream, off-white, light grey, or transparent backgrounds. NO gradients. Every non-garment pixel MUST be exactly #FFFFFF.
4. EXACT CROPPING & POSITION (CRITICAL): You MUST output an image with the EXACT same framing, dimensions, padding, zoom level, and centered placement as the FIRST image. The garment MUST perfectly overlap the first image pixel-for-pixel in scale and position.`
    });
    parts.push({
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
      }
    });
  }

  const result = await modelObj.generateContent(parts);

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

  throw new Error("Failed to generate colored variation or pattern applying.");
}

export async function removeImageBackground(baseImage: string): Promise<string> {
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

  const modelObj = getGenerativeModel(ai, { model });

  const result = await modelObj.generateContent([
    {
      text: `TASK: Background Removal
CRITICAL CONSTRAINTS:
1. REMOVE THE BACKGROUND ENTIRELY AND OUTPUT A TRANSPARENT PNG. 
2. The background must be 100% transparent (alpha = 0). Do NOT use a solid white or solid grey background. 
3. The user previously rejected your output because you left a faint grey background. You must erase the background completely to transparency.
4. DO NOT cast any shadows on the floor. Erase all floor context.
5. Keep the garment ITSELF 100% UNTOUCHED (same exact color, lighting, textures, and shape).
6. Do NOT change the framing, zoom, crop, or orientation.`
    },
    {
      inlineData: {
        data: baseImageData,
        mimeType: baseMimeType,
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

  throw new Error("Failed to remove background.");
}

export async function convertColorToHex(colorName: string): Promise<string | null> {
  try {
    const modelObj = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
    const result = await modelObj.generateContent(`What is the closest hex code for the color "${colorName}"? Reply EXACTLY and ONLY with the 6-character hex code starting with #. Do not include any other text.`);
    const text = result.response.text().trim();
    const match = text.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0].toUpperCase() : null;
  } catch (err) {
    console.error("Failed to convert color to hex:", err);
    return null;
  }
}

export async function analyzeMarketPricing(
  garmentData: { name?: string | null, type?: string | null, details?: string | null, category?: string | null, fabric_details?: string | null }
): Promise<Array<{ brand: string, name: string, msrp: string, link: string, summary: string }>> {
  const modelObj = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
  
  const prompt = `
  TASK: Perform a luxury market pricing analysis for a garment with the following specs:
  - Name: ${garmentData.name || 'Unknown'}
  - Type: ${garmentData.type || 'Unknown'}
  - Category: ${garmentData.category || 'Unknown'}
  - Details: ${garmentData.details || 'Unknown'}
  - Fabric: ${garmentData.fabric_details || 'Unknown'}
  
  Please search your knowledge base (as if scanning the current internet) for 3 similar luxury or premium items from top brands (e.g. Vuori, G-Star, Tropic of C, Lululemon, Alo Yoga, Rhone, Kith, etc.) that match this style and market tier.
  
  Return the output EXACTLY as a valid JSON array of objects, with NO markdown formatting, NO backticks. Do not include \`\`\`json. Just the raw array.
  Each object MUST have these exact string keys:
  - "brand": The name of the brand
  - "name": The name of the comparable garment
  - "msrp": The estimated retail price (e.g. "$128")
  - "link": A realistic URL link to the product or brand's category page
  - "summary": A 1-sentence explanation of why it's comparable
  `;

  const result = await modelObj.generateContent(prompt);
  let text = result.response.text().trim();
  
  try {
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse Market Pricing JSON:", text, err);
    throw new Error("Market analysis failed to return valid JSON. Please try again.");
  }
}
