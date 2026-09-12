import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const request = async (path, options = {}, token) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || "Request failed");
  return body;
};
const date = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function App() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem("sourceflow-session") || "null"),
  );
  const [page, setPage] = useState("dashboard"),
    [rfqs, setRfqs] = useState([]),
    [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null);
  const saveSession = (value) => {
    setSession(value);
    localStorage.setItem("sourceflow-session", JSON.stringify(value));
  };
  const logout = () => {
    localStorage.removeItem("sourceflow-session");
    setSession(null);
    setRfqs([]);
    setQuotes([]);
  };
  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const [r, q] = await Promise.all([
        request(
          `/rfqs?search=${encodeURIComponent(search)}`,
          {},
          session.token,
        ),
        request("/quotes", {}, session.token),
      ]);
      setRfqs(r);
      setQuotes(q);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const id = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [session, search]);
  if (!session) return <Auth onAuth={saveSession} />;
  const buyer = session.user.role === "buyer";
  const createRfq = async (data) => {
    await request(
      "/rfqs",
      { method: "POST", body: JSON.stringify(data) },
      session.token,
    );
    setModal(null);
    load();
  };
  const createQuote = async (data) => {
    await request(
      `/rfqs/${selected._id}/quotes`,
      { method: "POST", body: JSON.stringify(data) },
      session.token,
    );
    setModal(null);
    setSelected(null);
    load();
  };
  const nav = [
    ["dashboard", "▦", "Dashboard"],
    ["rfqs", "▱", buyer ? "My RFQs" : "Discover RFQs"],
    ["quotes", "◫", buyer ? "Received quotes" : "My quotations"],
  ];
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <b>⌁</b>sourceflow
        </div>
        <div className="company">
          <i>{session.user.name[0]}</i>
          <span>
            <strong>{session.user.name}</strong>
            <small>{buyer ? "Buyer" : "Supplier"} workspace</small>
          </span>
        </div>
        <nav>
          {nav.map((n) => (
            <button
              key={n[0]}
              className={page === n[0] ? "active" : ""}
              onClick={() => setPage(n[0])}
            >
              <em>{n[1]}</em>
              {n[2]}
              {n[0] === "quotes" && quotes.length > 0 && (
                <mark>{quotes.length}</mark>
              )}
            </button>
          ))}
        </nav>
        <div className="aside-foot">
          {/* <button>?</button> */}
          <div className="profile">
            <i>{session.user.name.slice(0, 2).toUpperCase()}</i>
            <span>
              <strong>{session.user.name}</strong>
              <small>{session.user.email}</small>
            </span>
            <button className="logout" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <span>
            {buyer ? "Buyer" : "Supplier"}　/　
            <b>
              {page === "dashboard"
                ? "Overview"
                : page === "rfqs"
                  ? "Marketplace"
                  : "Quotations"}
            </b>
          </span>
          <div>
            <i className="avatar">
              {session.user.name.slice(0, 2).toUpperCase()}
            </i>
          </div>
        </header>
        {error && (
          <div className="api-error">
            {error} <button onClick={load}>Try again</button>
          </div>
        )}
        {page === "dashboard" && (
          <Dashboard
            buyer={buyer}
            rfqs={rfqs}
            quotes={quotes}
            loading={loading}
            create={() => setModal("rfq")}
            browse={() => setPage("rfqs")}
            open={(r) => {
              setSelected(r);
              setPage("rfqs");
            }}
          />
        )}
        {page === "rfqs" && (
          <RfqPage
            buyer={buyer}
            rfqs={rfqs}
            loading={loading}
            search={search}
            setSearch={setSearch}
            create={() => setModal("rfq")}
            open={setSelected}
          />
        )}
        {page === "quotes" && (
          <Quotes buyer={buyer} quotes={quotes} loading={loading} />
        )}
      </main>
      {selected && (
        <Drawer
          rfq={selected}
          buyer={buyer}
          close={() => setSelected(null)}
          quote={() => setModal("quote")}
        />
      )}
      {modal === "rfq" && (
        <RfqForm close={() => setModal(null)} submit={createRfq} />
      )}
      {modal === "quote" && (
        <QuoteForm close={() => setModal(null)} submit={createQuote} />
      )}
    </div>
  );
}
function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"),
    [data, setData] = useState({
      name: "",
      email: "",
      password: "",
      role: "buyer",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onAuth(
        await request(`/auth/${mode === "login" ? "login" : "register"}`, {
          method: "POST",
          body: JSON.stringify(
            mode === "login"
              ? { email: data.email, password: data.password }
              : data,
          ),
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <section className="auth-panel">
        <div className="brand">
          <b>⌁</b>sourceflow
        </div>
        <p className="eyebrow">B2B SOURCING, SIMPLIFIED</p>
        <h1>{mode === "login" ? "Welcome back" : "Join the marketplace"}</h1>
        <p className="auth-copy">
          {mode === "login"
            ? "Sign in to manage your sourcing activity."
            : "Create an account to start sourcing or supplying."}
        </p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <Field
                label="Full name"
                value={data.name}
                required
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
              <label className="field">
                <b>I want to</b>
                <select
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                >
                  <option value="buyer">Buy products or services</option>
                  <option value="supplier">Supply products or services</option>
                </select>
              </label>
            </>
          )}
          <Field
            label="Work email"
            type="email"
            value={data.email}
            required
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
          <Field
            label="Password"
            type="password"
            minLength="8"
            value={data.password}
            required
            onChange={(e) => setData({ ...data, password: e.target.value })}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="primary auth-button" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in →"
                : "Create account →"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New to Sourceflow?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
      <aside className="auth-art">
        <div>
          <span>✦</span>
          <h2>
            Source smarter.
            <br />
            Grow faster.
          </h2>
          <p>
            Connect business requirements with qualified suppliers in one
            focused marketplace.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Dashboard({ buyer, rfqs, quotes, loading, create, browse, open }) {
  const stats = buyer
    ? [
        [rfqs.length, "Active RFQs"],
        [quotes.length, "Quotes received"],
        ["—", "Best total value"],
      ]
    : [
        [rfqs.length, "Open opportunities"],
        [quotes.length, "Quotes submitted"],
        ["—", "Potential value"],
      ];
  return (
    <div className="content">
      <section className="hero">
        <div>
          <small>{buyer ? "BUYER" : "SUPPLIER"} OVERVIEW</small>
          <h1>
            Hello {buyer ? "Buyer" : "Supplier"} <b>✦</b>
          </h1>
          <p>
            {buyer
              ? "Here’s how your sourcing activity is moving today."
              : "New sourcing opportunities are waiting for you."}
          </p>
        </div>
        <button className="primary" onClick={buyer ? create : browse}>
          {buyer ? "＋ Create RFQ" : "Browse RFQs →"}
        </button>
      </section>
      <section className="stats">
        {stats.map((s, i) => (
          <div className="stat" key={s[1]}>
            <i>{["▱", "◫", "⌁"][i]}</i>
            <div>
              <strong>{s[0]}</strong>
              <p>{s[1]}</p>
              <small>{loading ? "Loading…" : "Updated just now"}</small>
            </div>
          </div>
        ))}
      </section>
      <div className="section-title">
        <div>
          <h2>{buyer ? "Your active RFQs" : "Recommended for you"}</h2>
          <p>
            {buyer
              ? "Track responses and manage your requirements."
              : "Explore requirements from verified buyers."}
          </p>
        </div>
        <button onClick={browse}>View all →</button>
      </div>
      <RfqList
        rfqs={rfqs.slice(0, 3)}
        buyer={buyer}
        loading={loading}
        open={open}
      />
    </div>
  );
}
function RfqPage({ buyer, rfqs, loading, search, setSearch, create, open }) {
  return (
    <div className="content">
      <section className="hero">
        <div>
          <small>{buyer ? "SOURCING" : "MARKETPLACE"}</small>
          <h1>{buyer ? "My RFQs" : "Find your next opportunity"}</h1>
          <p>
            {buyer
              ? "Manage requirements and compare supplier responses."
              : "Explore requirements from verified businesses."}
          </p>
        </div>
        {buyer && (
          <button className="primary" onClick={create}>
            ＋ Create RFQ
          </button>
        )}
      </section>
      <div className="toolbar">
        <label>
          ⌕{" "}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQs, descriptions or locations"
          />
        </label>
      </div>
      <RfqList rfqs={rfqs} buyer={buyer} loading={loading} open={open} grid />
    </div>
  );
}
function RfqList({ rfqs, buyer, loading, open, grid }) {
  if (loading) return <div className="empty">Loading RFQs…</div>;
  if (!rfqs.length) return <div className="empty">No RFQs available yet.</div>;
  return (
    <div className={grid ? "grid" : "list"}>
      {rfqs.map((r) => (
        <article className="rfq" onClick={() => open(r)} key={r._id}>
          <div>
            <label>{r.status || "open"}</label>
            <span className="open">● Open</span>
          </div>
          <h3>{r.title}</h3>
          <p>{r.description}</p>
          <div className="meta">
            <span>
              ◫{" "}
              <b>
                {r.quantity} {r.unit || "units"}
              </b>
            </span>
            <span>
              ⌖ <b>{r.location}</b>
            </span>
            <span>
              ◷ <b>{date(r.deadline)}</b>
            </span>
          </div>
          <footer>
            <span className="deadline">◷ Deadline {date(r.deadline)}</span>
            {buyer && <span>Manage RFQ</span>}
          </footer>
        </article>
      ))}
    </div>
  );
}
function Quotes({ buyer, quotes, loading }) {
  return (
    <div className="content">
      <section className="hero">
        <div>
          <small>{buyer ? "SUPPLIER RESPONSES" : "SENT OFFERS"}</small>
          <h1>{buyer ? "Compare quotations" : "My quotations"}</h1>
          <p>All your current quotation activity in one place.</p>
        </div>
      </section>
      {loading ? (
        <div className="empty">Loading quotations…</div>
      ) : !quotes.length ? (
        <div className="empty">No quotations yet.</div>
      ) : (
        <div className="quote-grid">
          {quotes.map((q) => (
            <article className="quote" key={q._id}>
              <h3>{buyer ? q.supplier?.name : q.rfq?.title}</h3>
              <small>{buyer ? q.rfq?.title : "Submitted quotation"}</small>
              <div className="price">
                <div>
                  <small>QUOTED PRICE</small>
                  <b>₹{q.price.toLocaleString("en-IN")}</b>
                </div>
                <div>
                  <small>DELIVERY TIME</small>
                  <b>{q.deliveryDays} days</b>
                </div>
              </div>
              <p>“{q.message}”</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
function Drawer({ rfq, buyer, close, quote }) {
  return (
    <div className="backdrop" onClick={close}>
      <section className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={close}>
          ×
        </button>
        <label>{rfq.status || "open"}</label>
        <h2>{rfq.title}</h2>
        <p className="muted">Open for responses</p>
        <div className="details">
          <div>
            <small>QUANTITY</small>
            <b>
              {rfq.quantity} {rfq.unit || "units"}
            </b>
          </div>
          <div>
            <small>DELIVERY LOCATION</small>
            <b>{rfq.location}</b>
          </div>
          <div>
            <small>DEADLINE</small>
            <b>{date(rfq.deadline)}</b>
          </div>
        </div>
        <h4>Requirement details</h4>
        <p>{rfq.description}</p>
        <footer>
          {buyer ? (
            <button className="outline" onClick={close}>
              Close
            </button>
          ) : (
            <button className="primary" onClick={quote}>
              Submit quotation →
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
const Field = ({ label, area, ...props }) => (
  <label className="field">
    <b>{label}</b>
    {area ? <textarea {...props} /> : <input {...props} />}
  </label>
);
function Form({ title, sub, close, children }) {
  return (
    <div className="backdrop modal-bg" onClick={close}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => e.preventDefault()}
      >
        <button type="button" className="x" onClick={close}>
          ×
        </button>
        <h2>{title}</h2>
        <p>{sub}</p>
        {children}
      </form>
    </div>
  );
}
function RfqForm({ close, submit }) {
  const [d, setD] = useState({
      title: "",
      quantity: "",
      unit: "units",
      location: "",
      deadline: "",
      description: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await submit({ ...d, quantity: Number(d.quantity) });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Form
      title="Create a new RFQ"
      sub="Share your requirement with verified suppliers."
      close={close}
    >
      <div className="fields">
        <Field
          label="Product or service name"
          required
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
        />
        <Field
          label="Quantity"
          type="number"
          required
          value={d.quantity}
          onChange={(e) => setD({ ...d, quantity: e.target.value })}
        />
        <Field
          label="Delivery location"
          required
          value={d.location}
          onChange={(e) => setD({ ...d, location: e.target.value })}
        />
        <Field
          label="Response deadline"
          type="date"
          required
          value={d.deadline}
          onChange={(e) => setD({ ...d, deadline: e.target.value })}
        />
      </div>
      <Field
        label="Requirement description"
        area
        required
        value={d.description}
        onChange={(e) => setD({ ...d, description: e.target.value })}
      />
      {error && <p className="form-error">{error}</p>}
      <footer>
        <button type="button" className="plain" onClick={close}>
          Cancel
        </button>
        <button className="primary" disabled={busy} onClick={send}>
          Publish RFQ →
        </button>
      </footer>
    </Form>
  );
}
function QuoteForm({ close, submit }) {
  const [d, setD] = useState({ price: "", deliveryDays: "", message: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await submit({
        ...d,
        price: Number(d.price),
        deliveryDays: Number(d.deliveryDays),
      });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Form
      title="Submit your quotation"
      sub="Provide a competitive, clear offer to the buyer."
      close={close}
    >
      <div className="fields">
        <Field
          label="Quoted price (INR)"
          type="number"
          required
          value={d.price}
          onChange={(e) => setD({ ...d, price: e.target.value })}
        />
        <Field
          label="Estimated delivery (days)"
          type="number"
          required
          value={d.deliveryDays}
          onChange={(e) => setD({ ...d, deliveryDays: e.target.value })}
        />
      </div>
      <Field
        label="Message to buyer"
        area
        required
        value={d.message}
        onChange={(e) => setD({ ...d, message: e.target.value })}
      />
      {error && <p className="form-error">{error}</p>}
      <footer>
        <button type="button" className="plain" onClick={close}>
          Cancel
        </button>
        <button className="primary" disabled={busy} onClick={send}>
          Submit quotation →
        </button>
      </footer>
    </Form>
  );
}
export default App;
