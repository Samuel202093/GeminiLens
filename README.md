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
