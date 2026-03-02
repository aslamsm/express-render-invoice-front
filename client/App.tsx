import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import Home from "./Components/Home";
import Contact from "./Components/Contact";
import UserList2 from "./Components/UserList2";
import UserDetails from "./Components/UserDetails";
import EmployeeList from "./Components/EmployeeList";
import Counter from "./Components/Counter";
import PostList3 from "./Components/PostList3";
import RecipeList from "./Components/RecipeList";
import CourseList4 from "./Components/CourseList4";
import CourseAdd from "./Components/CourseAdd";
import RegisterUser from "./Components/RegisterUser";
import CourseEdit from "./Components/CourseEdit";
//import CustomerList from "./Components/CustomerList";
import CreateInvoice from "./Components/CreateInvoice";
import InvoiceList from "./Components/InvoiceList";

type NavSection = {
  label: string;
  icon: string;
  key: string;
  children: { label: string; icon: string; to: string }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    icon: "⊞",
    key: "dashboard",
    children: [{ label: "Dashboard", icon: "⊞", to: "/home" }],
  },
  {
    label: "Sales",
    icon: "📈",
    key: "sales",
    children: [
      { label: "Customers", icon: "🏢", to: "/customers" },
      { label: "Invoices", icon: "🧾", to: "/invoices" },
      { label: "New Invoice", icon: "➕", to: "/create-invoice" },
      { label: "Recurring Invoices", icon: "🔄", to: "/recurring-invoices" },
      { label: "Payments Received", icon: "💰", to: "/payments-received" },
      { label: "Credit Notes", icon: "📋", to: "/credit-notes" },
    ],
  },
  {
    label: "Purchases",
    icon: "🛒",
    key: "purchases",
    children: [
      { label: "Vendors", icon: "🏭", to: "/vendors" },
      { label: "Expenses", icon: "💸", to: "/expenses" },
      { label: "Bills", icon: "🔄", to: "/bills" },
      { label: "Payments Made", icon: "💳", to: "/payments-made" },
      { label: "Vendor Credits", icon: "🏷️", to: "/vendor-credits" },
      { label: "Purchase Orders", icon: "📦", to: "/purchase-orders" },
    ],
  },
  {
    label: "Inventory",
    icon: "📦",
    key: "inventory",
    children: [
      { label: "Items", icon: "📦", to: "/items" },
      { label: "Price Lists", icon: "🏷️", to: "/price-lists" },
    ],
  },
  {
    label: "Accountant",
    icon: "📊",
    key: "accountant",
    children: [
      { label: "Chart of Accounts", icon: "📊", to: "/chart-of-accounts" },
      { label: "Manual Journals", icon: "📔", to: "/manual-journals" },
    ],
  },
  {
    label: "Banking",
    icon: "🏦",
    key: "banking",
    children: [
      { label: "Banking", icon: "🏦", to: "/banking" },
      { label: "Transactions", icon: "↔️", to: "/transactions" },
    ],
  },
  {
    label: "Reports",
    icon: "📈",
    key: "reports",
    children: [
      { label: "Reports", icon: "📈", to: "/reports" },
      { label: "Tax Reports", icon: "🧮", to: "/tax-reports" },
    ],
  },
];

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("sales");
  const [tabletPopup, setTabletPopup] = useState<string | null>(null);
  const windowWidth = useWindowWidth();

  const isTablet = windowWidth > 640 && windowWidth <= 1024;
  const isMobile = windowWidth <= 640;

  const closeSidebar = () => setSidebarOpen(false);

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? "" : key));
  };

  // Close tablet popup on outside click
  useEffect(() => {
    if (!tabletPopup) return;
    const handler = () => setTabletPopup(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [tabletPopup]);

  return (
    <Router>
      <div className="app-container">
        {/* Mobile overlay */}
        {sidebarOpen && isMobile && (
          <div className="sidebar-overlay" onClick={closeSidebar} />
        )}

        {/* Mobile top navbar */}
        {isMobile && (
          <header className="mobile-topbar">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="topbar-brand">
              <div className="brand-logo-sm">S</div>
              <span className="topbar-title">SHANU</span>
            </div>
            <div className="topbar-right">
              <div className="user-avatar-sm">S</div>
            </div>
          </header>
        )}

        {/* Sidebar — desktop full / tablet icon-only / mobile off-canvas */}
        <aside
          className={[
            "sidebar",
            isTablet ? "sidebar-collapsed" : "",
            isMobile && sidebarOpen ? "sidebar-open" : "",
            isMobile && !sidebarOpen ? "sidebar-hidden" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-logo">
              <span className="brand-logo-letter">S</span>
            </div>
            {!isTablet && (
              <div className="brand-info">
                <span className="brand-name">SHANU</span>
                <span className="brand-subtitle">Sales Invoice</span>
              </div>
            )}
            {isMobile && (
              <button
                className="sidebar-close-btn"
                onClick={closeSidebar}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {NAV_SECTIONS.map((section) => {
              const isSingle = section.children.length === 1;

              // ── TABLET: icon-only with popup flyout ──
              if (isTablet) {
                const isPopupOpen = tabletPopup === section.key;
                return (
                  <div key={section.key} className="tablet-nav-item-wrap">
                    {isSingle ? (
                      <NavLink
                        className={({ isActive }) =>
                          `tablet-icon-btn${isActive ? " active" : ""}`
                        }
                        to={section.children[0].to}
                        title={section.label}
                      >
                        <span className="nav-icon">{section.icon}</span>
                        <span className="tablet-tooltip">{section.label}</span>
                      </NavLink>
                    ) : (
                      <>
                        <button
                          className={`tablet-icon-btn${isPopupOpen ? " popup-open" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTabletPopup(isPopupOpen ? null : section.key);
                          }}
                          title={section.label}
                        >
                          <span className="nav-icon">{section.icon}</span>
                          <span className="tablet-tooltip">
                            {section.label}
                          </span>
                        </button>
                        {isPopupOpen && (
                          <div
                            className="tablet-flyout"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flyout-header">{section.label}</div>
                            {section.children.map((child) => (
                              <NavLink
                                key={child.to}
                                className={({ isActive }) =>
                                  `flyout-item${isActive ? " active" : ""}`
                                }
                                to={child.to}
                                onClick={() => setTabletPopup(null)}
                              >
                                <span className="flyout-icon">
                                  {child.icon}
                                </span>
                                <span>{child.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              }

              // ── DESKTOP & MOBILE: full sidebar ──
              if (isSingle) {
                return (
                  <NavLink
                    key={section.key}
                    className={({ isActive }) =>
                      `nav-item solo-item${isActive ? " active" : ""}`
                    }
                    to={section.children[0].to}
                    onClick={closeSidebar}
                  >
                    <span className="nav-icon-wrap">
                      <span className="nav-icon">{section.icon}</span>
                    </span>
                    <span className="nav-label">{section.label}</span>
                  </NavLink>
                );
              }

              const isOpen = expandedSection === section.key;
              return (
                <div
                  key={section.key}
                  className={`nav-group${isOpen ? " nav-group-open" : ""}`}
                >
                  <button
                    className="nav-group-header"
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={isOpen}
                  >
                    <span className="nav-icon-wrap">
                      <span className="nav-icon">{section.icon}</span>
                    </span>
                    <span className="nav-label">{section.label}</span>
                    <span className="nav-chevron">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="nav-children">
                      {section.children.map((child) => (
                        <NavLink
                          key={child.to}
                          className={({ isActive }) =>
                            `nav-child-item${isActive ? " active" : ""}`
                          }
                          to={child.to}
                          onClick={closeSidebar}
                        >
                          <span className="child-dot"></span>
                          <span className="nav-child-label">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="user-avatar">S</div>
            {!isTablet && (
              <div className="user-info">
                <span className="user-name">Shanu</span>
                <span className="user-role">Administrator</span>
              </div>
            )}
            <button className="settings-btn" title="Settings">
              ⚙
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={[
            "main-content",
            isTablet ? "main-content-tablet" : "",
            isMobile ? "main-content-mobile" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/users" element={<UserList2 />} />
            <Route path="/users/:id" element={<UserDetails />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/counter" element={<Counter />} />
            <Route path="/posts" element={<PostList3 />} />
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/courses" element={<CourseList4 />} />
            <Route path="/courses/add" element={<CourseAdd />} />
            <Route path="/courses/edit/:id" element={<CourseEdit />} />
            <Route path="/register" element={<RegisterUser />} />
            {/* <Route path="/customers" element={<CustomerList />} />  */}
            <Route path="/create-invoice" element={<CreateInvoice />} />
            <Route path="/invoices" element={<InvoiceList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
