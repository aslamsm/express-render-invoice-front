import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000/customers";

const CreateCustomer = () => {
  const [custname, setCustname] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const navigate = useNavigate();

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custname) {
      alert("Customer Name is required.");
      return;
    }

    const customer = {
      custname,
      address,
      city,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customer),
      });

      if (response.ok) {
        alert("Customer created successfully!");
        setCustname("");
        setAddress("");
        setCity("");
        // Optionally navigate to customer list
        // navigate("/customers");
      } else {
        const data = await response.json();
        alert(data.message || "Error creating customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to connect to the server");
    }
  };

  return (
    <div className="container py-4">
      <div className="erp-page-header">
        <h2 className="erp-page-title">New Customer</h2>
      </div>

      <div className="erp-card">
        <div className="erp-card-header">
          <h4 className="erp-card-title">Customer Information</h4>
        </div>
        <div className="erp-card-body">
          <form onSubmit={addCustomer}>
            <div className="row">
              <div className="col-md-12 erp-form-group">
                <label htmlFor="custNameInput" className="erp-form-label">
                  Customer Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="custNameInput"
                  className="erp-input"
                  placeholder="Enter customer name or company name"
                  value={custname}
                  onChange={(e) => setCustname(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-12 erp-form-group">
                <label htmlFor="addressInput" className="erp-form-label">
                  Street Address
                </label>
                <textarea
                  id="addressInput"
                  className="erp-input"
                  placeholder="Enter full address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 erp-form-group">
                <label htmlFor="cityInput" className="erp-form-label">
                  City
                </label>
                <input
                  type="text"
                  id="cityInput"
                  className="erp-input"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button
                type="button"
                className="btn btn-erp-secondary"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-erp-primary">
                Save Customer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomer;
