# 🐛 BugHunter AI

> An AI-powered autonomous debugging platform that investigates GitHub repositories, identifies potential bug causes, generates reproduction tests, and eventually proposes verified fixes.

## 🚧 Project Status

Currently under active development.

### Current Progress

- [x] Project architecture
- [x] Node.js / Express backend
- [x] GitHub repository cloning
- [x] Repository intelligence
- [x] PostgreSQL integration
- [x] Code indexing
- [x] Code RAG
- [x] Bug investigation agent
- [x] React Client dashboard
- [x] Automated test generation
- [ ] Docker sandbox
- [x] AI-generated patches
- [ ] Patch verification
- [ ] GitHub Pull Request automation

---

## 🏗️ Architecture

```text
                    React Client
                         |
                         v
                  Node.js Backend
                         |
              +----------+----------+
              |                     |
              v                     v
         PostgreSQL          Python AI Service
                                   |
                         +---------+---------+
                         |         |         |
                         v         v         v
                        RAG      Agents    Analysis
                                   |
                                   v
                             Docker Sandbox
```

---

## 🚀 Quick Start

### 1. Python AI Service (Port 8000)
```powershell
cd ai-service
# Make sure .env has GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 2. Node.js Backend API (Port 5000)
```powershell
cd server
npm run dev
```

### 3. React Client Dashboard (Port 5173)
```powershell
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.