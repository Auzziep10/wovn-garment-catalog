import dotenv from "dotenv";
dotenv.config();

(async () => {
    const { generateMockup } = await import("./src/services/geminiService");
    try {
        const baseImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
        const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
        const prompt = "A test prompt";
        const res = await generateMockup(baseImage, logoBase64, prompt);
        console.log("SUCCESS:", res.substring(0, 50));
    } catch (err: any) {
        console.error("ERROR:", err.message);
    }
})();
