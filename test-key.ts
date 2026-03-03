import dotenv from "dotenv";
dotenv.config();
const key = process.env.VITE_GEMINI_API_KEY || "";
console.log("Key:", key);
console.log("Length:", key.length);
for (let i = 0; i < key.length; i++) {
    console.log(`[${i}] ${key[i]} (${key.charCodeAt(i)})`);
}
