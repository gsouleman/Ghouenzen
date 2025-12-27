# Al-Wasiyyah - Islamic Will & Estate Management System

بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ

A web application for managing Islamic wills (Al-Wasiyyah) with automatic Al-Faraid (Islamic inheritance) calculations.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL

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

---

## Deployment on Render.com

### Option 1: One-Click Deploy with Blueprint (Recommended)

1. **Push code to GitHub**:
   ```bash
   cd islamic-will-app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/islamic-will-app.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render auto-detects `render.yaml` and creates:
     - ✅ Web Service (Node.js)
     - ✅ PostgreSQL Database (Free tier)
   - Click **"Apply"**

3. Your app will be live at: `https://islamic-will-app.onrender.com`

### Option 2: Manual Deploy

1. **Create PostgreSQL Database**:
   - Go to Render Dashboard → **"New +"** → **"PostgreSQL"**
   - Name: `islamic-will-db`
   - Plan: Free
   - Click **"Create Database"**
   - Copy the **"Internal Database URL"**

2. **Create Web Service**:
   - Go to Render Dashboard → **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `islamic-will-app`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Add Environment Variable:
     - **Key**: `DATABASE_URL`
     - **Value**: (paste the PostgreSQL connection string)
     - **Key**: `NODE_ENV`
     - **Value**: `production`
   - Click **"Create Web Service"**

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL installed and running

### Setup

1. **Clone and install**:
   ```bash
   cd islamic-will-app
   npm install
   ```

2. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE islamic_will;
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open browser**: http://localhost:3000

---

## Project Structure

```
islamic-will-app/
├── server.js           # Express.js server with PostgreSQL
├── package.json        # Node.js dependencies
├── render.yaml         # Render.com deployment config
├── .env.example        # Environment variables template
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

---

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

---

## Demo Data

Click **"Load Demo Data"** on the home page to populate with:

**Testator**: GHOUENZEN SOULEMANOU

**7 Heirs**:
| Relation | Name |
|----------|------|
| Wife | GHOUENZEN MEFIRE HAFSETOU |
| Mother | MENJIKOUE ABIBA |
| Son | GHOUENZEN NJOYA MOHAMED HANIF |
| Son | GHOUENZEN SALIH NASRI SALIM |
| Son | GHOUENZEN NJIKAM MUSTAFA HAKIM |
| Daughter | GHOUENZEN HABIBA MARYAM IMANN |
| Daughter | GHOUENZEN MEFIRE ZAINAB NOURA |

**9 Assets** (Total: 127,500,000 XAF):
| Description | Location | Value (XAF) |
|-------------|----------|-------------|
| Land - 400 m² | Foumban | 8,000,000 |
| Land - 4,000 m² | Ngombe | 40,000,000 |
| Land - 500 m² | Bomono | 7,500,000 |
| Land with House - 450 m² | Lendi | 13,500,000 |
| Land (2nd Plot) - 450 m² | Lendi | 9,000,000 |
| Land - 3,500 m² | Massoumbou | 24,500,000 |
| Farmland - ~5 ha | Malere | 25,000,000 |
| Nissan X-Trail | Cameroon | TBD |
| Mitsubishi Pickup | Cameroon | TBD |

---

## Islamic Inheritance Rules (Al-Faraid)

For a testator with wife, mother, sons, and daughters:

| Heir | Share |
|------|-------|
| Wife | 1/8 (when children exist) |
| Mother | 1/6 (when children exist) |
| Father | 1/6 (when children exist) |
| Sons | 2 shares each of residue |
| Daughters | 1 share each of residue |

---

## Disclaimer

This tool is for estate planning purposes only. Please consult:
- A qualified Islamic scholar (Mufti) for inheritance verification
- A licensed legal professional for will execution

---

Created for **GHOUENZEN SOULEMANOU** - Cameroon

*"It is not permissible for any Muslim who has something to bequeath to stay for two nights without having his will written."*  
— Sahih al-Bukhari & Muslim
