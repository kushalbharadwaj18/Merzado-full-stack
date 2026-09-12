# Sourceflow — B2B RFQ Marketplace

React + Vite frontend and Express + MongoDB API for a buyer/supplier RFQ workflow.

## Run locally

1. Create `backend/.env` using `.env.example`; set a MongoDB connection string and a long JWT secret.
2. Run `npm install` and `npm run dev` in `backend`.
3. Run `npm install` and `npm run dev` in `my-app`.

## Architecture

- `backend/server.js`: Express REST API, Mongoose models, JWT authentication, bcrypt password hashing, role middleware, validation, and centralized error responses.
- `my-app`: responsive React dashboard illustrating buyer and supplier workflows, RFQ browsing/searching, RFQ creation, RFQ detail view, and quotation UI.

## API

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET, POST /api/rfqs`, `PATCH /api/rfqs/:id`
- `GET /api/quotes`, `POST /api/rfqs/:id/quotes`

The current frontend ships with polished local demo data so the UI can be reviewed immediately. The API is ready to be connected through a small `fetch` client after the API is deployed.

## Notes

MongoDB is the persistence layer. Suppliers can only submit one quote per open RFQ, buyers can edit only their own RFQs, and buyers can only read quotes for their own RFQs.
