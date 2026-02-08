# Pokémon Academy - Personality Questionnaire App

## Problem Statement
Applicazione web questionario sulla personalità a tema Accademia Pokémon con:
- Homepage con sfondo tema accademia pokemon
- Sistema di registrazione/login utenti
- Area privata con news/notifiche
- Questionario 10 domande con 6 profili risultato
- Invio email risultati a mat.zanotti00@gmail.com

## Architecture

### Backend (FastAPI + MongoDB)
- **Auth System**: JWT-based authentication with bcrypt password hashing
- **Models**: User, News, QuizResponse
- **Endpoints**:
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me
  - GET /api/news
  - POST /api/quiz/submit
  - GET /api/quiz/history

### Frontend (React + Tailwind)
- **Pages**: HomePage, AuthPage, DashboardPage, QuestionnairePage
- **Design**: Light Academia theme with Pokemon elements
- **Features**: Parchment-style questionnaire, Pokeball/Masterball decorations

### Database Collections
- `users`: User accounts
- `news`: News/notifications
- `quiz_responses`: Quiz submissions and results

## User Personas
1. **Fan Pokémon**: Interessati a quiz personalità legati al mondo Pokemon
2. **Community Members**: Utenti che vogliono confrontare risultati

## Core Requirements
- [x] Homepage tema Accademia Pokemon
- [x] Sistema registrazione/login
- [x] Dashboard news con notifiche
- [x] Questionario 10 domande
- [x] 6 profili personalità (Cinico, Empatico, Ansioso, Aggressivo, Accondiscendente, Equilibrato)
- [x] Invio email risultati (MOCKED - placeholder key)
- [x] Design pergamena con Pokeball e Masterball

## Implementation Status (Jan 2026)
- ✅ Backend API completo e funzionante
- ✅ Frontend con design tema Pokemon
- ✅ Sistema autenticazione JWT
- ✅ Questionario con tutti i 10 quesiti
- ✅ Calcolo profili personalità
- ⚠️ Email: configurato Resend con placeholder key

## Prioritized Backlog

### P0 (Critical)
- [ ] Configurare chiave Resend reale per invio email

### P1 (High)
- [ ] Aggiungere nuove news/notifiche da admin panel
- [ ] Storico questionari compilati per utente
- [ ] Sistema notifiche personalizzate per utente

### P2 (Medium)
- [ ] Admin dashboard per gestione news
- [ ] Statistiche aggregate risposte
- [ ] Export risultati in PDF

## Next Tasks
1. Sostituire RESEND_API_KEY placeholder con chiave reale
2. Cambiare RECIPIENT_EMAIL da test@gmail.com a mat.zanotti00@gmail.com
3. Implementare admin panel per aggiungere nuove news
