# DeenBot - Plateforme de transcription et recherche de contenu islamique

## Installation locale

1. **Installer les dépendances Python** :
```bash
pip install -r requirements.txt
```

2. **Configurer l'environnement** :
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

3. **Lancer le backend** :
```bash
uvicorn main:app --reload
```

4. **Lancer le frontend** :
```bash
cd frontend
npm install
npm run dev
```

## Fonctionnalités
- Transcription audio/vidéo
- Recherche sémantique dans les transcriptions
- Support de l'arabe classique
- Historique des conversations
- Gestion de multiples vidéos
    