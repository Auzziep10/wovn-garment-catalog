import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function dedupe() {
    const garmentsRef = collection(db, "garments");
    const snapshot = await getDocs(garmentsRef);

    const seen = new Set();
    const duplicates = [];

    for (const item of snapshot.docs) {
        const data = item.data();
        if (seen.has(data.name)) {
            duplicates.push(item.id);
        } else {
            seen.add(data.name);
        }
    }

    console.log(`Found ${duplicates.length} duplicates. Deleting...`);
    for (const id of duplicates) {
        await deleteDoc(doc(db, "garments", id));
    }
    console.log("Dedupe complete!");
    process.exit(0);
}

dedupe().catch(console.error);
