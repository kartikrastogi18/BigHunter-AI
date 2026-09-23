# 🐛 BugHunter AI

> An AI-powered autonomous debugging platform that investigates GitHub repositories, identifies potential bug causes, generates reproduction tests, and eventually proposes verified fixes.

## 🚧 Project Status

Currently under active development.

### Current Progress

- [x] Project architecture
- [x] Node.js / Express backend
- [x] GitHub repository cloning
- [ ] Repository intelligence
- [ ] PostgreSQL integration
- [ ] Code indexing
- [ ] Code RAG
- [ ] Bug investigation agent
- [ ] Automated test generation
- [ ] Docker sandbox
- [ ] AI-generated patches
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