import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc, doc, getDoc,
  updateDoc, deleteDoc, query, where, writeBatch
} from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

async function seedDatabaseIfEmpty() {
  if (firebaseConfig.projectId === "YOUR_PROJECT_ID") {
    console.warn("⚠️ Firebase configuration missing! Skipping DB seed check. Add credentials in .env");
    return;
  }

  try {
    const garmentsRef = collection(db, "garments");
    const garmentsSnapshot = await getDocs(garmentsRef);
    if (garmentsSnapshot.empty) {
      console.log("Database is empty, seeding initial data...");

      const sampleGarments = [
        { name: "Executive Slim Fit Blazer", description: "A premium wool-blend blazer for the modern executive. Features a slim silhouette and refined detailing.", price: 295.00, category: "Executive", gender: "Male", type: "Tops", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80" },
        { name: "Athleisure Tech Hoodie", description: "High-performance moisture-wicking fabric with a sleek athletic fit. Perfect for both training and casual wear.", price: 89.00, category: "Athleisure", gender: "Male", type: "Tops", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80" },
        { name: "Auto-Industry Work Jacket", description: "Durable, heavy-duty canvas jacket designed for the rigors of the automotive workshop. Reinforced stitching.", price: 145.00, category: "Auto-Industry", gender: "Male", type: "Tops", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80" },
        { name: "Premium Cotton Polo", description: "Classic fit polo shirt made from 100% organic pima cotton. Breathable and soft for all-day comfort.", price: 65.00, category: "Executive", gender: "Male", type: "Tops", image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80" },
        { name: "Performance Joggers", description: "Tapered joggers with four-way stretch and hidden zip pockets. Designed for movement and style.", price: 78.00, category: "Athleisure", gender: "Male", type: "Bottom", image: "https://images.unsplash.com/photo-1580087444694-f9066374bb79?auto=format&fit=crop&w=800&q=80" },
        { name: "Structured Chinos", description: "Versatile chinos with a clean, professional finish. Perfect for business casual environments.", price: 110.00, category: "Executive", gender: "Male", type: "Bottom", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80" },
        { name: "Commuter Backpack", description: "Weather-resistant roll-top backpack with a dedicated laptop sleeve and minimalist aesthetic.", price: 125.00, category: "Executive", gender: "Accessories", type: "Headwear", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80" }
      ];

      const garmentIds = [];
      for (const g of sampleGarments) {
        (g as any).created_at = new Date().toISOString();
        if (!(g as any).images) {
          (g as any).images = [g.image];
        }
        const docRef = await addDoc(garmentsRef, g);
        garmentIds.push({ id: docRef.id, image: g.image });
      }

      // Seed a sample customer
      const customersRef = collection(db, "customers");
      const customerDocRef = await addDoc(customersRef, { name: "John Doe", company: "Sample Corp", created_at: new Date().toISOString() });
      const customerId = customerDocRef.id;

      // Seed a sample deck
      const decksRef = collection(db, "decks");
      const deckDocRef = await addDoc(decksRef, { customer_id: customerId, name: "Spring 2026 Collection", created_at: new Date().toISOString() });
      const deckId = deckDocRef.id;

      // Seed all garments into the sample deck
      const deckItemsRef = collection(db, "deck_items");
      for (const g of garmentIds) {
        await addDoc(deckItemsRef, {
          deck_id: deckId,
          garment_id: g.id,
          mock_image: g.image,
          created_at: new Date().toISOString()
        });
      }
      console.log("Database seeded successfully.");
    }
  } catch (error: any) {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn("⚠️ Firebase API Key missing. Skipping seeding sample records.");
    } else {
      console.warn("Could not query Firebase for seeding:", error.message);
    }
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "50mb" }));

// Seeding prevents Vercel from duplicating items on concurrent launches, commented out.
// seedDatabaseIfEmpty().catch(console.warn);

// API Routes
app.post("/api/upload", async (req, res) => {
  try {
    const { image, folder = "uploads" } = req.body;
    if (!image || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Invalid base64 string" });

    const ext = match[1].split('/')[1] || 'png';
    const fileName = `${folder}/img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, image, 'data_url');
    const url = await getDownloadURL(storageRef);

    res.json({ url });
  } catch (error: any) {
    console.error("Backend upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/garments", async (req, res) => {
  try {
    const { category, gender, type } = req.query;
    let garmentsRef = collection(db, "garments");
    let conditions = [];

    if (category) conditions.push(where("category", "==", category));
    if (gender) conditions.push(where("gender", "==", gender));
    if (type) conditions.push(where("type", "==", type));

    const q = conditions.length > 0 ? query(garmentsRef, ...conditions) : garmentsRef;
    const snapshot = await getDocs(q);

    const garments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(garments);
  } catch (error) {
    console.error("Error fetching garments from Firebase:", error);
    res.json([]);
  }
});

app.post("/api/garments", async (req, res) => {
  try {
    const data = req.body;
    data.created_at = new Date().toISOString();
    if (!data.images && data.image) {
      data.images = [data.image];
    } else if (!data.images) {
      data.images = [];
    }
    const docRef = await addDoc(collection(db, "garments"), data);
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to add garment" });
  }
});

app.put("/api/garments/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    const docRef = doc(db, "garments", req.params.id);
    await updateDoc(docRef, updates);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update garment" });
  }
});
app.get("/api/garments/:id/decks", async (req, res) => {
  try {
    const q = query(collection(db, "deck_items"), where("garment_id", "==", req.params.id));
    const snapshot = await getDocs(q);
    const deckIds = snapshot.docs.map(doc => doc.data().deck_id);
    // Deduplicate in case a garment is in a deck multiple times
    res.json([...new Set(deckIds)]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch garment decks" });
  }
});

app.delete("/api/garments/:id", async (req, res) => {
  try {
    const docRef = doc(db, "garments", req.params.id);
    await deleteDoc(docRef);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete garment" });
  }
});

app.get("/api/customers", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "customers"));
    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const { name, company } = req.body;
    const data = { name, company, created_at: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "customers"), data);
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    const docRef = doc(db, "customers", req.params.id);
    await updateDoc(docRef, updates);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update customer" });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  try {
    const docRef = doc(db, "customers", req.params.id);
    await deleteDoc(docRef);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

app.get("/api/customers/:id/assets", async (req, res) => {
  try {
    const q = query(collection(db, "customer_assets"), where("customer_id", "==", req.params.id));
    const snapshot = await getDocs(q);
    const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

app.post("/api/customers/:id/assets", async (req, res) => {
  try {
    const { image } = req.body;
    const data = { customer_id: req.params.id, image, created_at: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "customer_assets"), data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: "Failed to add asset" });
  }
});

app.delete("/api/customers/:id/assets/:assetId", async (req, res) => {
  try {
    const docRef = doc(db, "customer_assets", req.params.assetId);
    await deleteDoc(docRef);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

app.get("/api/customers/:id/decks", async (req, res) => {
  try {
    const q = query(collection(db, "decks"), where("customer_id", "==", req.params.id));
    const snapshot = await getDocs(q);
    const decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(decks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch decks" });
  }
});

app.post("/api/decks", async (req, res) => {
  try {
    const { customer_id, name } = req.body;
    const data = { customer_id, name, created_at: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "decks"), data);
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create deck" });
  }
});

app.put("/api/decks/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const deckRef = doc(db, "decks", req.params.id);
    await updateDoc(deckRef, { name });
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update deck" });
  }
});

app.get("/api/decks/:id", async (req, res) => {
  try {
    const deckRef = doc(db, "decks", req.params.id);
    const deckSnap = await getDoc(deckRef);
    if (!deckSnap.exists()) {
      return res.status(404).json({ error: "Deck not found" });
    }

    const deckData: any = { id: deckSnap.id, ...deckSnap.data() };

    if (deckData.customer_id) {
      const custRef = doc(db, "customers", deckData.customer_id);
      const custSnap = await getDoc(custRef);
      if (custSnap.exists()) {
        const cData = custSnap.data();
        deckData.customer_name = cData.company || cData.name || "Unknown Customer";
      }
    }

    const itemsQ = query(collection(db, "deck_items"), where("deck_id", "==", req.params.id));
    const itemsSnap = await getDocs(itemsQ);

    const items = await Promise.all(itemsSnap.docs.map(async (itemDoc) => {
      const itemData: any = { id: itemDoc.id, ...itemDoc.data() };

      // Fetch corresponding garment for each item to match the previous SQL JOIN
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

    res.json({ ...deckData, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch deck details" });
  }
});

app.post("/api/decks/:id/items", async (req, res) => {
  try {
    const { garment_id, mock_image, order_index } = req.body;
    const itemData = {
      deck_id: req.params.id,
      garment_id,
      mock_image,
      order_index: order_index || 0,
      created_at: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, "deck_items"), itemData);
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to add deck item" });
  }
});

app.put("/api/decks/:id/reorder", async (req, res) => {
  try {
    const { items: reorderedItems } = req.body;
    const batch = writeBatch(db);
    for (const item of reorderedItems) {
      if (item.id) {
        const docRef = doc(db, "deck_items", item.id);
        batch.update(docRef, { order_index: item.order_index });
      }
    }
    await batch.commit();
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder items" });
  }
});

app.put("/api/deck-items/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    const docRef = doc(db, "deck_items", req.params.id);
    await updateDoc(docRef, updates);
    res.json({ status: "ok" });
  } catch (error: any) {
    console.error("Error updating deck item:", error);
    res.status(500).json({ error: "Failed to update deck item", details: error.message });
  }
});

app.delete("/api/deck-items/:id", async (req, res) => {
  try {
    const docRef = doc(db, "deck_items", req.params.id);
    await deleteDoc(docRef);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete deck item" });
  }
});

// App binding
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  // Development mode: start Vite server and then express
  import("vite").then(async (viteCore) => {
    const vite = await viteCore.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(console.error);
} else {
  // Production / Vercel mode
  if (!process.env.VERCEL) {
    // Standalone node production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
