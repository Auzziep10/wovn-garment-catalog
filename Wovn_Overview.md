# Wovn Garment Catalog App Functionality Overview

### 👕 Garment Catalog & Filtering
* **Browsing:** View a curated collection of high-performance garments.
* **Filtering system:** Filter garments via a side menu by:
  * **Category:** Athleisure, Executive, Auto-Industry
  * **Gender:** Male, Female, Accessories
  * **Type:** Tops, Bottoms, Headwear, Bags, Tumblers, Other
* **Item actions:** Click on items to enlarge and view specific details, or quickly delete them.

### 🛠️ Admin / Garment Management
* **Add new items:** Enter specific details like name, description, price, category, gender, and type to add a new garment to the catalog.
* **Image Uploading:** Upload photos of your garment which are automatically optimally compressed inline before saving them to the database.

### 👥 Client & Customer Relations
* **Client Management:** Admins can create new client profiles with contact and company names.
* **Selection:** Select between clients to view, manage, and create pitch decks specifically associated with them.

### 📋 Presentation Decks
* **Deck Builder:** Create customized presentation decks linked to specific clients.
* **Add Garments:** Send garments directly from the catalog into these decks. 
* **Deck Editing:** Inside a deck, you can further edit individual item details (customizing the name, description, sizes available, and price for a client proposal without affecting the main catalog item), as well as remove items.
* **Presentation Views:** The user can view the deck in a grid or standard list "presentation view" when sharing it with the client.

### 🎨 Interactive Mockup Studio (AI-Powered)
* **Workspace:** Send any garment to the "Mockup Studio" tool.
* **Logo Upload & Manipulation:** Admins can upload a customer's logo and interactively position, scale, and rotate it precisely over the garment image.
* **AI Generation:** Supply a prompt (e.g., "High-quality silver embroidery"), and the application uses Google Gemini to "bake" the logo onto the garment, generating a highly realistic, dynamically lit, and properly textured promotional image.
* **Quick Save:** Has an alternative quick-save canvas implementation that merges the logo and garment instantly without the AI.
* **Integration:** Completed mockups are automatically synced directly into the associated custom client deck. 

### ⚙️ Under The Hood (Tech Stack)
* **Frontend:** React (Vite) utilizing `framer-motion` for fluid micro-animations, with icons supplied by `lucide-react`. 
* **Backend:** A Node.js Express server connected directly to a cloud **Firebase Firestore** database which persists garments, clients, and decks across sessions.
