import mongoose from "mongoose";
import bcrypt from "bcrypt";

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, required: true, default: "India" },
  isDefault: { type: Boolean, default: false },
});

const customerSchema = new mongoose.Schema(
  {
    // ── Personal ─────────────────────────────────────────
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    profilePhoto: { type: String },

    // ── Contact ──────────────────────────────────────────
    contact: {
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      phone: { type: String, required: true },
      whatsapp: { type: String },
    },

    // ── Addresses ────────────────────────────────────────
    addresses: { type: [addressSchema], default: [] },

    // ── Loyalty ──────────────────────────────────────────
    loyalty: {
      tier: {
        type: String,
        enum: ["Bronze", "Silver", "Gold", "Platinum"],
        default: "Bronze",
      },
      points: { type: Number, default: 0 },
      cardNumber: { type: String },
    },

    // ── Preferences ──────────────────────────────────────
    preferences: {
      dietaryTags: { type: [String], default: [] },
      favoriteCategories: { type: [String], default: [] },
      preferredPaymentMethod: { type: String, default: "upi" },
      language: { type: String, default: "en" },
      newsletterOptIn: { type: Boolean, default: false },
      smsOptIn: { type: Boolean, default: false },
      pushNotificationsOptIn: { type: Boolean, default: true },
    },

    // ── Account ──────────────────────────────────────────
    account: {
      status: {
        type: String,
        enum: ["active", "suspended", "deactivated"],
        default: "active",
      },
      authProvider: {
        type: String,
        enum: ["email", "google", "facebook", "phone"],
        default: "email",
      },
      isEmailVerified: { type: Boolean, default: false },
      isPhoneVerified: { type: Boolean, default: false },
      lastLoginAt: { type: Date },
      passwordHash: { type: String }, // bcrypt hash only — never plain text
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
customerSchema.index({ "contact.email": 1 }, { unique: true });
customerSchema.index({ "contact.phone": 1 });
customerSchema.index({ "account.status": 1 });

// ── Virtual: fullName ─────────────────────────────────────────────────────────
customerSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save: hash password ───────────────────────────────────────────────────
customerSchema.pre("save", async function (next) {
  if (this._plainPassword) {
    this.account.passwordHash = await bcrypt.hash(this._plainPassword, 12);
    delete this._plainPassword;
  }
  next();
});

export default mongoose.model("Customer", customerSchema);
