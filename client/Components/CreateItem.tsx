import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/items`;

const CreateItem = () => {
  const [barcode, setBarcode] = useState<string>("");
  const [itemname, setItemname] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  const navigate = useNavigate();

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemname || !price) {
      alert("Item Name and Price are required.");
      return;
    }

    const item = {
      barcode,
      itemname,
      brand,
      category,
      price: Number(price),
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        // You might want to navigate to an item list or just reset the form
        // For now, let's reset and notify
        alert("Item created successfully!");
        setBarcode("");
        setItemname("");
        setBrand("");
        setCategory("");
        setPrice("");
        // navigate("/items");
      } else {
        const data = await response.json();
        alert(data.message || "Error creating item");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to connect to the server");
    }
  };

  return (
    <div className="container py-4">
      <div className="erp-page-header">
        <h2 className="erp-page-title">New Item</h2>
      </div>

      <div className="erp-card">
        <div className="erp-card-header">
          <h4 className="erp-card-title">Item Details</h4>
        </div>
        <div className="erp-card-body">
          <form onSubmit={addItem}>
            <div className="row">
              <div className="col-md-6 erp-form-group">
                <label htmlFor="barcodeInput" className="erp-form-label">
                  Barcode
                </label>
                <input
                  type="text"
                  id="barcodeInput"
                  className="erp-input"
                  placeholder="Scan or enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
              <div className="col-md-6 erp-form-group">
                <label htmlFor="itemNameInput" className="erp-form-label">
                  Item Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="itemNameInput"
                  className="erp-input"
                  placeholder="Enter item name"
                  value={itemname}
                  onChange={(e) => setItemname(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 erp-form-group">
                <label htmlFor="brandInput" className="erp-form-label">
                  Brand
                </label>
                <input
                  type="text"
                  id="brandInput"
                  className="erp-input"
                  placeholder="Enter brand name"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="col-md-6 erp-form-group">
                <label htmlFor="categoryInput" className="erp-form-label">
                  Category
                </label>
                <input
                  type="text"
                  id="categoryInput"
                  className="erp-input"
                  placeholder="Enter category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 erp-form-group">
                <label htmlFor="priceInput" className="erp-form-label">
                  Selling Price (₹) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="priceInput"
                  className="erp-input"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
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
                Save Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateItem;
