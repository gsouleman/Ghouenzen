# Al-Wasiyyah - Islamic Will & Estate Management System

بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ

A web application for managing Islamic wills (Al-Wasiyyah) with automatic Al-Faraid (Islamic inheritance) calculations.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)

## Features

- ✅ Testator Information Management
- ✅ Heirs Registry with Islamic Inheritance Calculation
- ✅ Executors Management
- ✅ Debtors Tracking (People who owe the estate)
- ✅ Creditors Management (Debts to be paid)
- ✅ Assets Inventory (Land, Vehicles, Investments)
- ✅ Al-Faraid Calculator (Wife 1/8, Mother 1/6, Sons & Daughters residue)
- ✅ Printable Will Document
- ✅ Demo Data Pre-loaded

## Deployment on Render.com

### Option 1: One-Click Deploy with render.yaml

1. Push this code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repository
5. Render auto-detects `render.yaml` and deploys

### Option 2: Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `islamic-will-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**

Your app will be live at: `https://islamic-will-app.onrender.com`

## Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open browser
http://localhost:3000
```

## Project Structure

```
islamic-will-app/
├── server.js           # Express.js server with SQLite
├── package.json        # Node.js dependencies
├── render.yaml         # Render.com deployment config
├── public/
│   ├── index.html      # Landing page
│   ├── dashboard.html  # Main dashboard
│   ├── will.html       # Will document (printable)
│   ├── css/
│   │   └── style.css   # All styles
│   └── js/
│       ├── app.js      # Utility functions
│       └── dashboard.js # Dashboard logic
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/testator` | Manage testator info |
| PUT | `/api/testator/:id` | Update testator |
| GET/POST | `/api/heirs` | List/add heirs |
| PUT/DELETE | `/api/heirs/:id` | Update/delete heir |
| GET/POST | `/api/executors` | List/add executors |
| PUT/DELETE | `/api/executors/:id` | Update/delete executor |
| GET/POST | `/api/debtors` | List/add debtors |
| PUT/DELETE | `/api/debtors/:id` | Update/delete debtor |
| GET/POST | `/api/creditors` | List/add creditors |
| PUT/DELETE | `/api/creditors/:id` | Update/delete creditor |
| GET/POST | `/api/assets` | List/add assets |
| PUT/DELETE | `/api/assets/:id` | Update/delete asset |
| GET | `/api/summary` | Get estate summary + inheritance |
| POST | `/api/load-demo` | Load demo data |
| POST | `/api/reset` | Clear all data |

## Demo Data

Click "Load Demo Data" to populate with:

**Testator**: GHOUENZEN SOULEMANOU

**7 Heirs**:
- Wife: GHOUENZEN MEFIRE HAFSETOU
- Mother: MENJIKOUE ABIBA
- 3 Sons: Mohamed Hanif, Salih Nasri Salim, Mustafa Hakim
- 2 Daughters: Habiba Maryam Imann, Zainab Noura

**9 Assets** (Total: 127,500,000 XAF):
- 7 Land properties in Cameroon (Foumban, Ngombe, Bomono, Lendi, Massoumbou, Malere)
- 2 Vehicles (Nissan X-Trail, Mitsubishi Pickup)

## Islamic Inheritance Rules

For a testator with wife, mother, sons, and daughters:

| Heir | Share |
|------|-------|
| Wife | 1/8 (when children exist) |
| Mother | 1/6 (when children exist) |
| Sons | 2 shares each of residue |
| Daughters | 1 share each of residue |

## Disclaimer

This tool is for estate planning purposes only. Please consult:
- A qualified Islamic scholar (Mufti) for inheritance verification
- A licensed legal professional for will execution

---

Created for **GHOUENZEN SOULEMANOU** - Cameroon

*"It is not permissible for any Muslim who has something to bequeath to stay for two nights without having his will written."*  
— Sahih al-Bukhari & Muslim
