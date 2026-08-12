# 🍔 Food Delivery API

A scalable, secure backend API architecture for a modern food delivery system built with Node.js, Express, and MongoDB. This project implements production-grade backend standards including role-based access control, real-time tracking, payment integrations, and API security hardening.

---

## 🚀 Features

* **Authentication & Security:** JWT-based user authentication, password hashing (`bcryptjs`), and API security hardening.
* **Role-Based Access Control (RBAC):** Distinct permissions and workflows for **Users**, **Riders**, and **Admins**.
* **Core Logistics:** Full-cycle restaurant onboarding, menu curation, interactive cart management, and order processing.
* **Payment Integration:** Secure checkout flow via Flutterwave API integration.
* **Media Management:** Multipart file uploads for restaurant and profile imagery managed via Cloudinary / AWS S3.
* **Real-Time Layer:** Live driver tracking and order status updates using Socket.io.
* **Location Services:** Geo-spatial queries for calculating optimal delivery distances between restaurants and users.
* **Automated Notifications:** Email confirmations dispatched via SendGrid / Nodemailer.

---

## 🛠️ Tech Stack

* **Backend Environment:** Node.js, Express.js
* **Database Layer:** MongoDB, Mongoose ODM
* **Authentication:** JSON Web Tokens (JWT), bcryptjs
* **Cloud Storage:** Cloudinary / AWS S3
* **Payment Gateway:** Flutterwave, Monnify and Paystack
* **Real-time Event Handling:** Socket.io
* **Security Middleware:** Helmet, HPP, XSS-Clean, Express-Rate-Limit
* **Utilities:** Multer, Axios, SendGrid, Nodemailer, dotenv

---

## 📁 Project Structure

```text
├── config/          # Database connection, third-party SDK configs
├── controllers/     # Express route handlers (business logic)
├── middlewares/     # Auth, error handling, rate limiting, validation
├── models/          # Mongoose database schemas
├── routes/          # REST API endpoints mapping
├── services/        # Reusable third-party services (Payments, Emails)
└── utils/           # Helper scripts and application constants
```

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd food-delivery-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and append the following variables:
   ```env
   PORT=5000
   NODE_ENV=development

   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key

   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   FLUTTERWAVE_SECRET_KEY=your_flutterwave_key

   SENDGRID_API_KEY=your_sendgrid_key
   ```

---

## ▶️ Running the Project

### Development Mode (with hot-reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm run start:prod
```

---

## 📌 API Endpoint Reference

### 🔐 Authentication & Profile
* `POST /api/v1/auth/register` - Create a new user account
* `POST /api/v1/auth/login` - Authenticate user & generate access tokens
* `GET /api/v1/users/profile` - Retrieve active user profile data
* `PUT /api/v1/users/profile` - Update profile personal details

### 🏪 Restaurant & Menu Operations
* `POST /api/v1/restaurants` - Register a new merchant restaurant (Admin)
* `GET /api/v1/restaurants` - Fetch available restaurants within proximity
* `POST /api/v1/restaurants/:id/menu` - Append new food items to the menu

### 🛍️ Order Management
* `POST /api/v1/orders` - Initialize checkout and process a new order
* `GET /api/v1/orders/:id` - Fetch singular order tracking details
* `PATCH /api/v1/orders/:id/status` - Modify state of delivery (Pending/Dispatched/Delivered)

### 💳 Financial Integrations
* `POST /api/v1/payments/initialize` - Trigger the Flutterwave checkout sequence
* `POST /api/v1/payments/verify` - Webhook / Callback route to validate transaction hashes

---

## 📡 Sample Response

`POST /api/v1/orders`
```json
{
  "status": "success",
  "message": "Order created successfully",
  "data": {
    "orderId": "64f8c2abc123",
    "status": "pending",
    "totalAmount": 4500,
    "currency": "NGN"
  }
}
```

---

## 🛡️ Production Security Implementations
To safeguard against typical web vulnerabilities, this backend utilizes specific layers:
* **Express Rate Limiter:** Throttles excessive brute force API calls.
* **Helmet:** Configures safe, defensive HTTP headers.
* **XSS Sanitization & Mongo Injection Prevention:** Cleanses inputs before executing database operations.

---

## 🧠 Key Engineering Outcomes

* Implemented strict architectural separation using the **Controller-Service-Repository pattern**.
* Engineered real-time event listening pipelines via web sockets to track dispatch riders dynamically.
* Hardened REST API payloads against cross-site scripting (XSS) and injection vectors.
* Managed automated third-party webhooks to seamlessly handle asynchronous online payments.

---

## 📈 Roadmap & Enhancements

* [ ] Add a persistent **Redis** caching layer to accelerate menu read loops.
* [ ] Implement end-to-end testing coverage using **Jest** and Supertest.
* [ ] Structure an automated deployment pipeline utilizing GitHub Actions.
* [ ] Set up professional stream logging using **Winston** and Morgan.

---

## 👨‍💻 Author

**Emmanuel Mbah (MEC)**  
Backend Developer | Full Stack Engineer  
* **GitHub:** [@shadowstiles](https://github.com)  
* **Portfolio:** [diebere.netlify.app](https://netlify.app)  

---

## 📜 License

This application is open-source software distributed under the MIT License.
