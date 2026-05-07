# BiFi (BIer FInanzierung) 🍻

BiFi ist eine digitale Getränke-Strichliste für Vereine, Gruppen und Wohngemeinschaften. Mit Fokus auf **Gamification** und **Social Activities** soll die Motivation gesteigert werden, Konsum nicht nur einzutragen, sondern den Verein aktiv zu unterstützen.

## 🚀 Features

- **Getränke-Shop:** Einfaches Buchen von Getränken und Produkten über Favoriten oder die Shop-Übersicht.
- **Social Feed:** Verfolge die Aktivitäten deiner Freunde (z.B. neue Errungenschaften, geteilte Getränke).
- **Gamification:**
  - **Achievements:** Schalte Trophäen für besondere Meilensteine frei.
  - **Jackpot:** Nimm an der Jackpot-Verlosung bei jeder Buchung teil.
  - **Leaderboard:** Vergleiche dich mit anderen in verschiedenen Kategorien.
- **Benachrichtigungen:** Erhalte Infos über neue Rabatte, Nudges von Freunden oder gewonnene Jackpots.
- **Admin-Bereich:** Verwaltung von Benutzern, Produkten, Rabattaktionen und Abrechnungen.

---

## 🛠 Tech Stack

- **Frontend:** React (TypeScript), Vite, Tailwind CSS, Framer Motion, TanStack Query.
- **Backend:** Hono (Node.js), Drizzle ORM.
- **Datenbank:** PostgreSQL (via Drizzle).
- **Caching:** Redis.
- **Auth:** OIDC (Single Sign-On, z.B. via Authentik) oder lokaler Login.

---

## 💻 Lokale Entwicklung

### Voraussetzungen

- Docker & Docker Compose

### Setup

1.  **Repository klonen:**

    ```bash
    git clone https://github.com/your-repo/bifi.git
    cd bifi
    ```

2.  **Umgebungsvariablen konfigurieren:**
    Kopiere die `.env.example` nach `.env` und passe die Werte an.

    ```bash
    cp .env.example .env
    ```

3.  **Dev-Stack starten** (baut Container, führt Migrationen aus, startet HMR):
    ```bash
    make dev
    ```
    Client: `http://localhost:5173` · Server: `http://localhost:3000`

### Nützliche Make-Targets

| Befehl           | Beschreibung                                |
| :--------------- | :------------------------------------------ |
| `make dev`       | Vollständigen Dev-Stack starten (mit Build) |
| `make db-setup`  | Migration generieren + anwenden             |
| `make db-studio` | Drizzle Studio öffnen (Port 4983)           |
| `make shell`     | Shell im laufenden App-Container            |
| `make logs`      | Container-Logs verfolgen                    |
| `make check`     | Lint + Typecheck ausführen                  |

---

## ⚙️ Umgebungsvariablen (.env)

| Variable                 | Beschreibung                                           | Standard / Beispiel                                   |
| :----------------------- | :----------------------------------------------------- | :---------------------------------------------------- |
| `DATABASE_URL`           | Verbindung zur PostgreSQL DB                           | `postgresql://bifi:bifi_password@localhost:5432/bifi` |
| `REDIS_URL`              | Verbindung zum Redis Cache                             | `redis://localhost:6379`                              |
| `SESSION_SECRET`         | Geheimnis für Session-Cookies (min. 32 Zeichen)        | `change-me-to-a-random-string`                        |
| `APP_URL`                | Öffentliche URL der App                                | `http://localhost:3000`                               |
| `OIDC_ISSUER`            | OIDC Provider URL (z.B. Authentik)                     | `https://auth.example.com/...`                        |
| `OIDC_CLIENT_ID`         | OIDC Client ID                                         | -                                                     |
| `OIDC_AUTO_REDIRECT`     | Automatischer Redirect zum OIDC Login                  | `false`                                               |
| `LOCAL_AUTH_ENABLED`     | Lokalen Login (Nutzer/Passwort) erlauben               | `true`                                                |
| `JACKPOT_ENABLED`        | Aktiviert das Jackpot-Feature                          | `false`                                               |
| `BALANCE_WARN_THRESHOLD` | Schwellenwert für Warnbanner (in Cents)                | `-2000`                                               |
| `MAX_DEPOSIT_AMOUNT`     | Maximaler Einzahlungsbetrag pro Transaktion (in Cents) | `10000` (= 100 €)                                     |
| `ALLOW_NEGATIVE_BALANCE` | Ob Benutzer einen negativen Kontostand haben dürfen    | `true`                                                |
| `UPLOAD_DIR`             | Pfad zum Verzeichnis für hochgeladene Bilder           | `/app/uploads`                                        |

---

## 📁 Projektstruktur

- `/client`: React Frontend Anwendung.
- `/server`: Node.js/Hono Backend.
- `/shared`: Gemeinsam genutzte Typen und Schemata.
- `/drizzle`: SQL Migrationen und Metadaten.

---

## 🧪 Skripte

- `npm run check`: Führt Linting und Typechecking aus.
- `npm run test`: Startet die Vitest Suite.
- `npm run db:studio`: Öffnet Drizzle Studio zur DB-Verwaltung.
- `npm run format`: Formatiert den Code mit Prettier.

---

## 📝 Coding Guidelines

- **TypeScript:** Verwende striktes TypeScript. Vermeide `any`.
- **Styling:** Tailwind CSS wird für das Styling verwendet. Halte dich an die bestehenden UI-Komponenten in `client/src/components/ui`.
- **Zustand:** Nutze TanStack Query für Server-State und Hooks für lokale Logik.
- **Commits:** Schreibe aussagekräftige Commit-Messages (vorzugsweise in Englisch oder Deutsch, aber konsistent).

---

## 🚢 Deployment

Für das Deployment in Produktion kann das Haupt-`docker-compose.yml` verwendet werden. Stelle sicher, dass `NODE_ENV=production` gesetzt ist und alle OIDC-Variablen korrekt konfiguriert sind. Hinter einem Reverse Proxy (Nginx/Traefik) sollte `TRUST_PROXY=true` gesetzt werden.
