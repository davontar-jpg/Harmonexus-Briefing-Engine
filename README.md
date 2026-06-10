# Harmonexus Engine — Market Weather Web App

A Streamlit front-end for the Market Machine Google Sheets / Excel backend.

## What it does
- Opens with a clean briefing page: asset cards, bias, conviction, timing, evidence stack.
- Lets you drill down into Signal Engine, Seasonality, Timing, Structure, Health Check, and Notification Log.
- Works on desktop and phone-friendly browser views.
- Uses your current workbook as the backend. Upload a fresh `.xlsx`, or replace the sample file in `/data`.

## Run locally
```bash
pip install -r requirements.txt
streamlit run app.py
```

## Deploy on Streamlit Community Cloud
1. Create a GitHub repo.
2. Upload `app.py`, `requirements.txt`, `.streamlit/config.toml`, and the `data/` folder.
3. Go to Streamlit Community Cloud and deploy `app.py`.
4. Keep your workbook private unless you intentionally publish it.

## Connect to Google Sheets later
This version reads `.xlsx` directly. For a live Google Sheets backend, publish specific tabs as CSV or use the Google Sheets API with service account credentials in Streamlit secrets.

## Notes
This is a decision-support interface, not an automated trading system and not a trade signal service.
