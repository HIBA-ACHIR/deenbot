# 🕌 DeenBot - Islamic AI Assistant

DeenBot is an intelligent Islamic assistant that provides accurate answers to religious questions, processes Islamic content from various media sources, and offers contextual responses based on transcribed Islamic lectures and content.

## ✨ Features

### 🎯 Core Functionality
- **Islamic Q&A**: Get accurate answers to Islamic questions in Arabic, French, and English
- **Media Processing**: Upload audio files or YouTube videos for transcription and analysis
- **Contextual Responses**: Ask questions about specific transcribed content
- **Multi-language Support**: Supports Arabic, French, and English
- **Smart Categorization**: Automatically categorizes conversations (General Islamic discussions vs. Hassanian dialogues)

### 🔧 Technical Features
- **RAG (Retrieval-Augmented Generation)**: Context-aware responses using vector embeddings
- **Audio Transcription**: Automatic speech-to-text for uploaded media
- **YouTube Integration**: Direct processing of YouTube Islamic content
- **Vector Database**: Efficient storage and retrieval of transcribed content
- **Real-time Chat**: Interactive conversation interface

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.12+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/ML**: 
  - GROQ API for LLM responses
  - HuggingFace Transformers for embeddings
  - ChromaDB for vector storage
- **Media Processing**: FFmpeg for audio/video processing
- **Authentication**: JWT-based user authentication

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui
- **State Management**: React Context API
- **HTTP Client**: Fetch API

## 🚀 Quick Start

### Prerequisites
- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **FFmpeg** (for media processing)

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/HIBA-ACHIR/deenbot.git
cd deenbot/DeenBotService
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r app/requirements.txt
```

4. **Environment Configuration**
```bash
cp app/.env.example app/.env
# Edit app/.env with your configuration
```

5. **Database Setup**
```bash
# Create PostgreSQL database
createdb deenbotdb

# Run migrations (if any)
# python -m alembic upgrade head
```

6. **Start the backend**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../frontend_deenbot
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start development server**
```bash
npm run dev
# or
yarn dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8006
- API Documentation: http://localhost:8006/docs

## ⚙️ Configuration

### Environment Variables

Create `DeenBotService/app/.env` file with the following variables:

```env
# API Keys
GROQ_API_KEY=your_groq_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Database
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/deenbotdb

# JWT
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256

# Application
DEBUG=True
LOG_LEVEL=INFO
MAX_FILE_SIZE=2147483648
UPLOAD_DIR=uploads
```

### Required API Keys

1. **GROQ API Key**: Get from [GROQ Console](https://console.groq.com/)
2. **YouTube API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/)

## 📁 Project Structure

```
deenbot/
├── DeenBotService/          # Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── dependencies/   # Business logic & services
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── main.py         # FastAPI application
│   ├── uploads/            # File uploads
│   ├── chroma_index/       # Vector database
│   └── requirements.txt    # Python dependencies
├── frontend_deenbot/        # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   └── package.json        # Node.js dependencies
└── README.md               # This file
```

## 🔒 Security

- Environment variables are used for all sensitive configuration
- JWT tokens for authentication
- Input validation and sanitization
- CORS configuration for frontend-backend communication
- File upload restrictions and validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Hibatallah Achir** - [@HIBA-ACHIR](https://github.com/HIBA-ACHIR)

## 🙏 Acknowledgments

- Islamic scholars and content creators whose work makes this project valuable
- Open source community for the amazing tools and libraries
- GROQ for providing powerful LLM capabilities
