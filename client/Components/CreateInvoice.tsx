import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Select from "react-select";

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
type InvoiceItem = {
  item: string;
  barcodeInput: string;
  quantity: number;
  price: number;
};

// ── Odoo-inspired palette ───────────────────────────────────────────────────
const ODOO_PRIMARY = "#106b82";
const ODOO_TEAL = "#14b121";

const makeSelectStyles = (accent = ODOO_PRIMARY, minWidth = 180) => ({
  control: (b: any, s: any) => ({
    ...b,
    minHeight: "32px",
    fontSize: "0.84rem",
    borderColor: s.isFocused ? accent : "#ced4da",
    boxShadow: s.isFocused ? `0 0 0 3px ${accent}28` : "none",
    borderRadius: "4px",
    background: "#fff",
    "&:hover": { borderColor: accent },
    minWidth,
  }),
  option: (b: any, s: any) => ({
    ...b,
    fontSize: "0.82rem",
    backgroundColor: s.isSelected
      ? accent
      : s.isFocused
        ? `${accent}14`
        : "white",
    color: s.isSelected ? "white" : "#212529",
    padding: "6px 10px",
  }),
  singleValue: (b: any) => ({ ...b, fontSize: "0.84rem", color: "#212529" }),
  placeholder: (b: any) => ({ ...b, fontSize: "0.82rem", color: "#adb5bd" }),
  menu: (b: any) => ({
    ...b,
    zIndex: 9999,
    borderRadius: "4px",
    fontSize: "0.82rem",
    border: "1px solid #dee2e6",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  }),
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
  container: (b: any) => ({ ...b, width: "100%" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (b: any) => ({ ...b, padding: "0 6px", color: "#adb5bd" }),
});

const SHORTCUTS = [
  { keys: "Alt+C", desc: "Customer search" },
  { keys: "Alt+D", desc: "Discount focus" },
  { keys: "Alt+S", desc: "Save / Confirm" },
  { keys: "Alt+P", desc: "Preview / Print" },
  { keys: "Alt+N", desc: "New invoice" },
  { keys: "Ctrl+↵", desc: "Add row" },
];

function CreateInvoice() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { item: "", barcodeInput: "", quantity: 1, price: 0 },
  ]);
  const [discountType, setDiscountType] = useState<"percent" | "flat">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [netAmountOverride, setNetAmountOverride] = useState("");
  const [netAmountEditing, setNetAmountEditing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("Loading...");
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState(true);
  const [singleQtyMode, setSingleQtyMode] = useState(false);
  const [itemSelectMode, setItemSelectMode] = useState<Record<number, boolean>>(
    {},
  );
  const [showShortcuts, setShowShortcuts] = useState(false);

  const invoiceDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const GST_RATE = 0.18;

  // ── Refs ────────────────────────────────────────────────────────────────────
  const barcodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const customerSelRef = useRef<any>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const itemMenuOpenRef = useRef<Record<number, boolean>>({});

  // ── Data fetching ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchNextInvoiceNumber();
  }, []);

  const fetchNextInvoiceNumber = async () => {
    setInvoiceNumberLoading(true);
    try {
      const res = await fetch("http://localhost:3000/invoices/next-number");
      if (res.ok) {
        const d = await res.json();
        if (d.nextNumber) {
          setInvoiceNumber(d.nextNumber);
        } else if (d.seq || d.sequence || d.count !== undefined) {
          setInvoiceNumber(
            formatInvoiceNumber(d.seq ?? d.sequence ?? d.count + 1),
          );
        } else {
          setInvoiceNumber(formatInvoiceNumber(1));
        }
      } else {
        const r2 = await fetch("http://localhost:3000/invoices");
        const d2 = await r2.json();
        setInvoiceNumber(formatInvoiceNumber((d2.data || d2 || []).length + 1));
      }
    } catch {
      setInvoiceNumber(formatInvoiceNumber(1));
    } finally {
      setInvoiceNumberLoading(false);
    }
  };

  const formatInvoiceNumber = (seq: number): string => {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `INV-${String(yr).slice(2)}${String(yr + 1).slice(2)}-${String(seq).padStart(4, "0")}`;
  };

  const fetchCustomers = async () => {
    const res = await fetch("http://localhost:3000/customers");
    const data = await res.json();
    setCustomers(data.data);
  };

  const fetchItems = async () => {
    const res = await fetch("http://localhost:3000/items");
    const data = await res.json();
    setItems(data.data || data);
  };

  // ── Options ─────────────────────────────────────────────────────────────────
  const customerOptions = useMemo(
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

  const filterItemOption = (opt: any, q: string) => {
    if (!q) return true;
    const lq = q.toLowerCase();
    return (
      opt.data.label.toLowerCase().includes(lq) ||
      (opt.data.barcode || "").toLowerCase().includes(lq) ||
      (opt.data.brand || "").toLowerCase().includes(lq) ||
      (opt.data.category || "").toLowerCase().includes(lq)
    );
  };

  const formatItemOption = (o: any) => (
    <div style={{ lineHeight: 1.4 }}>
      <div style={{ fontWeight: 500, color: "#212529" }}>{o.label}</div>
      <div
        style={{
          fontSize: "0.74rem",
          color: "#6c757d",
          display: "flex",
          gap: 8,
          marginTop: 2,
        }}
      >
        {o.barcode && <span>🔖 {o.barcode}</span>}
        {o.brand && <span>🏷️ {o.brand}</span>}
        {o.category && <span>📂 {o.category}</span>}
        <span
          style={{ marginLeft: "auto", color: ODOO_PRIMARY, fontWeight: 600 }}
        >
          ₹{o.price.toFixed(2)}
        </span>
      </div>
    </div>
  );

  // ── Row helpers ─────────────────────────────────────────────────────────────
  const fillRowFromItem = (index: number, m: Item) => {
    setInvoiceItems((prev) => {
      const u = [...prev];
      u[index] = {
        ...u[index],
        item: m._id,
        barcodeInput: m.barcode,
        price: m.price,
      };
      return u;
    });
  };

  const ensureBlankRow = (prev: InvoiceItem[]): InvoiceItem[] => {
    const last = prev[prev.length - 1];
    return last.item !== ""
      ? [...prev, { item: "", barcodeInput: "", quantity: 1, price: 0 }]
      : prev;
  };

  const toggleItemSelectMode = (i: number, on: boolean) =>
    setItemSelectMode((p) => ({ ...p, [i]: on }));

  // ── Navigation helper ────────────────────────────────────────────────────────
  const navigateRow = (
    e: React.KeyboardEvent,
    index: number,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      refs.current[index - 1]?.focus();
      refs.current[index - 1]?.select();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      refs.current[index + 1]?.focus();
      refs.current[index + 1]?.select();
    }
  };

  // ── Input handlers ───────────────────────────────────────────────────────────
  const handleBarcodeInput = (index: number, value: string) => {
    setInvoiceItems((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], barcodeInput: value, item: "", price: 0 };
      return u;
    });
    const matched = items.find(
      (i) => i.barcode.toLowerCase() === value.trim().toLowerCase(),
    );
    if (matched) {
      setInvoiceItems((prev) => {
        const u = [...prev];
        u[index] = {
          ...u[index],
          item: matched._id,
          barcodeInput: matched.barcode,
          price: matched.price,
        };
        return ensureBlankRow(u);
      });
      if (singleQtyMode) {
        setTimeout(() => barcodeRefs.current[index + 1]?.focus(), 50);
      } else {
        setTimeout(() => {
          qtyRefs.current[index]?.focus();
          qtyRefs.current[index]?.select();
        }, 50);
      }
    }
  };

  const handleBarcodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    val: string,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (val.trim() === "") {
        toggleItemSelectMode(index, true);
      } else {
        setTimeout(() => {
          qtyRefs.current[index]?.focus();
          qtyRefs.current[index]?.select();
        }, 50);
      }
    } else {
      navigateRow(e, index, barcodeRefs);
    }
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const m = items.find((i) => i._id === itemId);
    if (!m) return;
    fillRowFromItem(index, m);
    toggleItemSelectMode(index, false);
    if (singleQtyMode) {
      setInvoiceItems((prev) => ensureBlankRow(prev));
      setTimeout(() => barcodeRefs.current[index + 1]?.focus(), 50);
    } else {
      setTimeout(() => {
        qtyRefs.current[index]?.focus();
        qtyRefs.current[index]?.select();
      }, 50);
    }
  };

  const handleQtyKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setInvoiceItems((prev) => ensureBlankRow(prev));
      setTimeout(() => barcodeRefs.current[index + 1]?.focus(), 50);
    } else {
      navigateRow(e, index, qtyRefs);
    }
  };

  const handleQuantityChange = (index: number, value: number) =>
    setInvoiceItems((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], quantity: value };
      return u;
    });

  const removeRow = (index: number) =>
    setInvoiceItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );

  // ── Calculations ─────────────────────────────────────────────────────────────
  const subtotal = invoiceItems.reduce((a, c) => a + c.price * c.quantity, 0);
  const discountAmount =
    discountType === "percent"
      ? subtotal * (discountValue / 100)
      : discountValue;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = taxableAmount * GST_RATE;
  const computedGrandTotal = taxableAmount + gstAmount;
  const grandTotal = netAmountEditing
    ? computedGrandTotal
    : netAmountOverride !== ""
      ? Number(netAmountOverride)
      : computedGrandTotal;
  const roundingDiff = grandTotal - computedGrandTotal;

  // ── New Invoice ──────────────────────────────────────────────────────────────
  const handleNewInvoice = useCallback(() => {
    setInvoiceItems([{ item: "", barcodeInput: "", quantity: 1, price: 0 }]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setNetAmountOverride("");
    setItemSelectMode({});
    setShowPreview(false);
    fetchNextInvoiceNumber();
    setTimeout(() => customerSelRef.current?.focus(), 100);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }
    const validItems = invoiceItems.filter((l) => l.item !== "" && l.price > 0);
    if (validItems.length === 0) {
      alert("Please add at least one item");
      return;
    }
    const payload = {
      invoiceNumber,
      customer: selectedCustomer._id,
      items: validItems.map(({ item, quantity, price }) => ({
        item,
        quantity,
        price,
      })),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxableAmount,
      gst: gstAmount,
      roundingDiff,
      total: grandTotal,
    };
    const res = await fetch("http://localhost:3000/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert("Invoice Saved!");
      handleNewInvoice();
    } else {
      const d = await res.json();
      alert(d.message || "Error saving invoice");
    }
  };

  const handlePrint = () => window.print();

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        setInvoiceItems((prev) => [
          ...prev,
          { item: "", barcodeInput: "", quantity: 1, price: 0 },
        ]);
        setTimeout(
          () => barcodeRefs.current[barcodeRefs.current.length - 1]?.focus(),
          50,
        );
        return;
      }
      if (!e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          setSelectedCustomer(null);
          setTimeout(() => customerSelRef.current?.focus(), 80);
          break;
        case "d":
          e.preventDefault();
          setSummaryOpen(true);
          setTimeout(() => {
            discountRef.current?.focus();
            discountRef.current?.select();
          }, 80);
          break;
        case "s":
          e.preventDefault();
          if (showPreview) handleSubmit();
          else setShowPreview(true);
          break;
        case "p":
          e.preventDefault();
          if (showPreview) handlePrint();
          else setShowPreview(true);
          break;
        case "n":
          e.preventDefault();
          if (
            window.confirm(
              "Start a new invoice? Any unsaved entries will be cleared.",
            )
          ) {
            handleNewInvoice();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPreview, handleNewInvoice]);

  // ── CSS ───────────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .inv-root *, .inv-root *::before, .inv-root *::after {
      box-sizing: border-box; font-family: 'Inter', sans-serif;
    }
    .inv-root { background: #f5f5f5; min-height: 100vh; padding: 0; }

    /* ── Action Bar ─────────────────────────────────────────────────────────── */
    .inv-actionbar {
      background: ${ODOO_PRIMARY};
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 20px;
      height: 46px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      position: sticky;
      top: 0;
      z-index: 200;
    }
    .inv-ab-title {
      font-size: 0.92rem; font-weight: 700; letter-spacing: 0.01em; margin-right: 8px;
    }
    .inv-ab-invno {
      font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;
      background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
      border-radius: 20px; padding: 2px 10px; letter-spacing: 0.04em; margin-right: 10px;
    }
    .inv-ab-sep { flex: 1; }
    .inv-ab-btn {
      display: inline-flex; align-items: center; gap: 5px;
      height: 28px; padding: 0 13px; border-radius: 4px; font-size: 0.78rem;
      font-weight: 500; cursor: pointer; border: none; white-space: nowrap;
      font-family: 'Inter', sans-serif; transition: all 0.15s;
    }
    .inv-ab-btn kbd {
      font-size: 0.63rem; background: rgba(255,255,255,0.18); border-radius: 3px;
      padding: 1px 4px; font-family: 'JetBrains Mono', monospace;
    }
    .ab-save    { background: #28a745; color: #fff; }
    .ab-save:hover { background: #218838; }
    .ab-print   { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.28); }
    .ab-print:hover { background: rgba(255,255,255,0.24); }
    .ab-new     { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); }
    .ab-new:hover { background: rgba(255,255,255,0.2); }
    .ab-back    { background: transparent; color: rgba(255,255,255,0.8); border: none; }
    .ab-back:hover { color: #fff; }
    .ab-sc-btn  { background: transparent; color: rgba(255,255,255,0.55); border: none; font-size: 0.72rem; cursor: pointer; padding: 0 6px; height: 28px; }
    .ab-sc-btn:hover { color: rgba(255,255,255,0.9); }

    /* ── Shortcuts bar ──────────────────────────────────────────────────────── */
    .inv-sc-bar {
      background: #2d1f28; color: #e9d8f0;
      display: flex; flex-wrap: wrap; gap: 4px 18px; padding: 7px 20px;
      font-size: 0.73rem; border-bottom: 1px solid #3d2535;
    }
    .inv-sc-bar kbd {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 3px; padding: 1px 5px; font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem; color: #f0c8e0;
    }

    /* ── Page body ──────────────────────────────────────────────────────────── */
    .inv-body { padding: 18px 20px 120px; }

    /* ── Card ───────────────────────────────────────────────────────────────── */
    .inv-card {
      background: #fff; border-radius: 4px;
      border: 1px solid #dee2e6; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden;
    }

    /* ── Card header ────────────────────────────────────────────────────────── */
    .inv-card-header {
      background: #fbf8fc;
      border-bottom: 2px solid ${ODOO_PRIMARY}33;
      padding: 16px 20px 14px;
    }
    .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .inv-meta-label {
      font-size: 0.66rem; font-weight: 700; color: ${ODOO_PRIMARY};
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;
    }
    .inv-meta-hint { color: #adb5bd; font-weight: 400; font-size: 0.6rem; }

    /* ── Customer display ───────────────────────────────────────────────────── */
    .cust-fields { display: flex; flex-direction: column; gap: 3px; }
    .cust-field-row {
      display: flex; align-items: stretch;
      border: 1px solid #dee2e6; border-radius: 3px; overflow: hidden;
    }
    .cust-field-tag {
      font-size: 0.63rem; font-weight: 700; color: #6c757d; text-transform: uppercase;
      letter-spacing: 0.05em; padding: 5px 8px; background: #f8f9fa;
      border-right: 1px solid #dee2e6; white-space: nowrap; min-width: 54px;
      display: flex; align-items: center;
    }
    .cust-field-val {
      font-size: 0.83rem; color: #212529; padding: 5px 9px; flex: 1;
      font-weight: 500; display: flex; align-items: center;
    }
    .cust-change-btn {
      font-size: 0.66rem; color: red; background: none; border: none;
      cursor: pointer; padding: 5px 8px; border-left: 1px solid #dee2e6;
      font-weight: 600; display: flex; align-items: center;
    }
    .cust-change-btn:hover { background: #fbf8fc; }

    /* ── Invoice info ───────────────────────────────────────────────────────── */
    .inv-info-row {
      display: flex; align-items: center; gap: 8px; padding: 5px 9px;
      border: 1px solid #dee2e6; border-radius: 3px; font-size: 0.83rem;
      color: #212529; background: #f8f9fa; margin-bottom: 4px;
    }
    .inv-info-key { font-size: 0.7rem; color: #6c757d; font-weight: 600; min-width: 34px; }

    /* ── Toolbar ────────────────────────────────────────────────────────────── */
    .inv-toolbar {
      display: flex; align-items: center; gap: 10px; padding: 8px 20px;
      background: #f8f9fa; border-bottom: 1px solid #dee2e6;
    }
    .qty-lbl {
      display: flex; align-items: center; gap: 6px; font-size: 0.79rem;
      font-weight: 500; color: #495057; cursor: pointer; user-select: none;
    }
    .qty-lbl input[type="checkbox"] { width: 14px; height: 14px; accent-color: ${ODOO_PRIMARY}; }
    .qty-badge {
      font-size: 0.69rem; font-weight: 600; padding: 2px 8px; border-radius: 20px;
    }
    .qty-badge.s { background: #fbf8fc; color: ${ODOO_PRIMARY}; border: 1px solid ${ODOO_PRIMARY}44; }
    .qty-badge.m { background: #e6f7f7; color: ${ODOO_TEAL};     border: 1px solid ${ODOO_TEAL}55; }
    .inv-add-btn {
      margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border: 1.5px dashed #adb5bd; border-radius: 4px;
      font-size: 0.77rem; font-weight: 600; color: #1e3a5f;
      background: transparent; cursor: pointer; transition: all 0.15s;
    }
    .inv-add-btn:hover { border-color: ${ODOO_PRIMARY}; color: ${ODOO_PRIMARY}; background: #fbf8fc; }
    .inv-add-btn kbd {
      font-size: 0.63rem; color: #3b82f6; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 3px; padding: 1px 4px;
    }

    /* ── Table ──────────────────────────────────────────────────────────────── */
    .inv-table-wrap { overflow-x: auto; overflow-y: auto; }
    .inv-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; table-layout: fixed; }
    .inv-table th {
      background: #fbf8fc; color: ${ODOO_PRIMARY}; font-weight: 700;
      font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 8px 10px; border-bottom: 2px solid ${ODOO_PRIMARY}33;
      white-space: nowrap;
    }
    .inv-table td {
      padding: 6px 8px; border-bottom: 1px solid #f0edf3;
      vertical-align: middle; color: #212529;
    }
    .inv-table tbody tr:last-child td { border-bottom: none; }
    .inv-table tbody tr:hover td { background: #fdf9ff; }
    .inv-table th.right, .inv-table td.right { text-align: right; }
    .inv-table th.center, .inv-table td.center { text-align: center; }

    .col-barcode  { width: 126px; }
    .col-item     { width: 290px; }
    .col-brand    { width: 105px; }
    .col-category { width: 105px; }
    .col-price    { width: 86px; }
    .col-qty      { width: 70px; }
    .col-total    { width: 90px; }
    .col-action   { width: 48px; }

    .item-name-cell { display: flex; align-items: center; gap: 5px; }
    .item-name-text { font-size: 0.83rem; color: #212529; font-weight: 500; flex: 1; line-height: 1.3; }
    .item-reselect-btn {
      font-size: 0.64rem; color: ${ODOO_PRIMARY}; background: none;
      border: 1px solid ${ODOO_PRIMARY}44; border-radius: 3px; padding: 2px 5px;
      cursor: pointer; flex-shrink: 0; font-weight: 600;
    }
    .item-reselect-btn:hover { background: #fbf8fc; border-color: ${ODOO_PRIMARY}; }

    /* ── Inputs ─────────────────────────────────────────────────────────────── */
    .inv-input {
      width: 100%; padding: 4px 1px; border: 1px solid #ced4da; border-radius: 4px;
      font-size: 0.82rem; color: #212529; background: #fff; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s; font-family: 'Inter', sans-serif;
    }
    /* .inv-input:focus { border-color: black; box-shadow: 0 0 0 3px red22; } */
    .inv-input.valid   { border-color: #28a745; background: #f0fff4; }
    .inv-input.invalid { border-color: #dc3545; background: #fff5f5; }
    .inv-input.qty { text-align: center; }

    .btn-rm {
      background: transparent; border: none; color: #dc3545;
      padding: 3px 7px; border-radius: 3px; cursor: pointer; font-size: 0.82rem;
    }
    .btn-rm:hover { background: #fff5f5; }

    /* ── Summary panel ──────────────────────────────────────────────────────── */
    .inv-summary {
      position: fixed; bottom: 20px; right: 1px; z-index: 150;
      display: flex; flex-direction: column-reverse;
      filter: drop-shadow(0 8px 24px rgba(0,0,0,0.25));
    }
  
      .inv-sum-toggle {
      background: #121212; color: #20e0f1;width: 340px; 
      padding: 10px 5px; display: flex;justify-content: space-between;
      cursor: pointer; user-select: none;font-size: 0.83rem; font-weight: 600;
      border-radius: 0 0 6px 6px;
    }

    .summary-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%; /* or fit to parent */
}

.summary-left {
  font-weight: bold;
}

.summary-right {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
}

.summary-arrow {
  font-size: 0.68rem;
  margin-left: 8px; /* optional spacing */
}


    .inv-sum-toggle.open { border-radius: 0 0 6px 6px; }
    .inv-sum-toggle.closed { border-radius: 6px; }
    .inv-sum-grid {
      width: 340px;
      background: #1e0e1a;
      border: 1px solid #0c0c0c; border-bottom: none; border-radius: 6px 6px 0 0;
      /* Net Total Amount */
      display: grid; grid-template-columns: 1fr 110px;
       max-height: calc(100vh - 140px); 
      overflow-y: auto;
      overflow-x: hidden;
    }
    .sl, .sv {
      padding: 8px 14px; font-size: 0.82rem;
      border-bottom: 1px solid #f7f5f7;
      overflow: hidden;
    }
    .sl { color: #111011; background: #fffafa; min-width: 0; }
    .sv {
      color: #0f0e0f; text-align: right;
      font-family: 'JetBrains Mono', monospace; font-size: 0.81rem;
      background: #faf5f8; min-width: 0;
      white-space: nowrap;
    }
    .sl.no-border, .sv.no-border { border-bottom: none; }
    .sl.rnd { color: #f59e0b; background: rgba(245,158,11,0.07); font-size: 0.77rem; }
    .sv.rnd { color: #f59e0b; background: rgba(245,158,11,0.07); font-size: 0.77rem; }
    .sl.net-l { background: #0f0810; color: #e8eb47; font-weight: 700; font-size: 0.84rem; border-bottom: none; }
    .sv.net-v { background: #0f0810; padding: 1px 2px; border-bottom: none; min-width: 0; }

    .disc-row { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; }
    .disc-sel {
      padding: 2px 4px; border: 1px solid #3d1f35; border-radius: 3px;
      font-size: 0.7rem; color: #c084fc; background: #2d1525; cursor: pointer;
      flex-shrink: 0;
    }
    .disc-inp {
      width: 60px; min-width: 0; padding: 2px 8px; border: 1px solid #3d1f35; border-radius: 3px;
      font-size: 0.78rem; text-align: right; font-family: 'JetBrains Mono', monospace;
      background: #d8c8d3; color: #f70404; flex-shrink: 0;
    }
    .disc-inp:focus { outline: none; border-color: ${ODOO_PRIMARY}; }
    .net-inp {
      text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace;
      font-size: 0.88rem; padding: 1px 2px; width: 100%; min-width: 0;
      background: yellow !important; color: #101010 !important;
      border: 1.5px solid ${ODOO_PRIMARY}bb !important; border-radius: 4px; outline: none;
      box-sizing: border-box;
    }
    .net-inp:focus {
      background: #09090a !important;
      border-color: #c084fc !important;
      box-shadow: 0 0 0 3px black44 !important;
    }

    /* ── Preview ────────────────────────────────────────────────────────────── */
    .inv-preview {
      background: #fff; border-radius: 4px; border: 1px solid #dee2e6;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); padding: 32px 36px; margin: 18px 20px;
    }
    .inv-preview-hdr {
      display: flex; justify-content: space-between; margin-bottom: 18px;
      padding-bottom: 14px; border-bottom: 2px solid ${ODOO_PRIMARY}33;
    }
    .inv-company { font-size: 1.2rem; font-weight: 700; color: ${ODOO_PRIMARY}; }
    .inv-pre-meta { font-size: 0.82rem; color: #495057; text-align: right; }
    .inv-pre-meta strong { color: #212529; }
    .inv-pre-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 14px; }
    .inv-pre-table th {
      background: ${ODOO_PRIMARY}; color: #fff; padding: 8px 12px;
      font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .inv-pre-table td { padding: 7px 12px; border-bottom: 1px solid #f0edf3; color: #212529; }
    .inv-pre-table tr:last-child td { border-bottom: none; }
    .inv-pre-totals { margin-top: 18px; float: right; width: 270px; }
    .inv-pre-totals table { width: 100%; font-size: 0.82rem; border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden; }
    .inv-pre-totals td { padding: 5px 10px; border-bottom: 1px solid #f0edf3; }
    .inv-pre-totals tr:last-child td { border-bottom: none; background: #141414; color: #fff; font-weight: 700; }
    .clearfix::after { content: ""; display: table; clear: both; }

    @media print {
      .no-print { display: none !important; }
      .inv-summary { display: none !important; }
      .inv-root { background: white; }
      .inv-preview { box-shadow: none; border: none; margin: 0; padding: 20px; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="inv-root">
        {/* ── ACTION BAR ─────────────────────────────────────────────────────── */}
        <div className="inv-actionbar no-print">
          <span className="inv-ab-title">📄 Sales Invoice</span>
          <span className="inv-ab-invno">
            {invoiceNumberLoading ? "Generating..." : invoiceNumber}
          </span>
          <span className="inv-ab-sep" />

          {!showPreview ? (
            <>
              <button
                className="inv-ab-btn ab-save"
                onClick={() => setShowPreview(true)}
              >
                💾 Save <kbd>Alt+S</kbd>
              </button>
              <button
                className="inv-ab-btn ab-print"
                onClick={() => setShowPreview(true)}
              >
                🖨 Preview <kbd>Alt+P</kbd>
              </button>
              <button
                className="inv-ab-btn ab-new"
                onClick={() => {
                  if (
                    window.confirm(
                      "Start a new invoice? Any unsaved entries will be cleared.",
                    )
                  )
                    handleNewInvoice();
                }}
              >
                ✚ New <kbd>Alt+N</kbd>
              </button>
            </>
          ) : (
            <>
              <button className="inv-ab-btn ab-save" onClick={handleSubmit}>
                ✓ Confirm &amp; Save <kbd>Alt+S</kbd>
              </button>
              <button className="inv-ab-btn ab-print" onClick={handlePrint}>
                🖨 Print <kbd>Alt+P</kbd>
              </button>
              <button
                className="inv-ab-btn ab-back"
                onClick={() => setShowPreview(false)}
              >
                ← Back
              </button>
            </>
          )}

          <button
            className="ab-sc-btn"
            onClick={() => setShowShortcuts((v) => !v)}
            title="Keyboard shortcuts"
          >
            ⌨ shortcuts
          </button>
        </div>

        {/* ── SHORTCUTS BAR ──────────────────────────────────────────────────── */}
        {showShortcuts && (
          <div className="inv-sc-bar no-print">
            {SHORTCUTS.map((s) => (
              <span key={s.keys}>
                <kbd>{s.keys}</kbd> {s.desc}
              </span>
            ))}
          </div>
        )}

        {/* ── FORM ───────────────────────────────────────────────────────────── */}
        {!showPreview && (
          <div className="inv-body">
            <div className="inv-card">
              {/* Header */}
              <div className="inv-card-header">
                <div className="inv-meta">
                  {/* Bill To */}
                  <div>
                    <div className="inv-meta-label">
                      Bill To <span className="inv-meta-hint">(Alt+C)</span>
                    </div>
                    {selectedCustomer ? (
                      <div className="cust-fields">
                        <div className="cust-field-row">
                          <span className="cust-field-tag">Name</span>
                          <span className="cust-field-val">
                            {selectedCustomer.custname}
                          </span>
                          <button
                            className="cust-change-btn"
                            onClick={() => setSelectedCustomer(null)}
                          >
                            ✎ Change
                          </button>
                        </div>
                        <div className="cust-field-row">
                          <span className="cust-field-tag">Address</span>
                          <span className="cust-field-val">
                            {selectedCustomer.address}
                          </span>
                        </div>
                        <div className="cust-field-row">
                          <span className="cust-field-tag">City</span>
                          <span className="cust-field-val">
                            {selectedCustomer.city}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Select
                        ref={customerSelRef}
                        options={customerOptions}
                        onChange={(opt: any) =>
                          setSelectedCustomer(
                            customers.find((c) => c._id === opt.value) || null,
                          )
                        }
                        isSearchable
                        placeholder="Search customer... (Alt+C)"
                        styles={makeSelectStyles(ODOO_PRIMARY, 240) as any}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    )}
                  </div>

                  {/* Invoice Details */}
                  <div>
                    <div className="inv-meta-label">Invoice Details</div>
                    <div>
                      <div className="inv-info-row">
                        <span className="inv-info-key">No.</span>
                        <strong
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: "0.82rem",
                          }}
                        >
                          {invoiceNumberLoading ? (
                            <em style={{ color: "#adb5bd" }}>Generating...</em>
                          ) : (
                            invoiceNumber
                          )}
                        </strong>
                      </div>
                      <div className="inv-info-row">
                        <span className="inv-info-key">Date</span>
                        {invoiceDate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="inv-toolbar no-print">
                <label className="qty-lbl">
                  <input
                    type="checkbox"
                    checked={singleQtyMode}
                    onChange={(e) => setSingleQtyMode(e.target.checked)}
                  />
                  Single Qty Mode
                </label>
                <span className={`qty-badge ${singleQtyMode ? "s" : "m"}`}>
                  {singleQtyMode ? "⚡ skip qty" : "🔢 multi qty"}
                </span>
                <button
                  className="inv-add-btn"
                  onClick={() => {
                    setInvoiceItems((prev) => [
                      ...prev,
                      { item: "", barcodeInput: "", quantity: 1, price: 0 },
                    ]);
                    setTimeout(
                      () =>
                        barcodeRefs.current[
                          barcodeRefs.current.length - 1
                        ]?.focus(),
                      50,
                    );
                  }}
                >
                  + Add Item <kbd>Ctrl+↵</kbd>
                </button>
              </div>

              {/* Table */}
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th className="col-barcode">Barcode</th>
                      <th className="col-item">Item</th>
                      <th className="col-brand">Brand</th>
                      <th className="col-category">Category</th>
                      <th className="col-price right">Price (₹)</th>
                      <th className="col-qty center">Qty</th>
                      <th className="col-total right">Total (₹)</th>
                      <th className="col-action" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((line, index) => {
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
                      const inSelect = itemSelectMode[index] || !line.item;

                      return (
                        <tr key={index}>
                          {/* Barcode */}
                          <td className="col-barcode">
                            <input
                              ref={(el) => {
                                barcodeRefs.current[index] = el;
                              }}
                              type="text"
                              className={`inv-input ${bcStatus}`}
                              placeholder="Scan..."
                              value={line.barcodeInput}
                              onChange={(e) =>
                                handleBarcodeInput(index, e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleBarcodeKeyDown(
                                  index,
                                  e,
                                  line.barcodeInput,
                                )
                              }
                            />
                          </td>

                          {/* Item */}
                          <td className="col-item">
                            {items.length === 0 ? (
                              <em
                                style={{
                                  color: "#adb5bd",
                                  fontSize: "0.78rem",
                                }}
                              >
                                Loading...
                              </em>
                            ) : inSelect ? (
                              <Select
                                options={itemOptions}
                                value={selOpt}
                                onChange={(opt: any) =>
                                  handleItemSelect(index, opt.value)
                                }
                                isSearchable
                                autoFocus={true}
                                placeholder="Search item..."
                                filterOption={filterItemOption}
                                formatOptionLabel={formatItemOption}
                                getOptionLabel={(o: any) => o.label}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                styles={
                                  makeSelectStyles(ODOO_PRIMARY, 280) as any
                                }
                                onMenuOpen={() => {
                                  itemMenuOpenRef.current[index] = true;
                                }}
                                onMenuClose={() => {
                                  itemMenuOpenRef.current[index] = false;
                                  if (line.item)
                                    toggleItemSelectMode(index, false);
                                }}
                              />
                            ) : (
                              <div className="item-name-cell">
                                <span className="item-name-text">
                                  {selOpt?.label || "—"}
                                </span>
                                <button
                                  className="item-reselect-btn"
                                  onClick={() =>
                                    toggleItemSelectMode(index, true)
                                  }
                                >
                                  ✎
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Brand */}
                          <td
                            className="col-brand"
                            style={{
                              color: selOpt?.brand ? "#212529" : "#ced4da",
                            }}
                          >
                            {selOpt?.brand || "—"}
                          </td>

                          {/* Category */}
                          <td
                            className="col-category"
                            style={{
                              color: selOpt?.category ? "#212529" : "#ced4da",
                            }}
                          >
                            {selOpt?.category || "—"}
                          </td>

                          {/* Price */}
                          <td
                            className="col-price right"
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              color: line.price > 0 ? "#212529" : "#ced4da",
                            }}
                          >
                            {line.price > 0 ? line.price.toFixed(2) : "—"}
                          </td>

                          {/* Qty */}
                          <td className="col-qty center">
                            <input
                              ref={(el) => {
                                qtyRefs.current[index] = el;
                              }}
                              type="number"
                              className="inv-input qty"
                              min="1"
                              value={line.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  index,
                                  Number(e.target.value),
                                )
                              }
                              onKeyDown={(e) => handleQtyKeyDown(index, e)}
                            />
                          </td>

                          {/* Total */}
                          <td
                            className="col-total right"
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontWeight: 600,
                              color: line.price > 0 ? ODOO_PRIMARY : "#ced4da",
                            }}
                          >
                            {line.price > 0
                              ? (line.price * line.quantity).toFixed(2)
                              : "—"}
                          </td>

                          {/* Remove */}
                          <td className="col-action center">
                            <button
                              className="btn-rm"
                              onClick={() => removeRow(index)}
                              title="Remove"
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
            </div>
          </div>
        )}

        {/* ── PREVIEW ────────────────────────────────────────────────────────── */}
        {showPreview && (
          <div className="inv-preview">
            <div className="inv-preview-hdr">
              <div>
                <div className="inv-company">SHANU COMPANY</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6c757d",
                    marginTop: 2,
                  }}
                >
                  GSTIN: 29XXXXX0000X1ZX
                </div>
              </div>
              <div className="inv-pre-meta">
                <div>
                  Invoice No: <strong>{invoiceNumber}</strong>
                </div>
                <div>
                  Date: <strong>{invoiceDate}</strong>
                </div>
                {selectedCustomer && (
                  <div style={{ marginTop: 8 }}>
                    Bill To: <strong>{selectedCustomer.custname}</strong>
                    <br />
                    <span style={{ fontSize: "0.77rem" }}>
                      {selectedCustomer.address}, {selectedCustomer.city}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <table className="inv-pre-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Barcode</th>
                  <th>Item</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price (₹)</th>
                  <th>Qty</th>
                  <th>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems
                  .filter((l) => l.item)
                  .map((line, i) => {
                    const sel = items.find((it) => it._id === line.item);
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{sel?.barcode || "—"}</td>
                        <td>{sel?.itemname || "—"}</td>
                        <td>{sel?.brand || "—"}</td>
                        <td>{sel?.category || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          {line.price.toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center" }}>{line.quantity}</td>
                        <td style={{ textAlign: "right" }}>
                          {(line.price * line.quantity).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className="clearfix">
              <div className="inv-pre-totals">
                <table>
                  <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td style={{ textAlign: "right" }}>
                        ₹ {subtotal.toFixed(2)}
                      </td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr>
                        <td>Discount</td>
                        <td style={{ textAlign: "right" }}>
                          − ₹ {discountAmount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Taxable Amount</td>
                      <td style={{ textAlign: "right" }}>
                        ₹ {taxableAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td>GST (18%)</td>
                      <td style={{ textAlign: "right" }}>
                        ₹ {gstAmount.toFixed(2)}
                      </td>
                    </tr>
                    {Math.abs(roundingDiff) > 0.001 && (
                      <tr>
                        <td>⚖ Rounding Adj.</td>
                        <td style={{ textAlign: "right" }}>
                          {roundingDiff >= 0 ? "+" : ""}₹{" "}
                          {roundingDiff.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Net Amount</td>
                      <td style={{ textAlign: "right" }}>
                        ₹ {grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                marginTop: 48,
                textAlign: "center",
                fontSize: "0.72rem",
                color: "#adb5bd",
              }}
            >
              Thank you for your business! • Computer-generated invoice.
            </div>
          </div>
        )}

        {/* ── SUMMARY PANEL ──────────────────────────────────────────────────── */}
        {!showPreview && (
          <div className="inv-summary no-print">
            <div
              className={`inv-sum-toggle ${summaryOpen ? "open" : "closed"}`}
              onClick={() => setSummaryOpen((v) => !v)}
            >
              {/* <span>💰 Summary</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                ₹ {grandTotal.toFixed(2)}
              </span>
              <span style={{ fontSize: "0.68rem" }}>
                {summaryOpen ? "▼" : "▲"}
              </span>
              */}
              <div className="summary-container">
                <span className="summary-left">💰 Summary</span>
                <span className="summary-right">₹ {grandTotal.toFixed(2)}</span>
                <span className="summary-arrow">{summaryOpen ? "▼" : "▲"}</span>
              </div>
            </div>

            {summaryOpen && (
              <div className="inv-sum-grid">
                <div className="sl">Subtotal</div>
                <div className="sv">₹ {subtotal.toFixed(2)}</div>

                {/* Discount */}
                <div className="sl">
                  <div className="disc-row">
                    Discount
                    <span
                      style={{
                        color: "#6c757d",
                        fontSize: "0.64rem",
                        marginLeft: 4,
                      }}
                    >
                      (Alt+D)
                    </span>
                    <select
                      className="disc-sel"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                    >
                      <option value="percent">%</option>
                      <option value="flat">₹</option>
                    </select>
                    <input
                      ref={discountRef}
                      className="disc-inp"
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="sv">− ₹ {discountAmount.toFixed(2)}</div>

                <div className="sl">Taxable Amount</div>
                <div className="sv">₹ {taxableAmount.toFixed(2)}</div>

                <div className="sl">GST (18%)</div>
                <div className="sv">₹ {gstAmount.toFixed(2)}</div>

                {Math.abs(roundingDiff) > 0.001 && (
                  <>
                    <div className="sl rnd">⚖ Rounding Adj.</div>
                    <div className="sv rnd">
                      {roundingDiff >= 0 ? "+" : ""}₹ {roundingDiff.toFixed(2)}
                    </div>
                  </>
                )}

                <div className="sl net-l">Net Amount</div>
                <div className="sv net-v">
                  <input
                    className="inv-input net-inp"
                    type="number"
                    value={
                      netAmountEditing
                        ? netAmountOverride === ""
                          ? computedGrandTotal.toFixed(2)
                          : netAmountOverride
                        : netAmountOverride !== ""
                          ? netAmountOverride
                          : computedGrandTotal.toFixed(2)
                    }
                    onFocus={() => {
                      setNetAmountEditing(true);
                      if (netAmountOverride === "")
                        setNetAmountOverride(
                          Math.round(computedGrandTotal).toString(),
                        );
                    }}
                    onChange={(e) => setNetAmountOverride(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={() => setNetAmountEditing(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default CreateInvoice;
