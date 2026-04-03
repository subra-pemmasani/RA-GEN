# Risk Assessment Generator (RA-GEN)

A beginner-friendly full-stack web application to convert an Excel-based risk assessment process into a web workflow.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Data source (v1): local JSON files

## Version 1 Pages
1. Dashboard
2. Activity Library
3. Hazard Library
4. Activity-Hazard Mapping
5. RA Generator
6. Printable RA Output

## Core workflow implemented
- Select activity and sub-activity
- Create new activities and sub-activities
- Edit existing activities and sub-activities
- Load mapped hazards automatically
- Show description, consequences, existing controls
- Enter likelihood/severity (1-5)
- Auto-calculate RPN
- Enter additional controls
- Enter residual likelihood/severity
- Auto-calculate residual RPN
- Print to A4-friendly layout

## Run locally
```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

## Docker (Hostinger-friendly single container)
Build and run:
```bash
docker build -t ra-generator .
docker run -d --name ra-generator -p 4000:4000 ra-generator
```
Open `http://YOUR_SERVER_IP:4000`

Or with compose:
```bash
docker compose up -d --build
```

## Data files
- `backend/data/activities.json`
- `backend/data/hazards.json`
- `backend/data/activityHazardMappings.json`
