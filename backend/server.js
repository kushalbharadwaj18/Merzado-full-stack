import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import dns from "dns";
dns.setServers(["8.8.8.8"]);
const app = express();
app.use(cors());
app.use(express.json());
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["buyer", "supplier"], required: true },
    },
    { timestamps: true },
  ),
);
const Rfq = mongoose.model(
  "Rfq",
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unit: String,
      location: { type: String, required: true },
      deadline: { type: Date, required: true },
      status: { type: String, default: "open" },
      buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    { timestamps: true },
  ),
);
const Quote = mongoose.model(
  "Quote",
  new mongoose.Schema(
    {
      rfq: { type: mongoose.Schema.Types.ObjectId, ref: "Rfq" },
      supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      price: { type: Number, min: 1 },
      deliveryDays: { type: Number, min: 1 },
      message: { type: String, maxlength: 1000 },
    },
    { timestamps: true },
  ),
);
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(
      req.headers.authorization?.replace("Bearer ", ""),
      process.env.JWT_SECRET,
    );
    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
};
const role = (x) => (req, res, next) =>
  req.user.role === x
    ? next()
    : res.status(403).json({ message: "Insufficient permissions" });
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
app.get("/api/health", (q, s) => s.json({ ok: true }));
app.post("/api/auth/register", async (q, s, n) => {
  try {
    let { name, email, password, role } = q.body;
    if (
      !name ||
      !email ||
      password?.length < 8 ||
      !["buyer", "supplier"].includes(role)
    )
      return s
        .status(400)
        .json({
          message: "Valid name, email, 8-character password and role required",
        });
    let u = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
    });
    s.status(201).json({
      token: sign(u),
      user: { id: u._id, name, role, email },
    });
  } catch (e) {
    n(e);
  }
});
app.post("/api/auth/login", async (q, s, n) => {
  try {
    let u = await User.findOne({ email: q.body.email?.toLowerCase() });
    if (!u || !(await bcrypt.compare(q.body.password || "", u.password)))
      return s.status(401).json({ message: "Invalid email or password" });
    s.json({
      token: sign(u),
      user: { id: u._id, name: u.name, role: u.role, email: u.email },
    });
  } catch (e) {
    n(e);
  }
});
app.get("/api/rfqs", auth, async (q, s, n) => {
  try {
    let f = q.user.role === "buyer" ? { buyer: q.user.id } : { status: "open" };
    if (q.query.search)
      f.$or = ["title", "description", "location"].map((k) => ({
        [k]: { $regex: q.query.search, $options: "i" },
      }));
    s.json(await Rfq.find(f).populate("buyer", "name").sort({ createdAt: -1 }));
  } catch (e) {
    n(e);
  }
});
app.post("/api/rfqs", auth, role("buyer"), async (q, s, n) => {
  try {
    let { title, description, quantity, location, deadline } = q.body;
    if (
      !title ||
      !description ||
      !quantity ||
      !location ||
      !deadline ||
      new Date(deadline) <= new Date()
    )
      return s
        .status(400)
        .json({
          message: "Complete RFQ data and a future deadline are required",
        });
    s.status(201).json(await Rfq.create({ ...q.body, buyer: q.user.id }));
  } catch (e) {
    n(e);
  }
});
app.patch("/api/rfqs/:id", auth, role("buyer"), async (q, s, n) => {
  try {
    let r = await Rfq.findOneAndUpdate(
      { _id: q.params.id, buyer: q.user.id },
      q.body,
      { new: true, runValidators: true },
    );
    r ? s.json(r) : s.status(404).json({ message: "RFQ not found" });
  } catch (e) {
    n(e);
  }
});
app.get("/api/quotes", auth, async (q, s, n) => {
  try {
    let f =
      q.user.role === "supplier"
        ? { supplier: q.user.id }
        : {
            rfq: { $in: await Rfq.find({ buyer: q.user.id }).distinct("_id") },
          };
    s.json(
      await Quote.find(f).populate("rfq").populate("supplier", "name email"),
    );
  } catch (e) {
    n(e);
  }
});
app.post("/api/rfqs/:id/quotes", auth, role("supplier"), async (q, s, n) => {
  try {
    let { price, deliveryDays, message } = q.body;
    if (!price || !deliveryDays || !message)
      return s
        .status(400)
        .json({ message: "Price, delivery time and message are required" });
    let r = await Rfq.findOne({ _id: q.params.id, status: "open" });
    if (!r) return s.status(404).json({ message: "Open RFQ not found" });
    if (await Quote.findOne({ rfq: r._id, supplier: q.user.id }))
      return s.status(409).json({ message: "You already quoted for this RFQ" });
    s.status(201).json(
      await Quote.create({
        rfq: r._id,
        supplier: q.user.id,
        price,
        deliveryDays,
        message,
      }),
    );
  } catch (e) {
    n(e);
  }
});
app.use((e, q, s, n) => {
  console.error(e);
  s.status(e.code === 11000 ? 409 : 500).json({
    message: e.code === 11000 ? "Email already registered" : "Server error",
  });
});
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() =>
    app.listen(process.env.PORT || 5000, () => console.log("API ready")),
  )
  .catch((e) => console.error("MongoDB:", e));
