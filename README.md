# BiFi (BIer FInanzierung) 🍻

BiFi ist eine digitale Getränke-Strichliste für Vereine, Gruppen und Wohngemeinschaften. Mit Fokus auf **Gamification** und **Social Activities** soll die Motivation gesteigert werden, Konsum nicht nur einzutragen, sondern den Verein aktiv zu unterstützen.

## 🚀 Features

- **Getränke-Shop:** Einfaches Buchen von Getränken und Produkten über Favoriten oder die Shop-Übersicht.
- **Social Feed:** Verfolge die Aktivitäten deiner Freunde (z.B. neue Errungenschaften, geteilte Getränke).
- **Gamification:**
  - **Achievements:** Schalte Trophäen für besondere Meilensteine frei.
  - **Jackpot:** Dreh am Glücksrad und zahle zwischen 0 % und 200 % des Preises (optional).
  - **Leaderboard:** Vergleiche dich mit anderen in verschiedenen Kategorien.
- **Benachrichtigungen:** Erhalte Infos über neue Rabatte, Nudges von Freunden oder gewonnene Jackpots.
- **Admin-Bereich:** Verwaltung von Benutzern, Guthaben, Produkten, Rabattaktionen und offenen Schulden.

**Inhalt:** [Inbetriebnahme](#-inbetriebnahme) · [Admin-Handbuch](#-admin-handbuch) · [Benutzer-Handbuch](#-benutzer-handbuch) · [Entwicklung](#-lokale-entwicklung) · [Umgebungsvariablen](#️-umgebungsvariablen-env)

---

## 🚀 Inbetriebnahme

Für den Betrieb werden fertige Images aus der GitHub Container Registry verwendet (`ghcr.io/letsdrinksometea/bifi` und `ghcr.io/letsdrinksometea/bifi-postgres`). Ein Checkout des Quellcodes ist nicht nötig, es reichen `docker-compose.yml` und eine `.env`.

### Voraussetzungen

- Ein Server mit Docker & Docker Compose
- Eine Domain mit HTTPS (z.B. über einen Reverse Proxy wie Traefik, Caddy oder nginx). HTTPS ist nötig, damit Login-Cookies funktionieren und die App als PWA installiert werden kann.

### 1. Konfiguration

`docker-compose.yml` und `.env.example` in ein Verzeichnis auf dem Server legen, dann:

```bash
cp .env.example .env
```

Mindestens diese Werte setzen (Passwörter z.B. mit `openssl rand -base64 32` erzeugen):

```dotenv
POSTGRES_PASSWORD=...
REDIS_PASSWORD=...
SESSION_SECRET=...          # min. 32 Zeichen
APP_URL=https://bifi.example.com
TRUST_PROXY=true            # wenn ein Reverse Proxy davor sitzt
```

Optionale Features wie den Jackpot (`JACKPOT_ENABLED=true`) oder Single Sign-On per OIDC aktivierst du ebenfalls hier, siehe [Umgebungsvariablen](#️-umgebungsvariablen-env). Änderungen an der `.env` werden erst nach `docker compose up -d` wirksam.

### 2. Starten

```bash
docker compose up -d
```

Die App lauscht auf Port `3000`, dorthin leitet der Reverse Proxy weiter. Beim allerersten Start legt das `bifi-postgres`-Image das Datenbankschema automatisch an.

### 3. Ersten Admin anlegen

Es gibt **keinen Standard-Login**. Den ersten Admin legst du auf eine von zwei Arten an:

- **Lokaler Login:** einmalig per API, solange noch kein Benutzer existiert (danach ist der Endpunkt gesperrt):

  ```bash
  curl -X POST https://bifi.example.com/api/auth/local/bootstrap \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@example.com","displayName":"Admin","username":"admin","password":"mindestens8zeichen"}'
  ```

  Danach in der App mit E-Mail oder Benutzername und Passwort anmelden.

- **Single Sign-On (OIDC):** Benutzer werden beim ersten Login automatisch angelegt. Wer in der Gruppe `OIDC_ADMIN_GROUP` (Standard `bifi-admin`) ist, wird Admin, wer in `OIDC_MODERATOR_GROUP` ist, wird Moderator.

### Updates & Backups

```bash
docker compose pull
docker compose up -d
```

> [!IMPORTANT]
> Das Datenbankschema wird nur bei der **Erstinstallation** (leeres Datenbank-Volume) automatisch angelegt. Enthält ein Update Schemaänderungen, müssen diese manuell eingespielt werden. Vor jedem Update ein Backup ziehen:
>
> ```bash
> docker compose exec db pg_dump -U bifi bifi > bifi-backup-$(date +%F).sql
> ```

Hochgeladene Bilder liegen im Volume `bifi_uploads_data` und sollten ebenfalls gesichert werden.

---

## 🛡 Admin-Handbuch

Der Admin-Bereich ist über das Menü hinter deinem **Avatar** in der oberen Leiste erreichbar (nur für Moderatoren und Admins sichtbar).

### Rollen

| Aktion                                                   | Mitglied | Moderator | Admin |
| :------------------------------------------------------- | :------: | :-------: | :---: |
| Kaufen, Gruppen, Prost, Freunde, Statistiken             |    ✅    |    ✅     |  ✅   |
| Benutzer anlegen, Guthaben einzahlen, aktivieren/sperren |          |    ✅     |  ✅   |
| Produkte & Rabattaktionen anlegen und bearbeiten         |          |    ✅     |  ✅   |
| Schuldenliste & Zahlungserinnerungen                     |          |    ✅     |  ✅   |
| Fremde Käufe und Jackpot-Drehs stornieren (≤ 5 Minuten)  |          |    ✅     |  ✅   |
| Admin-Rolle vergeben, Passwörter zurücksetzen            |          |           |  ✅   |
| Benutzer und Produkte löschen, Audit-Log einsehen        |          |           |  ✅   |

Niemand kann Benutzer bearbeiten, die eine höhere Rolle haben als er selbst. Bei OIDC-Benutzern mit `ROLE_SYNC=always` wird die Rolle bei jedem Login aus den Gruppen übernommen und lässt sich in der App nicht ändern.

### Nutzer

- **Neu:** Legt einen Benutzer mit lokalem Login an. Bei OIDC ist das nicht nötig, Benutzer entstehen beim ersten Login.
- **Einzahlen:** Bucht Guthaben auf ein Konto, z.B. nach einer Bar- oder PayPal-Zahlung. Negative Beträge sind als Korrektur möglich. Das Maximum pro Buchung legt `MAX_DEPOSIT_AMOUNT` fest.
- **Rolle / Aktiv:** Rolle ändern bzw. Benutzer sperren. Gesperrte Benutzer können sich nicht mehr anmelden, ihre Historie bleibt erhalten.
- **Jackpot:** Erlaubt einem Benutzer das Glücksrad. Der Schalter wirkt nur, wenn der Jackpot systemweit mit `JACKPOT_ENABLED=true` aktiviert ist. Neue Benutzer haben den Jackpot standardmäßig nicht.
- **PW Reset / Löschen:** nur für Admins.

### Produkte

Produkte haben eine Kategorie (Alkoholisch, Softdrinks, Speisen, Snacks, Sonstiges), ein Bild (JPEG/PNG/WebP/GIF, max. 2 MB) und eine oder mehrere **Varianten** mit eigenem Preis, z.B. „0,33 l“ und „0,5 l“. Ausgeblendete und gelöschte Produkte erscheinen nicht mehr im Shop, die Kaufhistorie bleibt erhalten.

### Rabatte

Eine Rabattaktion gilt für ein Produkt, eine Variante oder ganze Kategorien und gibt entweder einen Prozent- oder einen festen Betrag nach. Optional sind ein Zeitraum (Start/Ende) und ein Mengenlimit („die ersten 20 Stück“). Aktive Aktionen erscheinen als Banner im Shop und im Aktivitäts-Feed.

### Schulden

Listet alle aktiven Benutzer mit negativem Kontostand. Per Knopfdruck lässt sich eine **Zahlungserinnerung** als Benachrichtigung schicken (höchstens eine pro Minute und Benutzer). Ob Konten überhaupt ins Minus gehen dürfen, steuert `ALLOW_NEGATIVE_BALANCE`. Ab welchem Stand Benutzer ein Warnbanner sehen, steuert `BALANCE_WARN_THRESHOLD`.

### Audit-Log

Protokolliert sicherheitsrelevante Aktionen wie Rollenänderungen, Einzahlungen, Stornos und Löschungen mit Zeitpunkt, ausführender Person und IP-Adresse. Nur für Admins sichtbar.

---

## 🙋 Benutzer-Handbuch

### App installieren

BiFi ist eine Web-App und lässt sich wie eine normale App auf den Startbildschirm legen:

- **iPhone/iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

### Navigation

| Bereich     | Inhalt                                                               |
| :---------- | :------------------------------------------------------------------- |
| **Home**    | Kontostand, Favoriten für schnelles Buchen, Neuigkeiten aus dem Feed |
| **Shop**    | Alle Produkte nach Kategorien, aktuelle Rabattaktionen               |
| **Sozial**  | Freunde, Gruppen und die Rangliste                                   |
| **Verlauf** | Aktivitäts-Feed, eigene Käufe und Nachrichten                        |
| **Profil**  | Name, Avatar, Passwort, Achievements, Statistiken                    |

### Kaufen

Produkt antippen, Variante und Menge wählen, bestätigen. Der Betrag wird sofort vom Guthaben abgezogen. Häufig gekaufte Produkte lassen sich im Shop mit dem Stern als **Favorit** auf den Home-Screen holen.

**Vertippt?** Unter _Verlauf → Käufe_ lässt sich ein Kauf innerhalb von **5 Minuten** stornieren. Danach kann ein Moderator oder Admin den Betrag per Korrekturbuchung ausgleichen.

### Guthaben aufladen

Guthaben wird von einem Moderator oder Admin eingebucht, z.B. nachdem du bar oder per Überweisung bezahlt hast. Wie euer Verein das handhabt, erfährst du dort.

### Gruppen

Mit einer Gruppe (z.B. „Stammtisch“ oder „WG“) könnt ihr gemeinsam kaufen: Beim Kauf die Gruppe auswählen, dann wird der Betrag **gleichmäßig auf alle Mitglieder aufgeteilt**. Neue Mitglieder kommen über einen Einladungslink dazu.

### Prost & Anstupsen

- **Prost:** Spendiere jemandem ein Getränk. Du zahlst sofort, die andere Person bekommt einen Gutschein, der beim nächsten Kauf genau dieses Getränks automatisch eingelöst wird. Ist es bis dahin günstiger geworden, bekommst du die Differenz zurück.
- **Anstupsen:** Schick jemandem eine kurze Nachricht, z.B. eine Einladung auf ein Bier (an dieselbe Person höchstens alle 10 Minuten).

### Jackpot

Wenn euer Verein ihn freigeschaltet hat, kannst du statt eines normalen Kaufs am **Glücksrad** drehen: Du bekommst das Produkt und zahlst zufällig zwischen 0 % und 200 % des Preises, im Schnitt also genau den Normalpreis. Jackpot-Drehs kannst du nicht selbst stornieren.

### Achievements, Rangliste & Statistiken

Für Meilensteine (z.B. Prost verschickt, Gruppe gegründet, Jackpot-Glück, …) gibt es **Achievements**, die im Profil und im Feed erscheinen. Die **Rangliste** unter _Sozial_ vergleicht euch nach Woche, Monat oder insgesamt. Unter **Statistiken** siehst du deine Ausgaben, Lieblingsprodukte und zu welchen Tageszeiten du am meisten trinkst.

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

3.  **Dev-Stack starten** (baut Container, startet HMR):

    ```bash
    make dev
    ```

    Client: `http://localhost:5173` · Server: `http://localhost:3000`

4.  **Datenbank migrieren** (in einem zweiten Terminal, beim ersten Start und nach Schemaänderungen):

    ```bash
    make migrate
    ```

5.  **Ersten Admin anlegen** wie unter [Inbetriebnahme](#3-ersten-admin-anlegen) beschrieben, nur mit `http://localhost:5173` als URL.

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

### Pflicht

| Variable            | Beschreibung                                              |
| :------------------ | :-------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Passwort für PostgreSQL                                   |
| `SESSION_SECRET`    | Geheimnis für Session-Cookies (min. 32 Zeichen)           |
| `APP_URL`           | Öffentliche URL der App (z.B. `https://bifi.example.com`) |

### Datenbank

| Variable        | Beschreibung                            | Standard                                     |
| :-------------- | :-------------------------------------- | :------------------------------------------- |
| `POSTGRES_DB`   | PostgreSQL Datenbankname                | `bifi`                                       |
| `POSTGRES_USER` | PostgreSQL Benutzername                 | `bifi`                                       |
| `DATABASE_URL`  | DB-Verbindung (nur außerhalb Docker)    | `postgresql://bifi:<pw>@localhost:5432/bifi` |
| `REDIS_URL`     | Redis-Verbindung (nur außerhalb Docker) | `redis://localhost:6379`                     |

### App

| Variable      | Beschreibung                                       | Standard        |
| :------------ | :------------------------------------------------- | :-------------- |
| `NODE_ENV`    | Laufzeitumgebung                                   | `production`    |
| `PORT`        | Server-Port                                        | `3000`          |
| `TZ`          | Zeitzone                                           | `Europe/Berlin` |
| `TRUST_PROXY` | Vertraue Reverse-Proxy-Headern (nginx, Traefik, …) | `false`         |
| `UPLOAD_DIR`  | Pfad für hochgeladene Bilder                       | `./uploads`     |

### Authentifizierung

| Variable                        | Beschreibung                                                             | Standard         |
| :------------------------------ | :----------------------------------------------------------------------- | :--------------- |
| `LOCAL_AUTH_ENABLED`            | Lokalen Login (Nutzer/Passwort) erlauben                                 | `true`           |
| `OIDC_ISSUER`                   | OIDC Provider URL (z.B. Authentik)                                       | —                |
| `OIDC_CLIENT_ID`                | OIDC Client ID                                                           | —                |
| `OIDC_CLIENT_SECRET`            | OIDC Client Secret                                                       | —                |
| `OIDC_AUTO_REDIRECT`            | Bei deaktiviertem Local-Login automatisch zum Provider weiterleiten      | `false`          |
| `OIDC_USERNAME_CLAIM`           | OIDC-Claim, der als Anzeigename verwendet wird                           | `name`           |
| `OIDC_GROUPS_CLAIM`             | Name des Claims, der Gruppenmitgliedschaften enthält                     | `groups`         |
| `OIDC_ADMIN_GROUP`              | Gruppenname, der die Admin-Rolle verleiht                                | `bifi-admin`     |
| `OIDC_MODERATOR_GROUP`          | Gruppenname, der die Moderator-Rolle verleiht                            | `bifi-moderator` |
| `OIDC_ALLOWED_REDIRECT_ORIGINS` | Weitere erlaubte Redirect-Origins für OIDC (`APP_URL` ist immer erlaubt) | —                |
| `ROLE_SYNC`                     | Wann Rollen synchronisiert werden: `always` · `on_creation` · `never`    | `always`         |

### Features

| Variable                 | Beschreibung                                           | Standard |
| :----------------------- | :----------------------------------------------------- | :------- |
| `JACKPOT_ENABLED`        | Jackpot-Feature aktivieren                             | `false`  |
| `BALANCE_WARN_THRESHOLD` | Schwellenwert für Warnbanner (in Cents)                | `-2000`  |
| `MAX_DEPOSIT_AMOUNT`     | Maximaler Einzahlungsbetrag pro Transaktion (in Cents) | `10000`  |
| `ALLOW_NEGATIVE_BALANCE` | Negativen Kontostand erlauben                          | `true`   |

### Development

| Variable         | Beschreibung                                                                | Standard |
| :--------------- | :-------------------------------------------------------------------------- | :------- |
| `VITE_DEV_TOOLS` | Debug-API-Routen (`/api/dev`) und Dev-Banner aktivieren — nie in Produktion | `false`  |

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

Siehe [Inbetriebnahme](#-inbetriebnahme). Bei jedem Push auf `main` baut die CI die Images `ghcr.io/letsdrinksometea/bifi` und `ghcr.io/letsdrinksometea/bifi-postgres` neu (`.github/workflows/docker-publish.yml`).
