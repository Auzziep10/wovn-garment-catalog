import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_to_prevent_crash" });

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

  // We send both images and a prompt to the model
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: baseImageData,
            mimeType: baseMimeType,
          },
        },
        {
          inlineData: {
            data: logoData,
            mimeType: logoMimeType,
          },
        },
        {
          text: `TASK: Create a professional product mockup.
          
          CRITICAL CONSTRAINTS:
          1. NO CROPPING: You MUST preserve the exact same framing, zoom level, and camera angle as the first image. The garment should be in the same position and scale.
          2. BACKGROUND: Keep the background from the first image identical.
          3. LOGO INTEGRATION: Take the logo from the second image and place it realistically on the garment.
          4. PLACEMENT: Follow the user's specific placement coordinates and finish description provided below. The logo should follow the fabric's lighting, shadows, and texture at that specific location.
          
          USER PLACEMENT & FINISH INSTRUCTIONS:
          ${prompt}`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4" // Most apparel photography is portrait
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate mockup image");
}
