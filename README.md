# 💰 Smart Expense — Personal Finance Tracker

A full-stack Progressive Web App that ingests raw transaction data, automatically categorizes expenses using ML, forecasts future spending, and presents everything through a polished mobile-first dashboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)
![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?logo=chart.js)

## ✨ Features

- **📱 PWA** — Install on your phone's home screen, use like a native app
- **🔐 Google Sign-In** — Secure multi-user authentication
- **📤 CSV Upload** — Drag-and-drop your bank statement CSVs
- **✍️ Manual Entry** — Quick-add expenses on the go
- **🤖 ML Categorization** — Automatically categorizes merchants using TF-IDF + Logistic Regression
- **📊 Interactive Dashboard** — Metric cards, donut charts, and spending trends via Chart.js
- **🔮 Spending Forecast** — Predicts next month's spending using Linear Regression
- **🌙 Dark Mode** — Premium glassmorphism UI designed for mobile

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Next.js 15 PWA  │────▶│  FastAPI Backend  │────▶│  PostgreSQL  │
│  (React + TS)    │◀────│  (Python 3.12)   │◀────│  Database    │
│                  │     │                  │     │              │
│  • Tailwind CSS  │     │  • Pandas        │     │  • Users     │
│  • Chart.js      │     │  • scikit-learn  │     │  • Txns      │
│  • Google OAuth  │     │  • JWT Auth      │     │              │
└──────────────────┘     └──────────────────┘     └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16+ (or Docker)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repo
git clone <your-repo-url>
cd smart-expense

# Set environment variables
cp .env.example .env
# Edit .env with your Google Client ID

# Start everything
docker compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL database
createdb smart_expense

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://your_user:your_pass@localhost:5432/smart_expense"
export GOOGLE_CLIENT_ID="your-google-client-id"
export JWT_SECRET="your-secret-key"

# Train the ML model
cd app/ml && python train_model.py && cd ../..

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit with your API URL and Google Client ID

# Start dev server
npm run dev
```

## 📱 Installing the App

1. Open Google Play Store, tap your profile icon -> Play Protect -> Settings (gear icon) and turn off "Scan apps with Play Protect".
2. Open `http://localhost:3000` on your phone's browser
3. Tap the browser menu (⋮ on Chrome, □↑ on Safari)
4. Select **"Add to Home Screen"** / **"Install App"**
5. The app icon will appear on your home screen
6. Open it — it runs full-screen like a native app!

## 📊 CSV Format

Your CSV should have at minimum these columns (column names are flexible):

| date | description / merchant | amount |
|------|----------------------|--------|
| 2025-01-15 | ZOMATO-ORDER-12345 | 450.00 |
| 15/01/2025 | UBER_RIDE_DELHI | 280.00 |
| Jan 15, 2025 | Netflix Subscription | 649.00 |

The cleaning pipeline handles:
- Multiple date formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
- Messy merchant names (strips IDs, normalizes casing)
- Currency symbols (₹, $, Rs.)
- Comma-separated numbers (1,500.00)

## 🤖 ML Categorization

The app uses a **TF-IDF + Logistic Regression** pipeline trained on ~200 labeled merchant names across 8 categories:

| Category | Examples |
|----------|----------|
| 🍕 Food & Dining | Zomato, Swiggy, McDonalds, Starbucks |
| 🎬 Entertainment | Netflix, Spotify, BookMyShow, PVR |
| 🛍️ Shopping | Amazon, Flipkart, Myntra, Nike |
| 🚗 Transport | Uber, Ola, IRCTC, Petrol |
| ⚡ Utilities | Jio, Airtel, Electricity, Gas |
| 🏠 Housing | Rent, Maintenance, Property Tax |
| 💪 Health & Fitness | Gym, Apollo Pharmacy, Practo |
| 📦 Miscellaneous | ATM, Bank Transfer, Cash |

You can always override the predicted category by tapping on it in the transactions list.

## 🔮 Forecasting

The forecasting engine uses two methods:
- **3-Month Moving Average** — always available, even with limited data
- **Linear Regression** — kicks in with 3+ months of data, provides confidence bands

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 3.4 |
| Charts | Chart.js 4 via react-chartjs-2 |
| Auth | Google OAuth 2.0, JWT |
| Backend | FastAPI, Python 3.12 |
| Data Processing | Pandas, NumPy |
| ML | scikit-learn (TF-IDF + Logistic Regression) |
| Database | PostgreSQL 16, SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Deployment | Docker, Render |

## 🚢 Deployment

### Render
1. Fork this repo
2. Create a new **Blueprint** on Render
3. Point it to your repo — it will auto-detect `render.yaml`
4. Set the `GOOGLE_CLIENT_ID` environment variable
5. Deploy!

### Docker
```bash
docker compose -f docker-compose.yml up --build -d
```

## 📄 License

MIT
