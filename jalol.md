# Technical Overview - MOON SENCE E-commerce

This document provides a comprehensive breakdown of the technologies used in the MOON SENCE platform and explains how they work together to deliver a seamless shopping experience.

## 🛠️ Technology Stack

| Layer | Technology | Usage |
| :--- | :--- | :--- |
| **Frontend** | HTML5 & CSS3 | Semantics, layout, and premium "glassmorphism" aesthetics. |
| **Logic** | Vanilla JavaScript | DOM manipulation, cart management, and API fetching. |
| **Backend** | Node.js & Express | Handling API requests, payment routing, and serverless logic. |
| **Database** | MongoDB (Atlas) | Persistent storage for products (including Base64 images) and orders. |
| **Payment** | PayPal SDK | Secure transaction processing and order capture. |
| **Auth** | JWT (JsonWebToken) | Secure session management for the Admin Studio. |
| **Deployment** | Vercel | Cloud hosting with Zero Config serverless execution. |

---

## 🔄 Step-by-Step Workflow

### 1. The Frontend Request (Client Side)
When a user visits the [Collection page](https://ecommerce-project-two-virid.vercel.app/products.html):
- **[app.js](file:///Users/abubakr/Desktop/jalol/ecommerce-project/public/app.js)** triggers a [fetch('/api/products')](file:///Users/abubakr/Desktop/jalol/ecommerce-project/public/app.js#144-158) call to the backend.
- The browser renders "Skeletons" (loading states) to maintain a premium feel.

### 2. The API & Database (Server Side)
- **Express Server**: The backend receives the request in [server.js](file:///Users/abubakr/Desktop/jalol/ecommerce-project/server.js).
- **Mongoose**: The server uses Mongoose to query the **MongoDB Atlas** cluster.
- **Data Retrieval**: MongoDB returns the product documents. Crucially, images are served as **Base64 strings** embedded directly in the JSON, ensuring they persist without external file hosting.

### 3. Catalog Rendering
- Once the data arrives, [app.js](file:///Users/abubakr/Desktop/jalol/ecommerce-project/public/app.js) clears the skeletons and builds the product grid using `document.createElement`.
- Images are rendered instantly from the Base64 data strings.

### 4. Checkout & Payment (The Integration)
When a user clicks "Pay with PayPal":
- **Order Creation**: The frontend sends the Cart data (Product IDs and Quantities) to `/api/pay/create-order`. 
- **Security Check**: The server looks up current prices in the database (never trusting the frontend price) to calculate the total.
- **PayPal Handshake**: The server calls the **PayPal API**, creates a transaction, and returns an `orderID` to the browser.
- **Capture**: After the user approves the payment in the PayPal popup, the frontend calls `/api/pay/capture-order` to finalize the transaction in the database.

### 5. Deployment Architecture
- **Vercel Serverless**: The application is deployed using Vercel's modern architecture. The [server.js](file:///Users/abubakr/Desktop/jalol/ecommerce-project/server.js) file exports the `app` object, which Vercel transforms into a single serverless function.
- **Environment Variables**: Sensitive data like `MONGO_URI` and `PAYPAL_SECRET` are stored securely in Vercel's dashboard, never exposed to the frontend.

---

## 📁 Project Structure

- `/public`: Contains all static assets (HTML, CSS, Frontend JS).
- `server.js`: The central "brain" of the backend.
- `/models`: Mongoose schemas defining how Products and Orders are structured.
- `vercel.json`: Configuration for routing and cloud deployment rules.
