import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000/customers";

type AccountStatus = "active" | "suspended" | "deactivated";
type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  contact: {
    email?: string;
    phone: string;
    whatsapp?: string;
  };
  addresses?: {
    label: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
  }[];
  loyalty?: {
    tier: LoyaltyTier;
    points: number;
    cardNumber?: string;
  };
  account: {
    status: AccountStatus;
    notes?: string;
  };
  createdAt: string;
}

const TIER_COLORS: Record<
  LoyaltyTier,
  { bg: string; text: string; border: string }
> = {
  Bronze: { bg: "#fdf4ec", text: "#92400e", border: "#f59e0b" },
  Silver: { bg: "#f1f5f9", text: "#475569", border: "#94a3b8" },
  Gold: { bg: "#fefce8", text: "#854d0e", border: "#eab308" },
  Platinum: { bg: "#f0f9ff", text: "#0c4a6e", border: "#38bdf8" },
};

const STATUS_COLORS: Record<
  AccountStatus,
  { bg: string; text: string; dot: string }
> = {
  active: { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  suspended: { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  deactivated: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
};

const CustomerList = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filters ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  // ── Pagination ────────────────────────────────────────
  const [page, setPage] = useState(1);
  const limit = 10;

  // ── Selection ─────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Delete confirm ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`${API_URL}?${params}`);
      const data = await res.json();
      if (data.success) {
        let list: Customer[] = data.data;
        // client-side tier filter (backend doesn't support it yet)
        if (tierFilter)
          list = list.filter((c) => c.loyalty?.tier === tierFilter);
        setCustomers(list);
        setTotal(tierFilter ? list.length : data.total);
      } else {
        setError(data.message || "Failed to load customers");
      }
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        fetchCustomers();
      } else {
        alert(data.message || "Delete failed");
      }
    } catch {
      alert("Failed to connect to the server");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} customer(s)?`)) return;
    await Promise.all(
      [...selected].map((id) =>
        fetch(`${API_URL}/${id}`, { method: "DELETE" }),
      ),
    );
    setSelected(new Set());
    fetchCustomers();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((c) => c._id)));
  };

  const defaultAddress = (c: Customer) =>
    c.addresses?.find((a) => a.isDefault) ?? c.addresses?.[0];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="cl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .cl-root {
          font-family: 'DM Sans', sans-serif;
          background: #f8f9fb;
          min-height: 100vh;
          padding: 2rem;
          color: #1a1d23;
        }

        /* ── Header ── */
        .cl-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.75rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .cl-title-group h1 {
          font-size: 1.625rem;
          font-weight: 700;
          margin: 0 0 .2rem;
          letter-spacing: -.02em;
        }
        .cl-title-group p {
          font-size: .85rem;
          color: #64748b;
          margin: 0;
        }
        .cl-header-actions { display: flex; gap: .625rem; align-items: center; flex-wrap: wrap; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex; align-items: center; gap: .375rem;
          padding: .5rem 1rem; border-radius: 8px; font-size: .8125rem;
          font-weight: 600; cursor: pointer; border: none;
          font-family: 'DM Sans', sans-serif; transition: all .15s; white-space: nowrap;
        }
        .btn-primary   { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #e2e8f0; }
        .btn-secondary:hover { background: #f8fafc; }
        .btn-danger    { background: #fff; color: #dc2626; border: 1.5px solid #fecaca; }
        .btn-danger:hover { background: #fef2f2; }
        .btn-icon      { padding: .4rem .6rem; }
        .btn:disabled  { opacity: .5; cursor: not-allowed; }

        /* ── Toolbar ── */
        .cl-toolbar {
          display: flex; gap: .75rem; margin-bottom: 1rem;
          flex-wrap: wrap; align-items: center;
        }
        .cl-search-wrap {
          position: relative; flex: 1; min-width: 220px; max-width: 380px;
        }
        .cl-search-icon {
          position: absolute; left: .75rem; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none;
        }
        .cl-search {
          width: 100%; padding: .5rem .75rem .5rem 2.25rem;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-size: .875rem; font-family: 'DM Sans', sans-serif;
          background: #fff; outline: none; box-sizing: border-box; color: #1a1d23;
          transition: border-color .15s;
        }
        .cl-search:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        .cl-search::placeholder { color: #94a3b8; }

        .cl-select {
          padding: .5rem .75rem; border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-size: .8125rem; font-family: 'DM Sans', sans-serif; background: #fff;
          color: #374151; outline: none; cursor: pointer; transition: border-color .15s;
        }
        .cl-select:focus { border-color: #2563eb; }

        .cl-toolbar-right { display: flex; gap: .625rem; margin-left: auto; align-items: center; }

        /* ── Stats row ── */
        .cl-stats {
          display: flex; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;
        }
        .cl-stat {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
          padding: .75rem 1.25rem; display: flex; align-items: center; gap: .75rem;
          flex: 1; min-width: 140px;
        }
        .cl-stat-icon {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
        }
        .cl-stat-val { font-size: 1.25rem; font-weight: 700; line-height: 1; }
        .cl-stat-lbl { font-size: .75rem; color: #64748b; margin-top: .15rem; }

        /* ── Card / Table ── */
        .cl-card {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        .cl-table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f8f9fb; border-bottom: 2px solid #e2e8f0; }
        th {
          padding: .75rem 1rem; text-align: left; font-size: .75rem;
          font-weight: 700; color: #64748b; letter-spacing: .06em;
          text-transform: uppercase; white-space: nowrap;
        }
        th.center { text-align: center; }
        tbody tr {
          border-bottom: 1px solid #f1f5f9; transition: background .1s;
        }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #f8faff; }
        tbody tr.selected-row { background: #eff6ff; }
        td { padding: .75rem 1rem; font-size: .875rem; vertical-align: middle; }
        td.center { text-align: center; }

        /* ── Avatar ── */
        .cl-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem; font-weight: 700; flex-shrink: 0;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1d4ed8; border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
        }
        .cl-name-cell { display: flex; align-items: center; gap: .625rem; }
        .cl-name { font-weight: 600; color: #1a1d23; line-height: 1.2; }
        .cl-email { font-size: .75rem; color: #94a3b8; font-family: 'DM Mono', monospace; }

        /* ── Badges ── */
        .badge {
          display: inline-flex; align-items: center; gap: .3rem;
          padding: .25rem .625rem; border-radius: 20px;
          font-size: .7rem; font-weight: 600; border: 1px solid;
          white-space: nowrap;
        }
        .badge-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }

        /* ── Phone ── */
        .cl-phone {
          font-family: 'DM Mono', monospace; font-size: .8125rem; color: #374151;
        }

        /* ── Location ── */
        .cl-location { font-size: .8125rem; color: #64748b; }

        /* ── Row actions ── */
        .cl-actions { display: flex; gap: .375rem; justify-content: flex-end; }

        /* ── Checkbox ── */
        input[type="checkbox"] {
          width: 15px; height: 15px; cursor: pointer; accent-color: #2563eb;
        }

        /* ── Empty / Loading / Error ── */
        .cl-empty {
          text-align: center; padding: 4rem 2rem; color: #94a3b8;
        }
        .cl-empty-icon { font-size: 2.5rem; margin-bottom: .75rem; }
        .cl-empty h3 { font-size: 1rem; color: #64748b; margin: 0 0 .375rem; }
        .cl-empty p  { font-size: .875rem; margin: 0; }

        .cl-loading {
          display: flex; align-items: center; justify-content: center;
          padding: 4rem; gap: .75rem; color: #64748b;
        }
        .cl-spinner {
          width: 20px; height: 20px; border: 2.5px solid #e2e8f0;
          border-top-color: #2563eb; border-radius: 50;
          animation: spin .7s linear infinite; border-radius: 50%;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .cl-error {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
          padding: 1rem 1.25rem; color: #dc2626; font-size: .875rem;
          margin-bottom: 1rem; display: flex; align-items: center; gap: .5rem;
        }

        /* ── Pagination ── */
        .cl-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: .875rem 1.25rem; border-top: 1px solid #f1f5f9;
          flex-wrap: wrap; gap: .5rem;
        }
        .cl-page-info { font-size: .8125rem; color: #64748b; }
        .cl-page-btns { display: flex; gap: .375rem; align-items: center; }
        .cl-page-btn {
          width: 32px; height: 32px; border-radius: 7px; border: 1.5px solid #e2e8f0;
          background: #fff; font-size: .8125rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; color: #374151; transition: all .15s;
        }
        .cl-page-btn:hover:not(:disabled) { border-color: #2563eb; color: #2563eb; }
        .cl-page-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
        .cl-page-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Bulk bar ── */
        .cl-bulk-bar {
          background: #1e3a8a; color: #fff; border-radius: 10px;
          padding: .625rem 1rem; display: flex; align-items: center;
          gap: 1rem; margin-bottom: 1rem; font-size: .875rem;
        }
        .cl-bulk-bar strong { font-weight: 700; }

        /* ── Delete modal ── */
        .cl-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1rem;
        }
        .cl-modal {
          background: #fff; border-radius: 14px; padding: 1.75rem;
          max-width: 420px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }
        .cl-modal h3 { margin: 0 0 .5rem; font-size: 1.125rem; }
        .cl-modal p  { margin: 0 0 1.5rem; color: #64748b; font-size: .9rem; line-height: 1.5; }
        .cl-modal-actions { display: flex; gap: .625rem; justify-content: flex-end; }

        /* ── Selected count chip ── */
        .cl-sel-chip {
          background: #dbeafe; color: #1d4ed8; border-radius: 6px;
          padding: .2rem .5rem; font-size: .75rem; font-weight: 700;
        }

        @media (max-width: 768px) {
          .cl-root { padding: 1rem; }
          .cl-stats { display: none; }
          .cl-header { flex-direction: column; }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="cl-header">
        <div className="cl-title-group">
          <h1>Customers</h1>
          <p>
            {total} customer{total !== 1 ? "s" : ""} in the system
          </p>
        </div>
        <div className="cl-header-actions">
          <button className="btn btn-secondary" onClick={fetchCustomers}>
            ↻ Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/customers/new")}
          >
            + New Customer
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="cl-stats">
        {[
          {
            icon: "👥",
            val: total,
            lbl: "Total",
            bg: "#eff6ff",
            color: "#2563eb",
          },
          {
            icon: "✅",
            val: customers.filter((c) => c.account.status === "active").length,
            lbl: "Active",
            bg: "#f0fdf4",
            color: "#16a34a",
          },
          {
            icon: "⏸",
            val: customers.filter((c) => c.account.status === "suspended")
              .length,
            lbl: "Suspended",
            bg: "#fffbeb",
            color: "#d97706",
          },
          {
            icon: "🏆",
            val: customers.filter(
              (c) =>
                c.loyalty?.tier === "Gold" || c.loyalty?.tier === "Platinum",
            ).length,
            lbl: "Gold+",
            bg: "#fefce8",
            color: "#ca8a04",
          },
        ].map((s) => (
          <div className="cl-stat" key={s.lbl}>
            <div
              className="cl-stat-icon"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <div>
              <div className="cl-stat-val">{s.val}</div>
              <div className="cl-stat-lbl">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Error ───────────────────────────────────────── */}
      {error && <div className="cl-error">⚠ {error}</div>}

      {/* ── Bulk action bar ─────────────────────────────── */}
      {selected.size > 0 && (
        <div className="cl-bulk-bar">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <button
            className="btn btn-danger"
            style={{
              background: "transparent",
              border: "1.5px solid #fca5a5",
              color: "#fca5a5",
            }}
            onClick={handleDeleteSelected}
          >
            🗑 Delete Selected
          </button>
          <button
            className="btn"
            style={{
              background: "transparent",
              border: "1.5px solid rgba(255,255,255,.3)",
              color: "#fff",
              marginLeft: "auto",
            }}
            onClick={() => setSelected(new Set())}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="cl-toolbar">
        <div className="cl-search-wrap">
          <span className="cl-search-icon">🔍</span>
          <input
            className="cl-search"
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="cl-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>

        <select
          className="cl-select"
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Tiers</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>

        {(searchInput || statusFilter || tierFilter) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchInput("");
              setStatusFilter("");
              setTierFilter("");
              setPage(1);
            }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* ── Table Card ──────────────────────────────────── */}
      <div className="cl-card">
        {loading ? (
          <div className="cl-loading">
            <div className="cl-spinner" /> Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-icon">🧾</div>
            <h3>No customers found</h3>
            <p>
              {search || statusFilter || tierFilter
                ? "Try adjusting your filters."
                : "Get started by adding your first customer."}
            </p>
            {!search && !statusFilter && !tierFilter && (
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={() => navigate("/customers/new")}
              >
                + Add First Customer
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="cl-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={
                          selected.size === customers.length &&
                          customers.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th className="center">Loyalty</th>
                    <th className="center">Status</th>
                    <th>Joined</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const addr = defaultAddress(c);
                    const initials =
                      `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
                    const tier = c.loyalty?.tier ?? "Bronze";
                    const status = c.account.status;
                    const tierStyle = TIER_COLORS[tier];
                    const statusStyle = STATUS_COLORS[status];
                    const joined = new Date(c.createdAt).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    );

                    return (
                      <tr
                        key={c._id}
                        className={selected.has(c._id) ? "selected-row" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(c._id)}
                            onChange={() => toggleSelect(c._id)}
                          />
                        </td>

                        {/* Name + email */}
                        <td>
                          <div className="cl-name-cell">
                            <div className="cl-avatar">{initials}</div>
                            <div>
                              <div className="cl-name">
                                {c.firstName} {c.lastName}
                              </div>
                              <div className="cl-email">
                                {c.contact.email || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td>
                          <span className="cl-phone">{c.contact.phone}</span>
                        </td>

                        {/* Location */}
                        <td>
                          <span className="cl-location">
                            {addr ? `${addr.city}, ${addr.state}` : "—"}
                          </span>
                        </td>

                        {/* Loyalty tier */}
                        <td className="center">
                          <span
                            className="badge"
                            style={{
                              background: tierStyle.bg,
                              color: tierStyle.text,
                              borderColor: tierStyle.border,
                            }}
                          >
                            {tier === "Gold"
                              ? "🥇"
                              : tier === "Platinum"
                                ? "💎"
                                : tier === "Silver"
                                  ? "🥈"
                                  : "🥉"}{" "}
                            {tier}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="center">
                          <span
                            className="badge"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              borderColor: "transparent",
                            }}
                          >
                            <span
                              className="badge-dot"
                              style={{ background: statusStyle.dot }}
                            />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>

                        {/* Joined date */}
                        <td
                          style={{
                            color: "#64748b",
                            fontSize: ".8rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {joined}
                        </td>

                        {/* Actions */}
                        <td className="center">
                          <div className="cl-actions">
                            <button
                              className="btn btn-secondary btn-icon"
                              title="View"
                              onClick={() => navigate(`/customers/${c._id}`)}
                            >
                              👁
                            </button>
                            <button
                              className="btn btn-secondary btn-icon"
                              title="Edit"
                              onClick={() =>
                                navigate(`/customers/${c._id}/edit`)
                              }
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-danger btn-icon"
                              title="Delete"
                              onClick={() => setDeleteTarget(c)}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ────────────────────────────── */}
            {totalPages > 1 && (
              <div className="cl-pagination">
                <span className="cl-page-info">
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total}
                </span>
                <div className="cl-page-btns">
                  <button
                    className="cl-page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                  >
                    «
                  </button>
                  <button
                    className="cl-page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p =
                      Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={p}
                        className={`cl-page-btn${page === p ? " active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    className="cl-page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ›
                  </button>
                  <button
                    className="cl-page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirm Modal ─────────────────────────── */}
      {deleteTarget && (
        <div
          className="cl-modal-overlay"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Customer?</h3>
            <p>
              You're about to permanently delete{" "}
              <strong>
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="cl-modal-actions">
              <button
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ background: "#dc2626", color: "#fff", border: "none" }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
