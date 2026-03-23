# PrepPal

An AI-powered study assistant that helps students prepare smarter. Upload your study materials, generate quizzes, chat with an AI tutor, and track your learning progress — all in one place.

---

## Features

- **AI Chat Tutor** — Ask questions about your study materials using Google Gemini
- **Quiz Generation** — Auto-generate quizzes from uploaded PDFs
- **Progress Tracking** — Track scores, streaks, and performance over time
- **Activity Heatmap** — Visualize your study consistency
- **Achievements** — Earn badges as you hit learning milestones
- **Secure Auth** — JWT-based authentication with Argon2 password hashing

---

## Tech Stack

### Backend
- Python + FastAPI
- MongoDB (via Motor async driver)
- Google Gemini API (via `google-genai`)
- LangChain + PyMuPDF for PDF processing
- Argon2 for password hashing
- JWT (python-jose) for authentication
- Uvicorn ASGI server

### Frontend
- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts

---

## Project Structure

```
preppal/
├── backend/
│   ├── app/
│   │   ├── middleware/       # Auth middleware
│   │   ├── models/           # Pydantic models
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic (auth, AI, PDF, quiz)
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── uploads/              # Uploaded study materials
│   ├── requirements.txt
│   └── run_server.py
└── frontend/
    ├── src/
    │   ├── api/              # Axios config
    │   ├── components/       # Reusable UI components
    │   ├── context/          # Auth context
    │   ├── pages/            # Route pages
    │   └── utils/
    ├── index.html
    └── package.json
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account
- Google Gemini API key

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://your_connection_string
DB_NAME=preppal
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

Start the backend:

```bash
python run_server.py
```

API will be available at `http://127.0.0.1:8000`
Swagger docs at `http://127.0.0.1:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

App will be available at `http://localhost:5174`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/materials` | List uploaded materials |
| POST | `/api/materials` | Upload a PDF |
| POST | `/api/quiz/generate` | Generate quiz from material |
| POST | `/api/quiz/submit` | Submit quiz answers |
| GET | `/api/progress/summary` | Get progress summary |
| GET | `/api/progress/heatmap` | Get activity heatmap |
| POST | `/api/chat` | Chat with AI tutor |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | MongoDB database name |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT algorithm (HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry in minutes |
| `GEMINI_API_KEY` | Google Gemini API key |
| `UPLOAD_DIR` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | Max upload size in MB |

---
