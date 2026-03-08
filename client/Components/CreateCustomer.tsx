import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000/customers";

type PaymentMethod = "card" | "upi" | "wallet" | "netbanking";
type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type AddressLabel = "Home" | "Work" | "Other";
type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";
type AccountStatus = "active" | "suspended" | "deactivated";

interface FormErrors {
  [key: string]: string;
}

const DIETARY_OPTIONS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "halal",
  "kosher",
  "dairy-free",
  "nut-free",
];
const CATEGORY_OPTIONS = [
  "dairy",
  "bakery",
  "beverages",
  "fruits & vegetables",
  "meat & seafood",
  "snacks",
  "frozen",
  "household",
  "personal care",
];

const CreateCustomer = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Personal Info ──────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [profilePhoto, setProfilePhoto] = useState("");

  // ── Contact ────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // ── Address ────────────────────────────────────────────
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");

  // ── Loyalty ────────────────────────────────────────────
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>("Bronze");
  const [loyaltyCardNumber, setLoyaltyCardNumber] = useState("");

  // ── Preferences ────────────────────────────────────────
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [preferredPayment, setPreferredPayment] =
    useState<PaymentMethod>("upi");
  const [language, setLanguage] = useState("en");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [pushOptIn, setPushOptIn] = useState(true);

  // ── Account ────────────────────────────────────────────
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [accountNotes, setAccountNotes] = useState("");

  const toggleArrayItem = (
    arr: string[],
    item: string,
    setArr: (v: string[]) => void,
  ) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Enter a valid email";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-]{8,15}$/.test(phone))
      newErrors.phone = "Enter a valid phone number";
    if (!street.trim()) newErrors.street = "Street address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{5,6}$/.test(pincode))
      newErrors.pincode = "Enter a valid pincode";
    if (!country.trim()) newErrors.country = "Country is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const errorKeys = Object.keys(errors);
      if (
        ["firstName", "lastName", "dateOfBirth", "gender"].some((k) =>
          errorKeys.includes(k),
        )
      )
        setActiveSection(0);
      else if (["email", "phone"].some((k) => errorKeys.includes(k)))
        setActiveSection(1);
      else if (
        ["street", "city", "state", "pincode", "country"].some((k) =>
          errorKeys.includes(k),
        )
      )
        setActiveSection(2);
      return;
    }

    setIsSubmitting(true);

    const customer = {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || undefined,
      gender,
      profilePhoto: profilePhoto || undefined,
      contact: { email, phone, whatsapp: whatsapp || undefined },
      addresses: [
        {
          label: addressLabel,
          street,
          city,
          state,
          pincode,
          country,
          isDefault: true,
        },
      ],
      loyalty: {
        tier: loyaltyTier,
        cardNumber: loyaltyCardNumber || undefined,
      },
      preferences: {
        dietaryTags,
        favoriteCategories,
        preferredPaymentMethod: preferredPayment,
        language,
        newsletterOptIn,
        smsOptIn,
        pushNotificationsOptIn: pushOptIn,
      },
      account: {
        status: accountStatus,
        notes: accountNotes || undefined,
      },
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      if (response.ok) {
        alert("Customer created successfully!");
        navigate("/customers");
      } else {
        const data = await response.json();
        alert(data.message || "Error creating customer");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    "Personal",
    "Contact",
    "Address",
    "Loyalty & Prefs",
    "Account",
  ];

  const inputCls = (field: string) =>
    `erp-input${errors[field] ? " border-red-500 bg-red-50" : ""}`;

  return (
    <div className="container py-4">
      <style>{`
        :root {
          --clr-bg: #f5f6fa;
          --clr-card: #ffffff;
          --clr-primary: #2563eb;
          --clr-primary-light: #eff6ff;
          --clr-secondary: #64748b;
          --clr-danger: #ef4444;
          --clr-success: #22c55e;
          --clr-border: #e2e8f0;
          --clr-text: #1e293b;
          --clr-muted: #94a3b8;
          --radius: 10px;
        }
        .erp-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; }
        .erp-page-title { font-size:1.5rem; font-weight:700; color:var(--clr-text); margin:0; }
        .erp-card { background:var(--clr-card); border:1px solid var(--clr-border); border-radius:var(--radius); box-shadow:0 1px 4px rgba(0,0,0,.06); overflow:hidden; }
        .erp-card-header { padding:1rem 1.5rem; border-bottom:1px solid var(--clr-border); background:#fafbfc; }
        .erp-card-title { font-size:1rem; font-weight:600; color:var(--clr-text); margin:0; }
        .erp-card-body { padding:1.5rem; }
        .erp-form-group { margin-bottom:1.25rem; }
        .erp-form-label { display:block; font-size:.8125rem; font-weight:600; color:var(--clr-text); margin-bottom:.375rem; letter-spacing:.01em; }
        .erp-input { display:block; width:100%; padding:.5rem .75rem; border:1.5px solid var(--clr-border); border-radius:7px; font-size:.9rem; color:var(--clr-text); background:#fff; transition:border-color .15s; outline:none; box-sizing:border-box; }
        .erp-input:focus { border-color:var(--clr-primary); box-shadow:0 0 0 3px rgba(37,99,235,.1); }
        .erp-input.border-red-500 { border-color:var(--clr-danger) !important; }
        .erp-input.bg-red-50 { background:#fff5f5 !important; }
        .erp-form-actions { display:flex; gap:.75rem; justify-content:flex-end; padding-top:1.25rem; border-top:1px solid var(--clr-border); margin-top:1.5rem; }
        .btn { padding:.5rem 1.25rem; border-radius:7px; font-size:.875rem; font-weight:600; cursor:pointer; border:none; transition:all .15s; }
        .btn-erp-primary { background:var(--clr-primary); color:#fff; }
        .btn-erp-primary:hover:not(:disabled) { background:#1d4ed8; }
        .btn-erp-primary:disabled { opacity:.6; cursor:not-allowed; }
        .btn-erp-secondary { background:#fff; color:var(--clr-secondary); border:1.5px solid var(--clr-border); }
        .btn-erp-secondary:hover { background:#f1f5f9; }
        .required { color:var(--clr-danger); margin-left:2px; }
        .error-msg { color:var(--clr-danger); font-size:.75rem; margin-top:.25rem; display:flex; align-items:center; gap:.25rem; }
        .section-tabs { display:flex; gap:0; border-bottom:2px solid var(--clr-border); margin-bottom:1.5rem; overflow-x:auto; }
        .section-tab { padding:.625rem 1rem; font-size:.8125rem; font-weight:600; color:var(--clr-secondary); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; white-space:nowrap; background:none; border-top:none; border-left:none; border-right:none; transition:all .15s; }
        .section-tab.active { color:var(--clr-primary); border-bottom-color:var(--clr-primary); }
        .section-tab:hover:not(.active) { color:var(--clr-text); }
        .tag-grid { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.375rem; }
        .tag-chip { padding:.3rem .75rem; border-radius:20px; font-size:.775rem; font-weight:500; cursor:pointer; border:1.5px solid var(--clr-border); background:#fff; color:var(--clr-secondary); transition:all .15s; user-select:none; }
        .tag-chip.selected { border-color:var(--clr-primary); background:var(--clr-primary-light); color:var(--clr-primary); }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:.625rem 0; border-bottom:1px solid var(--clr-border); }
        .toggle-row:last-child { border-bottom:none; }
        .toggle-label { font-size:.875rem; color:var(--clr-text); font-weight:500; }
        .toggle-sub { font-size:.75rem; color:var(--clr-muted); }
        .toggle { position:relative; width:40px; height:22px; flex-shrink:0; }
        .toggle input { opacity:0; width:0; height:0; }
        .toggle-slider { position:absolute; inset:0; background:#cbd5e1; border-radius:22px; cursor:pointer; transition:.2s; }
        .toggle-slider:before { content:''; position:absolute; width:16px; height:16px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.2s; }
        input:checked + .toggle-slider { background:var(--clr-primary); }
        input:checked + .toggle-slider:before { transform:translateX(18px); }
        .hint { font-size:.75rem; color:var(--clr-muted); margin-top:.25rem; }
        .section-panel { display:none; }
        .section-panel.active { display:block; }
        .nav-btns { display:flex; justify-content:space-between; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--clr-border); }
        .progress-bar { height:3px; background:var(--clr-border); border-radius:2px; margin-bottom:1.5rem; overflow:hidden; }
        .progress-fill { height:100%; background:var(--clr-primary); border-radius:2px; transition:width .3s ease; }
        select.erp-input { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .75rem center; padding-right:2.25rem; cursor:pointer; }
        .row { display:flex; flex-wrap:wrap; gap:0 1rem; }
        .col-md-6 { flex:1; min-width:200px; }
        .col-md-4 { flex:1; min-width:160px; }
        .col-md-12 { flex:0 0 100%; }
        @media(max-width:600px) { .col-md-6, .col-md-4 { flex:0 0 100%; } }
      `}</style>

      <div className="erp-page-header">
        <h2 className="erp-page-title">New Customer</h2>
        <span style={{ fontSize: ".8125rem", color: "var(--clr-muted)" }}>
          Fields marked <span style={{ color: "var(--clr-danger)" }}>*</span>{" "}
          are required
        </span>
      </div>

      <div className="erp-card">
        <div className="erp-card-header">
          <h4 className="erp-card-title">Customer Registration</h4>
        </div>
        <div className="erp-card-body">
          {/* Progress */}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((activeSection + 1) / sections.length) * 100}%`,
              }}
            />
          </div>

          {/* Section Tabs */}
          <div className="section-tabs">
            {sections.map((s, i) => (
              <button
                key={s}
                className={`section-tab${activeSection === i ? " active" : ""}`}
                onClick={() => setActiveSection(i)}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>

          <form onSubmit={addCustomer} noValidate>
            {/* ── SECTION 0: Personal ─────────────────────────── */}
            <div
              className={`section-panel${activeSection === 0 ? " active" : ""}`}
            >
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    First Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("firstName")}
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  {errors.firstName && (
                    <div className="error-msg">⚠ {errors.firstName}</div>
                  )}
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    Last Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("lastName")}
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  {errors.lastName && (
                    <div className="error-msg">⚠ {errors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Gender</label>
                  <select
                    className="erp-input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                  >
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">Profile Photo URL</label>
                <input
                  type="url"
                  className="erp-input"
                  placeholder="https://example.com/photo.jpg"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                />
                <div className="hint">Optional — paste a public image URL</div>
              </div>
            </div>

            {/* ── SECTION 1: Contact ──────────────────────────── */}
            <div
              className={`section-panel${activeSection === 1 ? " active" : ""}`}
            >
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  className={inputCls("email")}
                  placeholder="jane.doe@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && (
                  <div className="error-msg">⚠ {errors.email}</div>
                )}
              </div>
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    className={inputCls("phone")}
                    placeholder="+91-9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {errors.phone && (
                    <div className="error-msg">⚠ {errors.phone}</div>
                  )}
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">WhatsApp Number</label>
                  <input
                    type="tel"
                    className="erp-input"
                    placeholder="+91-9876543210 (if different)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                  <div className="hint">Leave blank if same as phone</div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Address ──────────────────────────── */}
            <div
              className={`section-panel${activeSection === 2 ? " active" : ""}`}
            >
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    Address Label <span className="required">*</span>
                  </label>
                  <select
                    className="erp-input"
                    value={addressLabel}
                    onChange={(e) =>
                      setAddressLabel(e.target.value as AddressLabel)
                    }
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Street Address <span className="required">*</span>
                </label>
                <textarea
                  className={inputCls("street")}
                  placeholder="12, MG Road, Near City Mall"
                  rows={3}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  style={{ resize: "vertical" }}
                />
                {errors.street && (
                  <div className="error-msg">⚠ {errors.street}</div>
                )}
              </div>
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    City <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("city")}
                    placeholder="Mangaluru"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  {errors.city && (
                    <div className="error-msg">⚠ {errors.city}</div>
                  )}
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    State <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("state")}
                    placeholder="Karnataka"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                  {errors.state && (
                    <div className="error-msg">⚠ {errors.state}</div>
                  )}
                </div>
              </div>
              <div className="row">
                <div className="col-md-4 erp-form-group">
                  <label className="erp-form-label">
                    Pincode <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("pincode")}
                    placeholder="575001"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                  {errors.pincode && (
                    <div className="error-msg">⚠ {errors.pincode}</div>
                  )}
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">
                    Country <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls("country")}
                    placeholder="India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                  {errors.country && (
                    <div className="error-msg">⚠ {errors.country}</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECTION 3: Loyalty & Preferences ───────────── */}
            <div
              className={`section-panel${activeSection === 3 ? " active" : ""}`}
            >
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Loyalty Tier</label>
                  <select
                    className="erp-input"
                    value={loyaltyTier}
                    onChange={(e) =>
                      setLoyaltyTier(e.target.value as LoyaltyTier)
                    }
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Loyalty Card Number</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="LYL-2024-XXXXX"
                    value={loyaltyCardNumber}
                    onChange={(e) => setLoyaltyCardNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">Dietary Preferences</label>
                <div className="tag-grid">
                  {DIETARY_OPTIONS.map((tag) => (
                    <span
                      key={tag}
                      className={`tag-chip${dietaryTags.includes(tag) ? " selected" : ""}`}
                      onClick={() =>
                        toggleArrayItem(dietaryTags, tag, setDietaryTags)
                      }
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">Favourite Categories</label>
                <div className="tag-grid">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <span
                      key={cat}
                      className={`tag-chip${favoriteCategories.includes(cat) ? " selected" : ""}`}
                      onClick={() =>
                        toggleArrayItem(
                          favoriteCategories,
                          cat,
                          setFavoriteCategories,
                        )
                      }
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Preferred Payment</label>
                  <select
                    className="erp-input"
                    value={preferredPayment}
                    onChange={(e) =>
                      setPreferredPayment(e.target.value as PaymentMethod)
                    }
                  >
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="wallet">Wallet</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>
                <div className="col-md-6 erp-form-group">
                  <label className="erp-form-label">Preferred Language</label>
                  <select
                    className="erp-input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="kn">Kannada</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="ml">Malayalam</option>
                  </select>
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Communication Preferences
                </label>
                <div
                  style={{
                    border: "1.5px solid var(--clr-border)",
                    borderRadius: 8,
                    padding: "0 1rem",
                    marginTop: ".375rem",
                  }}
                >
                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Email Newsletter</div>
                      <div className="toggle-sub">
                        Promotions, offers & news
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">SMS Alerts</div>
                      <div className="toggle-sub">
                        Order updates & deals via SMS
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={smsOptIn}
                        onChange={(e) => setSmsOptIn(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Push Notifications</div>
                      <div className="toggle-sub">
                        App alerts for orders & offers
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={pushOptIn}
                        onChange={(e) => setPushOptIn(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 4: Account ──────────────────────────── */}
            <div
              className={`section-panel${activeSection === 4 ? " active" : ""}`}
            >
              <div className="erp-form-group">
                <label className="erp-form-label">Account Status</label>
                <select
                  className="erp-input"
                  value={accountStatus}
                  onChange={(e) =>
                    setAccountStatus(e.target.value as AccountStatus)
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                </select>
                <div className="hint">
                  Controls whether this customer is visible and usable across
                  the system.
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">Internal Notes</label>
                <textarea
                  className="erp-input"
                  placeholder="Any internal remarks about this customer (visible to staff only)..."
                  rows={4}
                  value={accountNotes}
                  onChange={(e) => setAccountNotes(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            {/* ── Navigation Buttons ──────────────────────────── */}
            <div className="nav-btns">
              <button
                type="button"
                className="btn btn-erp-secondary"
                onClick={() =>
                  activeSection === 0
                    ? navigate("/")
                    : setActiveSection((s) => s - 1)
                }
              >
                {activeSection === 0 ? "Cancel" : "← Back"}
              </button>
              {activeSection < sections.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-erp-primary"
                  onClick={() => setActiveSection((s) => s + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-erp-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "✓ Save Customer"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomer;
