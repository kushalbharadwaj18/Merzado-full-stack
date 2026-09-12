# Sourceflow — B2B RFQ Marketplace

Sourceflow is a mini B2B request-for-quotation marketplace. Buyers publish requirements and review supplier quotations; suppliers browse open RFQs and send offers.

## Features

- Secure sign-up and login with buyer and supplier roles
- JWT-based authentication and role-based API authorization
- Buyer RFQ creation, management, and received quotations
- Supplier RFQ discovery, search, detail view, and quotation submission
- MongoDB persistence with Mongoose models for `User`, `Rfq`, and `Quote`
- Responsive React interface with loading, empty, and error states
- Server-side validation, password hashing, and meaningful API errors

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Security | JWT, bcryptjs |

## Architecture

```text
React / Vite client  ──HTTP + JWT──>  Express REST API  ──>  MongoDB
                                      ├── User collection
                                      ├── Rfq collection
                                      └── Quote collection
```

The frontend stores the signed-in session token in browser local storage and sends it as a Bearer token with each protected request. Express validates this token, then role middleware restricts buyer-only and supplier-only operations.

## Local setup

### Prerequisites

- Node.js 18 or later
- MongoDB locally or a MongoDB Atlas connection string

### 1. Configure the backend

```bash
cd backend
npm install
```

Create `backend/.env` based on `backend/.env.example`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/sourceflow
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Start the API:

```bash
npm run dev
```

The backend starts on `http://localhost:5000`.

### 2. Configure the frontend

```bash
cd my-app
npm install
```

Optionally create `my-app/.env` from `my-app/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local Vite URL printed in the terminal, normally `http://localhost:5173`.

## API reference

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create buyer or supplier account |
| POST | `/api/auth/login` | Public | Sign in and receive JWT |
| GET | `/api/rfqs` | Authenticated | Buyer sees own RFQs; supplier sees open RFQs |
| POST | `/api/rfqs` | Buyer | Create RFQ |
| PATCH | `/api/rfqs/:id` | Owning buyer | Update RFQ |
| GET | `/api/quotes` | Authenticated | Buyer sees received; supplier sees submitted |
| POST | `/api/rfqs/:id/quotes` | Supplier | Submit quotation for an open RFQ |

## Data model

### User

`name`, `email`, hashed `password`, `role` (`buyer` or `supplier`), timestamps.

### RFQ

`title`, `description`, `quantity`, `unit`, `location`, `deadline`, `status`, buyer reference, timestamps.

### Quote

RFQ reference, supplier reference, `price`, `deliveryDays`, `message`, timestamps.

## Security and validation

- Passwords are hashed with bcrypt before database storage.
- JWTs expire after seven days.
- Protected endpoints reject missing or invalid tokens.
- Role middleware blocks unauthorized buyer/supplier actions.
- Buyer RFQ updates are scoped to the owner.
- The API validates required fields, positive prices/quantities, future RFQ deadlines, and duplicate emails.

## Deployment notes

Deploy `my-app` to a static host such as Vercel or Netlify. Deploy `backend` to a Node.js host such as Render or Railway, set its environment variables, and use a MongoDB Atlas URI. Set `VITE_API_URL` to the deployed backend's `/api` address before building the frontend.

## Assumptions and limitations

- There is no email verification, password-reset flow, file attachment, or payment workflow.
- Quotes cannot yet be edited or shortlisted; those are appropriate next enhancements.
- Production deployment should replace the permissive CORS configuration with an allow-list for the frontend domain.
