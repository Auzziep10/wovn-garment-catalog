import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function test() {
    const base64Str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const storageRef = ref(storage, "test-upload.png");
    try {
        await uploadString(storageRef, base64Str, 'data_url');
        console.log("Success:", await getDownloadURL(storageRef));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
