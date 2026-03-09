import fetch from "node-fetch"; // or use global fetch in Node 18+
import dotenv from "dotenv";
dotenv.config();

async function test() {
    const bucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || "wovn-catalog.firebasestorage.app";
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = "mockups/rest-test.png";

    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(fileName)}`;

    try {
        const fireRestRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Content-Type": "image/png",
                "Content-Length": buffer.length.toString()
            },
            body: buffer
        });

        if (!fireRestRes.ok) {
            const err = await fireRestRes.text();
            throw new Error(`Failed: ${err}`);
        }
        const data = await fireRestRes.json();
        const token = data.downloadTokens;

        const finalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
        console.log("Success:", finalUrl);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
