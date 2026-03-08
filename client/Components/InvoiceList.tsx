import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

// ─── Types ────────────────────────────────────────────────────────────────────
type Customer = {
  _id: string;
  custname: string;
  address: string;
  city: string;
};

type Item = {
  _id: string;
  barcode: string;
  itemname: string;
  brand: string;
  category: string;
  price: number;
};

type InvoiceLineRaw = {
  item: string | Item; // populated or bare id
  quantity: number;
  price: number;
};

type Invoice = {
  _id: string;
  invoiceNumber: string;
  customer: string | Customer;
  items: InvoiceLineRaw[];
  subtotal: number;
  discountType: "percent" | "flat";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gst: number;
  roundingDiff: number;
  total: number;
  createdAt?: string;
};

// ─── Editor line (internal state for the edit form) ───────────────────────────
type EditLine = {
  item: string;
  barcodeInput: string;
  quantity: number;
  price: number;
};

// ─── react-select styles (same palette as CreateInvoice) ─────────────────────
const selectStyles = (minWidth = 180) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "34px",
    fontSize: "0.85rem",
    borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    borderRadius: "6px",
    background: "#ffffff",
    "&:hover": { borderColor: "#6366f1" },
    minWidth,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "0.82rem",
    backgroundColor: state.isSelected
      ? "#6366f1"
      : state.isFocused
        ? "#eef2ff"
        : "white",
    color: state.isSelected ? "white" : "#0f172a",
    padding: "6px 10px",
  }),
  singleValue: (base: any) => ({
    ...base,
    fontSize: "0.85rem",
    color: "#0f172a",
  }),
  placeholder: (base: any) => ({
    ...base,
    fontSize: "0.82rem",
    color: "#94a3b8",
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
    borderRadius: "8px",
    fontSize: "0.82rem",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 20px rgba(15,23,42,0.12)",
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  container: (base: any) => ({ ...base, width: "100%" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "0 6px",
    color: "#94a3b8",
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const custOf = (inv: Invoice): Customer | null =>
  inv.customer && typeof inv.customer === "object"
    ? (inv.customer as Customer)
    : null;

const custName = (inv: Invoice): string =>
  custOf(inv)?.custname ?? (inv.customer as string) ?? "—";

const fmtDate = (iso?: string): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtINR = (n: number): string =>
  "₹ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ─── Component ────────────────────────────────────────────────────────────────
export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCust, setFilterCust] = useState<string>("");
  const [sortKey, setSortKey] = useState<"date" | "total" | "number">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editInv, setEditInv] = useState<Invoice | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [editDiscountType, setEditDiscountType] = useState<"percent" | "flat">(
    "percent",
  );
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editNetOverride, setEditNetOverride] = useState("");
  const [editNetEditing, setEditNetEditing] = useState(false);
  const [editItemSelectMode, setEditItemSelectMode] = useState<
    Record<number, boolean>
  >({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const barcodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);

  const GST_RATE = 0.18;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("http://localhost:3000/invoices").then((r) => r.json()),
      fetch("http://localhost:3000/customers").then((r) => r.json()),
      fetch("http://localhost:3000/items").then((r) => r.json()),
    ])
      .then(([invData, custData, itemData]) => {
        setInvoices(invData.data || invData || []);
        setCustomers(custData.data || custData || []);
        setItems(itemData.data || itemData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Derived list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invoices];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          custName(inv).toLowerCase().includes(q),
      );
    }
    if (filterCust) {
      list = list.filter((inv) => {
        const id =
          typeof inv.customer === "object"
            ? (inv.customer as Customer)._id
            : inv.customer;
        return id === filterCust;
      });
    }
    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "date") {
        va = a.createdAt ?? "";
        vb = b.createdAt ?? "";
      }
      if (sortKey === "total") {
        va = a.total;
        vb = b.total;
      }
      if (sortKey === "number") {
        va = a.invoiceNumber;
        vb = b.invoiceNumber;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [invoices, search, filterCust, sortKey, sortDir]);

  const custOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c._id,
        label: `${c.custname} — ${c.city}`,
      })),
    [customers],
  );
  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i._id,
        label: i.itemname,
        barcode: i.barcode,
        brand: i.brand,
        category: i.category,
        price: i.price,
      })),
    [items],
  );

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (inv: Invoice) => {
    setEditInv(inv);

    // Resolve customer
    const cust =
      custOf(inv) ??
      customers.find((c) => c._id === (inv.customer as string)) ??
      null;
    setEditCustomer(cust);

    // Resolve lines
    const lines: EditLine[] = inv.items.map((l) => {
      const itm =
        typeof l.item === "object"
          ? (l.item as Item)
          : items.find((i) => i._id === (l.item as string));
      return {
        item: itm?._id ?? (l.item as string),
        barcodeInput: itm?.barcode ?? "",
        quantity: l.quantity,
        price: l.price,
      };
    });
    // Add a blank row at the end
    lines.push({ item: "", barcodeInput: "", quantity: 1, price: 0 });
    setEditLines(lines);

    setEditDiscountType(inv.discountType ?? "percent");
    setEditDiscountValue(inv.discountValue ?? 0);
    setEditNetOverride(inv.total.toFixed(2));
    setEditNetEditing(false);
    setEditItemSelectMode({});
  };

  const closeEdit = () => {
    setEditInv(null);
    setShowDeleteConfirm(false);
  };

  // ── Edit form computations ─────────────────────────────────────────────────
  const editSubtotal = editLines.reduce((s, l) => s + l.price * l.quantity, 0);
  const editDiscAmt =
    editDiscountType === "percent"
      ? editSubtotal * (editDiscountValue / 100)
      : editDiscountValue;
  const editTaxable = editSubtotal - editDiscAmt;
  const editGST = editTaxable * GST_RATE;
  const editComputed = editTaxable + editGST;
  const editGrandTotal = editNetEditing
    ? editComputed
    : editNetOverride !== ""
      ? Number(editNetOverride)
      : editComputed;
  const editRounding = editGrandTotal - editComputed;

  // ── Line handlers ─────────────────────────────────────────────────────────
  const fillLine = (idx: number, matched: Item) => {
    setEditLines((prev) => {
      const u = [...prev];
      u[idx] = {
        ...u[idx],
        item: matched._id,
        barcodeInput: matched.barcode,
        price: matched.price,
      };
      return u;
    });
  };

  const handleBarcode = (idx: number, val: string) => {
    setEditLines((prev) => {
      const u = [...prev];
      u[idx] = { ...u[idx], barcodeInput: val, item: "", price: 0 };
      return u;
    });
    const matched = items.find(
      (i) => i.barcode.toLowerCase() === val.trim().toLowerCase(),
    );
    if (matched) {
      setEditLines((prev) => {
        const u = [...prev];
        u[idx] = {
          ...u[idx],
          item: matched._id,
          barcodeInput: matched.barcode,
          price: matched.price,
        };
        return [...u, { item: "", barcodeInput: "", quantity: 1, price: 0 }];
      });
      setTimeout(() => barcodeRefs.current[idx + 1]?.focus(), 50);
    }
  };

  const handleBarcodeKey = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditLines((prev) => [
        ...prev,
        { item: "", barcodeInput: "", quantity: 1, price: 0 },
      ]);
      setTimeout(() => barcodeRefs.current[idx + 1]?.focus(), 50);
    }
  };

  const handleItemSel = (idx: number, itemId: string) => {
    const matched = items.find((i) => i._id === itemId);
    if (matched) {
      fillLine(idx, matched);
      setEditItemSelectMode((prev) => ({ ...prev, [idx]: false }));
      setTimeout(() => {
        qtyRefs.current[idx]?.focus();
        qtyRefs.current[idx]?.select();
      }, 50);
    }
  };

  const handleQtyKey = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditLines((prev) => [
        ...prev,
        { item: "", barcodeInput: "", quantity: 1, price: 0 },
      ]);
      setTimeout(() => barcodeRefs.current[idx + 1]?.focus(), 50);
    }
  };

  const addLine = () =>
    setEditLines((prev) => [
      ...prev,
      { item: "", barcodeInput: "", quantity: 1, price: 0 },
    ]);

  const removeLine = (idx: number) =>
    setEditLines((prev) => prev.filter((_, i) => i !== idx));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editInv || !editCustomer) {
      alert("Please select a customer");
      return;
    }
    const valid = editLines.filter((l) => l.item && l.price > 0);
    if (!valid.length) {
      alert("Please add at least one item");
      return;
    }

    setSaving(true);
    const payload = {
      customer: editCustomer._id,
      items: valid.map(({ item, quantity, price }) => ({
        item,
        quantity,
        price,
      })),
      subtotal: editSubtotal,
      discountType: editDiscountType,
      discountValue: editDiscountValue,
      discountAmount: editDiscAmt,
      taxableAmount: editTaxable,
      gst: editGST,
      roundingDiff: editRounding,
      total: editGrandTotal,
    };
    try {
      const res = await fetch(`http://localhost:3000/invoices/${editInv._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === editInv._id ? (updated.data ?? updated) : inv,
          ),
        );
        closeEdit();
        alert("Invoice updated successfully!");
      } else {
        const d = await res.json();
        alert(d.message || "Error updating invoice");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editInv) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3000/invoices/${editInv._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== editInv._id));
        closeEdit();
        alert("Invoice deleted.");
      } else {
        alert("Error deleting invoice");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Sort toggle ────────────────────────────────────────────────────────────
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const sortIcon = (key: typeof sortKey) =>
    sortKey !== key ? " ↕" : sortDir === "asc" ? " ↑" : " ↓";

  // ── Format option label for item dropdown ─────────────────────────────────
  const formatItemOption = (opt: any) => (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "#0f172a" }}>
        {opt.label}
      </div>
      <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: 2 }}>
        {opt.barcode && (
          <span style={{ marginRight: 8 }}>🔖 {opt.barcode}</span>
        )}
        {opt.brand && <span style={{ marginRight: 8 }}>🏷️ {opt.brand}</span>}
        {opt.category && (
          <span style={{ marginRight: 8 }}>📂 {opt.category}</span>
        )}
        <span style={{ color: "#6366f1", fontWeight: 600 }}>
          ₹{opt.price?.toFixed(2)}
        </span>
      </div>
    </div>
  );
  const filterItemOption = (opt: any, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      opt.data.label.toLowerCase().includes(s) ||
      (opt.data.barcode || "").toLowerCase().includes(s) ||
      (opt.data.brand || "").toLowerCase().includes(s)
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .il-root * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
    .il-root { background: #f1f5f9; min-height: 100vh; padding: 24px 16px; }

    /* ── Topbar ── */
    .il-topbar {
      display: flex; align-items: center; justify-content: space-between;
      background: #0f172a; color: #f8fafc;
      padding: 13px 24px; border-radius: 10px; margin-bottom: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(15,23,42,0.25);
    }
    .il-topbar h4 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #f1f5f9; }
    .il-badge {
      font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;
      background: rgba(250, 8, 17, 0.25); color: #eff0f3;
      padding: 4px 11px; border-radius: 20px; border: 1px solid rgba(99,102,241,0.35);
    }

    /* ── Toolbar ── */
    .il-toolbar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 12px 16px; margin-bottom: 14px;
      box-shadow: 0 1px 4px rgba(15,23,42,0.05);
    }
    .il-search {
      flex: 1; min-width: 200px; padding: 7px 12px;
      border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 0.84rem; color: #0f172a; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .il-search:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
    .il-search::placeholder { color: #94a3b8; }
    .il-filter-select { min-width: 200px; }
    .il-sort-btn {
      padding: 7px 13px; border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 0.8rem; color: #475569; background: #f8fafc; cursor: pointer;
      white-space: nowrap; font-family: 'Inter', sans-serif; transition: all 0.15s;
    }
    .il-sort-btn:hover, .il-sort-btn.active {
      border-color: #6366f1; color: #6366f1; background: #eef2ff;
    }

    /* ── Table card ── */
    .il-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 1px 4px rgba(15,23,42,0.06); overflow: hidden;
    }
    .il-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
    .il-table thead tr {
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .il-table th {
      padding: 10px 14px; text-align: left; font-size: 0.68rem; font-weight: 600;
      color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;
      white-space: nowrap; cursor: pointer; user-select: none;
    }
    .il-table th:hover { color: #6366f1; }
    .il-table td {
      padding: 11px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
      color: #0f172a;
    }
    .il-table tr:last-child td { border-bottom: none; }
    .il-table tbody tr { cursor: pointer; transition: background 0.1s; }
    .il-table tbody tr:hover td { background: #f8fafc; }
    .il-table tbody tr:hover .il-inv-no { color: #6366f1; }

    .il-inv-no {
      font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;
      color: #4f46e5; font-weight: 600; letter-spacing: 0.03em;
    }
    .il-cust { font-weight: 500; color: #0f172a; }
    .il-city { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .il-amt {
      font-family: 'JetBrains Mono', monospace; font-weight: 600;
      color: #0f172a; text-align: right;
    }
    .il-date { font-size: 0.79rem; color: #64748b; }
    .il-items-count {
      display: inline-block; background: #eef2ff; color: #6366f1;
      font-size: 0.7rem; font-weight: 600; border-radius: 12px;
      padding: 2px 8px;
    }
    .il-edit-btn {
      padding: 5px 12px; background: #eef2ff; color: #6366f1;
      border: 1px solid #c7d2fe; border-radius: 6px;
      font-size: 0.77rem; font-weight: 500; cursor: pointer;
      white-space: nowrap; transition: all 0.15s;
    }
    .il-edit-btn:hover { background: #6366f1; color: #fff; border-color: #6366f1; }

    .il-empty {
      text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 0.9rem;
    }
    .il-empty-icon { font-size: 2.5rem; margin-bottom: 10px; }

    /* ── Edit modal overlay ── */
    .il-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55);
      backdrop-filter: blur(2px); z-index: 200;
      display: flex; align-items: flex-start; justify-content: center;
      overflow-y: auto; padding: 24px 16px;
    }
    .il-modal {
      background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 60px rgba(15,23,42,0.25);
      width: 100%; max-width: 980px;
      margin: auto;
    }
    .il-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: #0f172a; border-radius: 12px 12px 0 0;
    }
    .il-modal-header h3 { margin: 0; font-size: 0.93rem; font-weight: 600; color: #f1f5f9; }
    .il-modal-inv-no {
      font-family: 'JetBrains Mono', monospace; font-size: 0.74rem;
      background: rgba(99,102,241,0.25); color: #a5b4fc;
      padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(99,102,241,0.35);
    }
    .il-close-btn {
      background: rgba(255,255,255,0.1); border: none; color: #94a3b8;
      width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
      font-size: 1rem; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .il-close-btn:hover { background: rgba(244,63,94,0.2); color: #f43f5e; }

    .il-modal-body { padding: 20px 24px; }

    /* ── Meta row ── */
    .il-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
    .il-meta-block label {
      display: block; font-size: 0.68rem; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
    }
    .cust-fields { display: flex; flex-direction: column; gap: 4px; }
    .cust-field-row {
      display: flex; align-items: center;
      border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; background: #f8fafc;
    }
    .cust-field-tag {
      font-size: 0.65rem; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.06em;
      padding: 5px 9px; background: #f1f5f9; border-right: 1px solid #e2e8f0;
      white-space: nowrap; min-width: 58px;
    }
    .cust-field-val { font-size: 0.83rem; color: #0f172a; padding: 5px 10px; flex: 1; font-weight: 500; }
    .cust-change-btn {
      font-size: 0.68rem; color: #6366f1; background: none; border: none;
      cursor: pointer; padding: 5px 9px; white-space: nowrap;
      border-left: 1px solid #e2e8f0; font-weight: 500;
    }
    .cust-change-btn:hover { background: #eef2ff; }
    .inv-field {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 0.84rem; color: #334155; background: #f8fafc;
    }
    .inv-field span { color: #94a3b8; font-size: 0.78rem; }

    /* ── Edit table ── */
    .edit-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
    .edit-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; table-layout: fixed; }
    .edit-table th {
      background: #f8fafc; color: #64748b; font-weight: 600;
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 9px 10px; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
    }
    .edit-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #0f172a; }
    .edit-table tr:last-child td { border-bottom: none; }
    .edit-table tr:hover td { background: #f8fafc; }
    .edit-table th.center, .edit-table td.center { text-align: center; }
    .edit-table th.right,  .edit-table td.right  { text-align: right; }
    .col-bc  { width: 130px; }
    .col-it  { width: 260px; }
    .col-br  { width: 100px; }
    .col-cat { width: 100px; }
    .col-pr  { width: 85px; }
    .col-qty { width: 70px; }
    .col-tot { width: 90px; }
    .col-del { width: 50px; }

    .e-input {
      width: 100%; padding: 5px 7px; border: 1px solid #e2e8f0;
      border-radius: 6px; font-size: 0.82rem; color: #0f172a;
      font-family: 'Inter', sans-serif; background: #fff; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .e-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
    .e-input.valid   { border-color: #10b981; background: #f0fdf4; }
    .e-input.invalid { border-color: #f43f5e; background: #fff1f2; }
    .e-input.qty     { text-align: center; }

    .item-name-cell { display: flex; align-items: center; gap: 5px; }
    .item-name-text { font-size: 0.82rem; color: #0f172a; font-weight: 500; flex: 1; }
    .item-reselect-btn {
      font-size: 0.67rem; color: #6366f1; background: none;
      border: 1px solid #c7d2fe; border-radius: 4px;
      padding: 2px 5px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
    }
    .item-reselect-btn:hover { background: #eef2ff; }

    .add-line-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 13px; border: 1.5px dashed #cbd5e1; border-radius: 7px;
      font-size: 0.79rem; font-weight: 500; color: #94a3b8;
      background: transparent; cursor: pointer; margin: 10px 0; transition: all 0.15s;
    }
    .add-line-btn:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }

    .btn-del-line {
      background: transparent; border: none; color: #f43f5e;
      padding: 4px 7px; border-radius: 5px; cursor: pointer; font-size: 0.78rem;
    }
    .btn-del-line:hover { background: #fff1f2; }

    /* ── Summary bar at bottom of modal ── */
    .edit-summary {
      background: #1e293b; border-radius: 8px;
      margin-top: 16px; overflow: hidden;
    }
    .edit-sum-grid {
      display: grid; grid-template-columns: 1fr auto;
    }
    .es-label, .es-value {
      padding: 9px 16px; font-size: 0.82rem; border-bottom: 1px solid #273449;
    }
    .es-label { color: #94a3b8; background: #1e293b; }
    .es-value  { color: #e2e8f0; text-align: right; background: #1e293b; font-family: 'JetBrains Mono', monospace; }
    .es-label:last-of-type, .es-value:last-of-type { border-bottom: none; }
    .es-label.rounding { color: #fbbf24; background: rgba(251,191,36,0.08); font-size: 0.78rem; }
    .es-value.rounding { color: #fbbf24; background: rgba(251,191,36,0.08); font-size: 0.78rem; }
    .es-net-label { background: #0f172a; color: #a5b4fc; padding: 10px 16px; font-weight: 600; font-size: 0.83rem; border-bottom: none; }
    .es-net-value { background: #0f172a; padding: 6px 8px; border-bottom: none; min-width: 160px; }
    .net-input {
      width: 100%; padding: 6px 10px; border: 1.5px solid #6366f1; border-radius: 6px;
      font-size: 0.91rem; font-weight: 700; text-align: right;
      font-family: 'JetBrains Mono', monospace; letter-spacing: 0.03em;
      background: #4f46e5; color: #fff; outline: none;
      transition: all 0.15s;
    }
    .net-input:focus { background: #4338ca; border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.28); }

    .disc-row { display: flex; align-items: center; gap: 6px; }
    .disc-sel {
      padding: 3px 6px; border: 1px solid #334155; border-radius: 5px;
      font-size: 0.73rem; color: #cbd5e1; background: #273449; cursor: pointer;
    }
    .disc-inp {
      width: 68px; padding: 3px 6px; border: 1px solid #334155; border-radius: 5px;
      font-size: 0.79rem; text-align: right; font-family: 'JetBrains Mono', monospace;
      background: #273449; color: #e2e8f0; outline: none;
    }
    .disc-inp:focus { border-color: #6366f1; }

    /* ── Modal footer ── */
    .il-modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 24px; border-top: 1px solid #f1f5f9;
    }
    .il-footer-left  { display: flex; gap: 8px; }
    .il-footer-right { display: flex; gap: 8px; }
    .btn-base {
      padding: 8px 18px; border-radius: 7px; font-size: 0.84rem;
      font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
      font-family: 'Inter', sans-serif;
    }
    .btn-ghost  { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
    .btn-ghost:hover  { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-primary:disabled { background: #a5b4fc; cursor: not-allowed; }
    .btn-danger  { background: #fff1f2; color: #f43f5e; border: 1px solid #fecdd3; }
    .btn-danger:hover  { background: #f43f5e; color: #fff; border-color: #f43f5e; }

    /* ── Delete confirm ── */
    .del-confirm {
      background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px;
      padding: 12px 16px; margin: 0 24px 16px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .del-confirm span { font-size: 0.83rem; color: #be123c; font-weight: 500; }
    .del-confirm-btns { display: flex; gap: 8px; }
    .btn-confirm-del { background: #f43f5e; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
    .btn-confirm-del:hover { background: #e11d48; }
    .btn-cancel-del { background: #fff; border: 1px solid #e2e8f0; color: #475569; border-radius: 6px; padding: 6px 12px; font-size: 0.8rem; cursor: pointer; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="il-root">
        {/* ── Topbar ── */}
        <div className="il-topbar">
          <h4>🧾 Invoices</h4>
          <span className="il-badge">{filtered.length} records</span>
        </div>

        {/* ── Toolbar ── */}
        <div className="il-toolbar">
          <input
            className="il-search"
            placeholder="🔍 Search by invoice no. or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="il-filter-select">
            <Select
              options={[{ value: "", label: "All Customers" }, ...custOptions]}
              value={
                custOptions.find((o) => o.value === filterCust) ?? {
                  value: "",
                  label: "All Customers",
                }
              }
              onChange={(opt: any) => setFilterCust(opt?.value ?? "")}
              placeholder="Filter by customer…"
              styles={selectStyles(200) as any}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>
          <button
            className={`il-sort-btn ${sortKey === "date" ? "active" : ""}`}
            onClick={() => toggleSort("date")}
          >
            Date{sortIcon("date")}
          </button>
          <button
            className={`il-sort-btn ${sortKey === "total" ? "active" : ""}`}
            onClick={() => toggleSort("total")}
          >
            Amount{sortIcon("total")}
          </button>
          <button
            className={`il-sort-btn ${sortKey === "number" ? "active" : ""}`}
            onClick={() => toggleSort("number")}
          >
            Inv#{sortIcon("number")}
          </button>
        </div>

        {/* ── List card ── */}
        <div className="il-card">
          {loading ? (
            <div className="il-empty">
              <div className="il-empty-icon">⏳</div>
              Loading invoices…
            </div>
          ) : filtered.length === 0 ? (
            <div className="il-empty">
              <div className="il-empty-icon">📭</div>
              No invoices found.
            </div>
          ) : (
            <table className="il-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("number")}>
                    Invoice #{sortIcon("number")}
                  </th>
                  <th>Customer</th>
                  <th onClick={() => toggleSort("date")}>
                    Date{sortIcon("date")}
                  </th>
                  <th style={{ textAlign: "center" }}>Items</th>
                  <th
                    style={{ textAlign: "right" }}
                    onClick={() => toggleSort("total")}
                  >
                    Amount{sortIcon("total")}
                  </th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const cust = custOf(inv);
                  return (
                    <tr key={inv._id} onClick={() => openEdit(inv)}>
                      <td>
                        <span className="il-inv-no">{inv.invoiceNumber}</span>
                      </td>
                      <td>
                        <div className="il-cust">{custName(inv)}</div>
                        {cust?.city && (
                          <div className="il-city">📍 {cust.city}</div>
                        )}
                      </td>
                      <td>
                        <span className="il-date">
                          {fmtDate(inv.createdAt)}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="il-items-count">
                          {inv.items.length} item
                          {inv.items.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <div className="il-amt">{fmtINR(inv.total)}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="il-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(inv);
                          }}
                        >
                          ✎ Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Edit Modal ── */}
        {editInv && (
          <div
            className="il-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeEdit();
            }}
          >
            <div className="il-modal">
              {/* Header */}
              <div className="il-modal-header">
                <h3>✎ Edit Invoice</h3>
                <span className="il-modal-inv-no">{editInv.invoiceNumber}</span>
                <button className="il-close-btn" onClick={closeEdit}>
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="il-modal-body">
                {/* Meta */}
                <div className="il-meta">
                  {/* Customer */}
                  <div className="il-meta-block">
                    <label>Bill To</label>
                    {editCustomer ? (
                      <div className="cust-fields">
                        <div className="cust-field-row">
                          <span className="cust-field-tag">Name</span>
                          <span className="cust-field-val">
                            {editCustomer.custname}
                          </span>
                          <button
                            className="cust-change-btn"
                            onClick={() => setEditCustomer(null)}
                          >
                            ✎ Change
                          </button>
                        </div>
                        <div className="cust-field-row">
                          <span className="cust-field-tag">Address</span>
                          <span className="cust-field-val">
                            {editCustomer.address}
                          </span>
                        </div>
                        <div className="cust-field-row">
                          <span className="cust-field-tag">City</span>
                          <span className="cust-field-val">
                            {editCustomer.city}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Select
                        options={custOptions}
                        value={null}
                        onChange={(opt: any) =>
                          setEditCustomer(
                            customers.find((c) => c._id === opt.value) ?? null,
                          )
                        }
                        isSearchable
                        autoFocus
                        placeholder="Search customer…"
                        styles={selectStyles(240) as any}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    )}
                  </div>

                  {/* Invoice details */}
                  <div className="il-meta-block">
                    <label>Invoice Details</label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div className="inv-field">
                        <span>No.</span>
                        <strong
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: "#4f46e5",
                          }}
                        >
                          {editInv.invoiceNumber}
                        </strong>
                      </div>
                      <div className="inv-field">
                        <span>Date</span> {fmtDate(editInv.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <div className="edit-table-wrap">
                  <table className="edit-table">
                    <thead>
                      <tr>
                        <th className="col-bc">Barcode</th>
                        <th className="col-it">Item</th>
                        <th className="col-br center">Brand</th>
                        <th className="col-cat center">Category</th>
                        <th className="col-pr right">Price (₹)</th>
                        <th className="col-qty center">Qty</th>
                        <th className="col-tot right">Total (₹)</th>
                        <th className="col-del center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editLines.map((line, idx) => {
                        const selOpt = line.item
                          ? (itemOptions.find((o) => o.value === line.item) ??
                            null)
                          : null;
                        const bcStatus =
                          line.barcodeInput === ""
                            ? ""
                            : line.item
                              ? "valid"
                              : "invalid";
                        const inSelMode = editItemSelectMode[idx] ?? !line.item;

                        return (
                          <tr key={idx}>
                            <td className="col-bc">
                              <input
                                ref={(el) => {
                                  barcodeRefs.current[idx] = el;
                                }}
                                type="text"
                                className={`e-input ${bcStatus}`}
                                placeholder="Scan…"
                                value={line.barcodeInput}
                                onChange={(e) =>
                                  handleBarcode(idx, e.target.value)
                                }
                                onKeyDown={(e) => handleBarcodeKey(idx, e)}
                              />
                            </td>
                            <td className="col-it">
                              {inSelMode ? (
                                <Select
                                  instanceId={`edit-item-${idx}`}
                                  options={itemOptions}
                                  value={selOpt}
                                  onChange={(opt: any) =>
                                    handleItemSel(idx, opt.value)
                                  }
                                  isSearchable
                                  autoFocus={!!line.item}
                                  placeholder="Search item…"
                                  filterOption={filterItemOption}
                                  formatOptionLabel={formatItemOption}
                                  getOptionLabel={(o: any) => o.label}
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                  styles={selectStyles(240) as any}
                                  onMenuClose={() => {
                                    if (line.item)
                                      setEditItemSelectMode((prev) => ({
                                        ...prev,
                                        [idx]: false,
                                      }));
                                  }}
                                />
                              ) : (
                                <div className="item-name-cell">
                                  <span className="item-name-text">
                                    {selOpt?.label ?? "—"}
                                  </span>
                                  <button
                                    className="item-reselect-btn"
                                    onClick={() =>
                                      setEditItemSelectMode((prev) => ({
                                        ...prev,
                                        [idx]: true,
                                      }))
                                    }
                                  >
                                    ✎
                                  </button>
                                </div>
                              )}
                            </td>
                            <td
                              className="col-br center"
                              style={{ color: "#64748b", fontSize: "0.78rem" }}
                            >
                              {selOpt?.brand || (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                            <td
                              className="col-cat center"
                              style={{ color: "#64748b", fontSize: "0.78rem" }}
                            >
                              {selOpt?.category || (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                            <td
                              className="col-pr right"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {line.price > 0 ? (
                                line.price.toFixed(2)
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                            <td className="col-qty center">
                              <input
                                ref={(el) => {
                                  qtyRefs.current[idx] = el;
                                }}
                                type="number"
                                className="e-input qty"
                                min="1"
                                value={line.quantity}
                                onChange={(e) =>
                                  setEditLines((prev) => {
                                    const u = [...prev];
                                    u[idx] = {
                                      ...u[idx],
                                      quantity: Number(e.target.value),
                                    };
                                    return u;
                                  })
                                }
                                onKeyDown={(e) => handleQtyKey(idx, e)}
                              />
                            </td>
                            <td
                              className="col-tot right"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 500,
                              }}
                            >
                              {line.price > 0 ? (
                                (line.price * line.quantity).toFixed(2)
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                            <td className="col-del center">
                              <button
                                className="btn-del-line"
                                onClick={() => removeLine(idx)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button className="add-line-btn" onClick={addLine}>
                  + Add Item
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Ctrl+Enter
                  </span>
                </button>

                {/* Summary */}
                <div className="edit-summary">
                  <div className="edit-sum-grid">
                    {/* Subtotal */}
                    <div className="es-label">Subtotal</div>
                    <div className="es-value">{fmtINR(editSubtotal)}</div>

                    {/* Discount */}
                    <div className="es-label">
                      <div className="disc-row">
                        Discount
                        <select
                          className="disc-sel"
                          value={editDiscountType}
                          onChange={(e) =>
                            setEditDiscountType(e.target.value as any)
                          }
                        >
                          <option value="percent">%</option>
                          <option value="flat">₹</option>
                        </select>
                        <input
                          type="number"
                          className="disc-inp"
                          min={0}
                          value={editDiscountValue}
                          onChange={(e) =>
                            setEditDiscountValue(Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div className="es-value" style={{ color: "#f43f5e" }}>
                      − {fmtINR(editDiscAmt)}
                    </div>

                    {/* Taxable */}
                    <div className="es-label">Taxable Amount</div>
                    <div className="es-value">{fmtINR(editTaxable)}</div>

                    {/* GST */}
                    <div className="es-label">GST (18%)</div>
                    <div className="es-value">{fmtINR(editGST)}</div>

                    {/* Rounding */}
                    {Math.abs(editRounding) > 0.001 && (
                      <>
                        <div className="es-label rounding">⚖ Rounding Adj.</div>
                        <div className="es-value rounding">
                          {editRounding >= 0 ? "+" : ""}₹{" "}
                          {editRounding.toFixed(2)}
                        </div>
                      </>
                    )}

                    {/* Net */}
                    <div className="es-net-label">Net Amount</div>
                    <div className="es-net-value">
                      <input
                        type="number"
                        className="net-input"
                        value={
                          editNetEditing
                            ? editNetOverride
                            : editNetOverride !== ""
                              ? editNetOverride
                              : editComputed.toFixed(2)
                        }
                        onFocus={() => {
                          setEditNetEditing(true);
                          if (editNetOverride === "")
                            setEditNetOverride(
                              Math.round(editComputed).toString(),
                            );
                        }}
                        onChange={(e) => setEditNetOverride(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                        }}
                        onBlur={() => setEditNetEditing(false)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete confirm banner */}
              {showDeleteConfirm && (
                <div className="del-confirm">
                  <span>
                    ⚠️ Are you sure you want to permanently delete{" "}
                    {editInv.invoiceNumber}?
                  </span>
                  <div className="del-confirm-btns">
                    <button
                      className="btn-cancel-del"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-confirm-del"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Deleting…" : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="il-modal-footer">
                <div className="il-footer-left">
                  <button className="btn-base btn-ghost" onClick={closeEdit}>
                    ✕ Cancel
                  </button>
                  {!showDeleteConfirm && (
                    <button
                      className="btn-base btn-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
                <div className="il-footer-right">
                  <button
                    className="btn-base btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "✓ Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
