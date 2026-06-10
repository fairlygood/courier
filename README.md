# Courier

A handwritten letter network for Supernote e-ink devices. Letters take time to arrive — delivery is delayed based on distance between sender and recipient, just like real mail.

## Project Structure

```
├── courier-server/    # Express + TypeScript backend (SQLite)
└── courier-plugin/    # React Native plugin for Supernote
```

---

## Plugin

This is probably what you want. Download a pre-built version from releases and upload it to the MyStyles folder on your device.


On device: **Settings → Apps → Plugins → Add Plugin** → select `Courier.snplg`.

The Courier button appears in the 'Plugins' menu when a note is open. Select 'Share to Courier' to send the current note as a letter.

Send me a letter! I'm at **dirty-remarkable-alpaca**

---

## Server

The backend that stores users, letters, and handles delivery delay calculation.

You can self-host the server if you want. You'll need to modify the plugin to connect to the correct URL.

### Setup

```bash
cd courier-server
npm install
npm run dev        # → http://localhost:3000
```

### Production

```bash
npm run build
PORT=8080 JWT_SECRET=your-secret-here node dist/index.js
```

`JWT_SECRET` is required — the server won't start without it. Data is stored in SQLite at `data/courier.db`. Everything is created automatically on first run.

### Tests

```bash
npm test          # 145 tests (vitest)
```

