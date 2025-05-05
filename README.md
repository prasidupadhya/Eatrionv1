# EATRION – Food Scanning and Tracking App

**Eatrion** is a lightweight web application that helps users track their daily food intake using **machine learning-based image recognition** instead of manual food entry. Just snap or upload a photo of your food, and Eatrion identifies it and fetches accurate nutrition data from the **USDA FoodData Central API**.

> Built with TensorFlow.js, Supabase, Vite, and the USDA API.

---

## 🌟 Features

- **Image-based food recognition** (50 food classes)
- **Daily diary with nutrition breakdown** (calories, protein, carbs, fat)
- **User authentication** via Supabase
- **Profile configuration** (set calorie/macro goals)
- **Powered by TensorFlow.js and USDA API**

---

## Demo

[Live Deployment on Vercel](https://eatrion.vercel.app/)

---

## Tech Stack

| Layer        | Tools/Frameworks                          |
|--------------|--------------------------------------------|
| **Frontend** | Vite, HTML5, CSS3, JavaScript (ES6+), Chart.js |
| **ML**       | TensorFlow.js, MobileNetV2 (custom-trained) |
| **Backend**  | Supabase (PostgreSQL, Auth), USDA API       |
| **Dev Tools**| Node.js, npm, Git, Vercel, Supabase CLI     |

---

## Setup Instructions

**1. Install dependencies**

npm install

**2. Configure environment variables**

Create a .env file in the root:

VITE_SUPABASE_URL=https://your-supabase-project.supabase.co

VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_USDA_API_KEY=your-usda-api-key

**3. Run in development**

npm run dev

Visit: http://localhost:5173

**4. Build for production**

npm run build

Output will be in the dist/ folder.

## License

This project is for academic and research purposes only.
Model and dataset are not licensed for commercial use.