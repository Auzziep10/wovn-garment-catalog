import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function test() {
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const storageRef = ref(storage, "mockups/test-buffer-upload.png");
    try {
        await uploadBytes(storageRef, buffer, { contentType: 'image/png' });
        console.log("Success:", await getDownloadURL(storageRef));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
