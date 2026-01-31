# 🚀 GeminiLens: AI-Powered Document Intelligence

[![Next.js](https://img.shields.io/badge/Framework-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_3-blue?style=flat-square)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

## 📖 Overview
GeminiLens is a high-performance "Media-to-Data" ecosystem built for the **Gemini Virtual Hackathon**. It bridges the gap between physical documentation and digital databases by using **Gemini 3's Multimodal Reasoning** to extract, interpret, and structure data from photos and videos.

Whether it's medical reports, school records, or handwritten forms, GeminiLens transforms messy real-world media into clean, editable JSON/CSV data in seconds.

## ✨ Key Features
<!-- - **📸 In-Browser Smart Camera:** Capture documents directly with environment-facing camera support and live framing. -->
- **✂️ Intelligent Auto-Crop:** Pre-processes images to remove borders, optimizing Gemini's visual focus for higher extraction accuracy.
- **🧠 Multimodal AI Analysis:** Leverages Gemini 3 to understand context, tables, and handwriting beyond simple OCR.
- **📊 Dynamic Data Table:** An editable UI component that allows users to verify and correct AI-extracted data.
- **📥 Professional Export:** Seamlessly export validated data to **CSV** or **XLSX** formats.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Lucide React.
- **AI/ML:** Google Gemini 3 API (via `@google/generative-ai`).
- **State Management:** React Hooks.
- **Data Processing:** Canvas API (for Auto-crop), SheetJS (for Excel exports).

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Samuel202093/GeminiLens.git](https://github.com/Samuel202093/GeminiLens.git)
   cd GeminiLens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root with the following values.
   You can obtain the Gemini key from Google AI Studio and Cloudinary credentials from your Cloudinary dashboard.
   ```bash
   GOOGLE_API_KEY=your_google_api_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   # Optional override (defaults to gemini-1.5-flash)
   GEMINI_MODEL=gemini-1.5-flash
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

### Usage
- Upload an image or video via the file picker.
- Use Auto Crop on images to trim borders before analysis.
- Click "Analyze" to send the media to the backend; results render as JSON plus a structured, editable table.
- Export as CSV or XLSX via the buttons in the table card. XLSX uses SheetJS (`xlsx`) with a dynamic import and CDN fallback.
- "Sync to Portal" calls a mock endpoint (`/api/portal/sync`) that acknowledges success for demo purposes.

### Notes
- Camera capture inside the app has been removed for reliability; on mobile, the native file picker with `capture="environment"` opens the system camera.
- Video analysis samples multiple frames client-side and merges extracted rows for better coverage.

### Troubleshooting
- "Missing GOOGLE_API_KEY" or Cloudinary errors: ensure `.env` contains all required keys and restart the dev server after changes.
- XLSX export failing: the app falls back to a CDN script if local import fails; check network connectivity if issues persist.
- If analysis takes long for videos, reduce frame count or use shorter clips.

### Scripts
- `npm run dev` – start Next.js in development.
- `npm run build` – build the production bundle.
- `npm start` – run the production server after build.
