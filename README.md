# Al-Wasiyyah - Islamic Will & Estate Management System

بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ

A comprehensive web application for managing Islamic wills (Al-Wasiyyah) in compliance with Shariah law, specifically designed for estate planning with automatic Al-Faraid (Islamic inheritance) calculations.

## Features

- **Testator Information**: Register the will maker's details
- **Heirs Registry**: Add family members with automatic share calculation
- **Executors Management**: Designate will executors
- **Debtors Tracking**: People who owe money to the estate
- **Creditors Management**: Debts that must be paid before inheritance
- **Assets Inventory**: Land, vehicles, and other valuables with valuations
- **Al-Faraid Calculator**: Automatic Islamic inheritance distribution
- **Will Document**: Generate complete Islamic will clause document

## Islamic Inheritance Rules Implemented

For a testator with wife, mother, sons, and daughters:
- **Wife**: 1/8 (when there are children)
- **Mother**: 1/6 (when there are children)
- **Sons & Daughters**: Share the residue (Asaba) with sons receiving 2x daughter's share

## Deployment on Render.com

### Option 1: Blueprint Deployment (Recommended)

1. Push this code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and set up the service

### Option 2: Manual Deployment

1. **Create a PostgreSQL Database**:
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `islamic-will-db`
   - Plan: Free
   - Copy the Internal Database URL

2. **Create Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Settings:
     - Name: `islamic-will-app`
     - Runtime: Python 3
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `gunicorn app:app`
   - Environment Variables:
     - `DATABASE_URL`: (paste the PostgreSQL connection string)
     - `SECRET_KEY`: (generate a random string)

3. Click "Create Web Service"

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py

# Open in browser
http://localhost:5000
```

## Project Structure

```
islamic-will-app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── render.yaml           # Render.com deployment config
├── templates/
│   ├── index.html        # Landing page
│   ├── dashboard.html    # Main dashboard
│   └── will_clause.html  # Will document view
└── static/
    ├── css/
    │   └── style.css     # Main stylesheet
    └── js/
        ├── app.js        # Utility functions
        └── dashboard.js  # Dashboard interactions
```

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/testator` | GET, POST, PUT | Manage testator info |
| `/api/heirs` | GET, POST | List/add heirs |
| `/api/heirs/<id>` | PUT, DELETE | Update/delete heir |
| `/api/executors` | GET, POST | List/add executors |
| `/api/executors/<id>` | PUT, DELETE | Update/delete executor |
| `/api/debtors` | GET, POST | List/add debtors |
| `/api/debtors/<id>` | PUT, DELETE | Update/delete debtor |
| `/api/creditors` | GET, POST | List/add creditors |
| `/api/creditors/<id>` | PUT, DELETE | Update/delete creditor |
| `/api/assets` | GET, POST | List/add assets |
| `/api/assets/<id>` | PUT, DELETE | Update/delete asset |
| `/api/summary` | GET | Get estate summary |
| `/api/load-demo` | POST | Load demo data |
| `/api/reset` | POST | Clear session |

## Pre-loaded Demo Data

Click "Load Demo Data" on the home page to populate with sample data for:
- **Testator**: GHOUENZEN SOULEMANOU
- **7 Heirs**: Wife, Mother, 3 Sons, 2 Daughters
- **9 Assets**: 7 land properties in Cameroon, 2 vehicles

## Disclaimer

This application is for estate planning purposes only. Please consult with:
- A qualified Islamic scholar (Mufti) for verification of inheritance calculations
- A licensed legal professional for the final execution of your will

## License

Created for GHOUENZEN SOULEMANOU - Property Rental Business Owner, Cameroon

---

*"It is not permissible for any Muslim who has something to bequeath to stay for two nights without having his will written."* — Sahih al-Bukhari & Muslim
