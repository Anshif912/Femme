# FEMME
> **Tagline:** *"She Travels. We Guard."*

FEMME is a production-grade, AI-powered women's safety platform designed to serve as an invisible guardian during commutes and daily travels. It passively monitors journeys, processes sensor streams on-device for privacy, triggers check prompts on path deviations or sudden stops, alerts emergency contacts, and creates tamper-proof evidence capsules.

---

## 🚀 Quick Start (Local Run)

You can run the entire system locally using Docker Compose or manually from the source.

### Option A: Running with Docker Compose (Recommended)
From the project root directory, run:
```bash
docker-compose up --build
```
- **Frontend App:** Access at [http://localhost](http://localhost)
- **FastAPI API Documentation:** Access Swagger at [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: Running Manually

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app/main.py
```
*App runs at `http://localhost:8000`*

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*App runs at `http://localhost:5173`*

---

## 🛠️ Tech Stack

- **Frontend:** React (TypeScript), Vite, TailwindCSS v3, Zustand (state persistence), React Leaflet (OpenStreetMap / OSRM routing), Framer Motion, Canvas Confetti.
- **Backend:** FastAPI (Python), JWT Security, Pydantic, ReportLab (PDF compilation), SQLite (out-of-the-box fallback) & Firebase Admin SDK.
- **Database:** SQLite (default fallback) / Firebase Firestore & Realtime Database.

---

## 🛡️ Core Safety Features

1. **Automatic Interception Simulator:** Simulates the Android Notification Listener. Paste Uber, Ola, or Rapido confirmation texts to automatically launch background tracking.
2. **Passive AI Shield Telemetry:** Tracks speed vectors, accelerometer vibrations, and sound frequencies locally on-device.
3. **OSRM Route Deviation:** Measures GPS distance to OSRM path geometries; warns when wrong turns exceed 150 meters.
4. **Smart check prompt & 60s escalation:** Smart checks travelers when deviations/stops occur. Automatically trigger SOS if no response in 60 seconds.
5. **Tamper-Proof evidence capsule:** Records snapshots every 30s; hashes coordinate logs using SHA-256 for chain-of-custody.
6. **FIR Assist Generator:** Compiles immutable coordinate tracking logs and hashes into ReportLab PDF templates.
