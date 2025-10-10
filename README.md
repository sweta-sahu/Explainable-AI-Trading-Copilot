
# AI Trading Copilot — Open‑Data, Explainable, Serverless

End‑to‑end trading analytics built on **open/public data feeds** (prices + news), **explainable ML** (XGBoost + SHAP), and **serverless inference** on AWS. UI is a **React** app (no Streamlit).

> Core idea: ingest fresh market + news signals, build features, serve real‑time predictions with plain‑English explanations, and keep everything cheap, observable, and auditable.

---

## Table of Contents
<!-- - [Project Structure](#project-structure) -->
- [Architecture](#architecture)
- [AWS Services](#aws-services)
- [Tech Stack](#tech-stack)
<!-- - [Data Contracts](#data-contracts)
- [APIs](#apis) -->
<!-- - [Local Dev](#local-dev)
- [Deploy](#deploy)
- [Security & Compliance](#security--compliance)
- [Roadmap](#roadmap) -->

---

<!-- ## Project Structure

```
ai-trading-copilot/
├─ infra/
│  ├─ cdk/ or terraform/                # IaC for S3, DDB, Lambdas, API GW, SageMaker, EventBridge, IAM
│  └─ policies/                         # Least-privilege IAM JSONs
├─ lambdas/
│  ├─ price_collector/                  # Pulls Stooq (or optional broker) → S3 /prices/
│  ├─ news_collector/                   # Pulls GDELT → S3 /news/ and DDB summaries
│  ├─ feature_builder/                  # Reads S3 + DDB → writes S3 /features/date=YYYY-MM-DD/<ticker>.parquet
│  └─ refresh_data/                     # Optional manual trigger via /refresh-data
├─ sagemaker/
│  ├─ train/                            # Notebooks/scripts to train model, push model.pkl to S3 /models/
│  └─ inference/                        # Inference handler for serverless endpoint (loads model + features)
├─ frontend/                            # React app (Vite or Next.js)
│  ├─ src/
│  │  ├─ pages/                         # Routes
│  │  ├─ components/                    # TickerInput, PredictionCard, EvidencePanel, HealthBadge, etc.
│  │  ├─ lib/api.ts                     # API client for /predict, /get-history, /refresh-data
│  │  └─ state/                         # Query caching (TanStack Query) and polling intervals
│  └─ vite.config.ts or next.config.js
├─ scripts/                             # Data backfills, utilities
├─ docs/
│  └─ architecture.md                   # Mermaid diagrams (high-level + sequence)
├─ .env.example                         # Env var template
└─ README.md
```

--- -->

## Architecture

### High-level

<img src="./architecture_digrams/Architecture_diagram.svg" alt="Architecture Diagram" width="1200px" height="500px"/>


### `/predict` sequence


<img src="./architecture_digrams/predict-api-sequence-dig.svg" alt="Architecture Diagram" width="1050px" height="500px"/>

---

<!-- ## Data Contracts

**S3**  
- `prices/YYYY-MM-DD/<TICKER>.csv` — raw OHLCV from Stooq (or optional provider)  
- `news/YYYY-MM-DD/<TICKER>.json` — raw news docs (GDELT)  
- `features/date=YYYY-MM-DD/<TICKER>.parquet` — engineered features for inference/training  
- `models/YYYY-MM-DD/model.pkl` — trained artifact for deployment

**DynamoDB — `StockCopilotTable`**  
- **PK**: `ticker_date` (e.g., `AAPL_2025-10-05`)  
- **SK**: `datatype` ∈ {`prediction`, `shap`, `news`, `explanation`}  
- Values: JSON blobs for predictions, factors, summaries, explanations

---

## APIs

### External (data ingestion)
- **Stooq** — open CSV endpoints for equities OHLCV (training + near‑real‑time polling)
- **GDELT 2.0 Docs** — public domain news + tone

> Optional: **Finnhub / Polygon / Schwab** for low‑latency inference feeds (treat as inference‑only; don’t redistribute).

### Internal (user‑facing)
- `POST /predict`
  - **Body**: `{ "ticker": "AAPL" }`
  - **Flow**: API GW → SageMaker Serverless → S3 (features, model) → DDB writes (`prediction`, `shap`, `explanation`)
  - **Returns**: `{ ticker, prediction, probability, explanation, evidence? }`

- `GET /get-history/{ticker}`
  - Reads historical predictions, explanations, and metrics from DDB

- `POST /refresh-data` *(optional)*
  - API GW → Lambda to force new price/news pulls and feature rebuild

- `POST /train-model` *(optional)*
  - Kicks off a SageMaker training job using the latest S3 features

--- -->

## AWS Services

- **Amazon S3** — raw data, features parquet, model artifacts
- **Amazon DynamoDB** — per‑day records (`prediction`, `news`, `shap`, `explanation`)
- **AWS Lambda** — price/news collectors, feature builder, refresh hook
- **Amazon EventBridge** — schedules for polling/ETL cadence
- **Amazon SageMaker Serverless** — low‑cost, hot model inference
- **Amazon SageMaker (Training)** — notebooks/scripts to train model.pkl
- **Amazon Bedrock** — converts SHAP + metrics to short explanations
- **Amazon API Gateway** — public API surface for UI
- **Amazon CloudWatch** — logs, metrics, alarms

---

## Tech Stack

- **Backend/ML**: Python, XGBoost/LightGBM, Pandas, PyArrow, SHAP
- **Infra**: AWS CDK or Terraform (IaC), IAM least privilege
- **UI**: **React** (Vite or Next.js), TypeScript, TanStack Query, Tailwind (optional)
- **Data**: Stooq (prices), GDELT (news). Optional Finnhub/Polygon/Schwab for inference
- **Testing**: Pytest, Jest/Vitest
- **CI/CD**: GitHub Actions (lint, unit tests, CDK/Terraform plan & deploy)

---

<!-- ## Local Dev

1. **Bootstrap**  
   ```bash
   cd frontend && npm i && npm run dev
   cd lambdas/price_collector && pip install -r requirements.txt -t .
   # repeat for other lambdas
   ```

2. **Env Vars** (`.env` / SSM Parameters)  
   - `S3_BUCKET`
   - `DDB_TABLE=StockCopilotTable`
   - `WATCHLIST=AAPL,MSFT,AMZN`
   - Optional: `FINNHUB_API_KEY`, `POLYGON_API_KEY`, `SCHWAB_CLIENT_ID`

3. **Run ETL locally**  
   - Invoke collectors with a date/ticker to backfill S3 raw and features.

4. **React dev server**  
   - The UI reads `VITE_API_BASE` and calls API Gateway mock or local proxy.

---

## Deploy

- **IaC**: provision S3, DDB, Lambdas, EventBridge, API Gateway, SageMaker endpoint, IAM roles.
- **Model**: train in SageMaker notebook, upload `model.pkl` to `s3://.../models/...`, point endpoint to the new artifact.
- **UI**: build React and deploy via AWS Amplify, S3+CloudFront, or Vercel.

**Zero‑downtime model updates**  
- Upload new `model.pkl` to versioned path.  
- Update endpoint config to the new model.  
- Rollback by flipping to prior model S3 URI.

---

## Security & Compliance

- **Data licensing**: Stooq + GDELT are open/public; optional broker feeds used for **inference only**. Do not redistribute proprietary data.
- **IAM**: scoped roles per Lambda; read‑only on S3 prefixes where possible; DDB item‑level conditions by `ticker_date`.
- **PII**: none by default. If you add user accounts, store secrets in **AWS Secrets Manager** and enforce TLS everywhere.
- **Cost guards**: EventBridge cadence, S3 lifecycle rules, CloudWatch alarms on DDB/endpoint invocations.

---

## Roadmap

- Add **drift detection** (PSI/KS) and auto‑retrain pipeline
- Add **feature store** (e.g., SageMaker Feature Store or Lake Formation tables)
- Add **websocket live tiles** in React for second‑level updates
- Expand to **crypto 24/7 markets** (CoinMetrics / CryptoCompare open data)
- Strategy simulation and **execution connector** (paper trading only) -->
