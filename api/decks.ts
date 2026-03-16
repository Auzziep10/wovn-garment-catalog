import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, doc, getDoc, query, where
} from "firebase/firestore";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Print Shop OS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { customerId, deckId } = req.query;

    if (!customerId && !deckId) {
      return res.status(400).json({ error: "Missing customerId or deckId query parameter" });
    }

    let decksSnap: any[] = [];

    if (deckId) {
      // Fetch a specific deck
      const deckRef = doc(db, "decks", deckId as string);
      const deckDoc = await getDoc(deckRef);
      if (!deckDoc.exists()) {
        return res.status(404).json({ error: "Deck not found" });
      }
      decksSnap = [ { id: deckDoc.id, ...deckDoc.data() } ];
    } else {
      // Fetch all decks for a customer
      const q = query(collection(db, "decks"), where("customer_id", "==", customerId as string));
      const querySnapshot = await getDocs(q);
      decksSnap = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Now fetch garments (deck_items) for each deck
    const results = await Promise.all(decksSnap.map(async (deckData: any) => {
      // Fetch customer info
      if (deckData.customer_id && !deckData.customer_name) {
        const custRef = doc(db, "customers", deckData.customer_id);
        const custSnap = await getDoc(custRef);
        if (custSnap.exists()) {
          const cData = custSnap.data();
          deckData.customer_name = cData.company || cData.name || "Unknown Customer";
        }
      }

      const itemsQ = query(collection(db, "deck_items"), where("deck_id", "==", deckData.id));
      const itemsSnap = await getDocs(itemsQ);

      const items = await Promise.all(itemsSnap.docs.map(async (itemDoc) => {
        const itemData: any = { id: itemDoc.id, ...itemDoc.data() };
        let garmentData: any = null;
        
        if (itemData.garment_id) {
          const garmentRef = doc(db, "garments", itemData.garment_id);
          const garmentSnap = await getDoc(garmentRef);
          if (garmentSnap.exists()) {
            garmentData = garmentSnap.data();
          }
        }
        
        return {
          ...itemData,
          garment_name: itemData.custom_name || (garmentData ? garmentData.name : "Unknown"),
          garment_description: itemData.custom_description || (garmentData ? garmentData.description : ""),
          garment_price: itemData.custom_price || (garmentData ? garmentData.price : 0),
          original_image: garmentData ? garmentData.image : null,
          category: garmentData ? garmentData.category : null,
          gender: garmentData ? garmentData.gender : null,
          type: garmentData ? garmentData.type : null,
          supplier_link: garmentData ? garmentData.supplier_link : null,
          order_index: itemData.order_index || 0
        };
      }));

      items.sort((a, b) => a.order_index - b.order_index);
      return { ...deckData, items };
    }));

    return res.status(200).json(results);

  } catch (error: any) {
    console.error("Error fetching decks:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
