// src/components/Products.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";


const FALLBACK_IMG = "https://via.placeholder.com/300x200?text=No+Image";
const SMALL_FALLBACK = "https://via.placeholder.com/36";
const PAGE_SIZE = 9;

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container">
        <span
          className="navbar-brand fw-bold"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          MyStore
        </span>

        <div className="d-flex flex-grow-1 justify-content-center">
          <input
            type="text"
            className="form-control w-50"
            placeholder="Search products..."
            aria-label="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/signup")}
          >
            Signup
          </button>
        </div>
      </div>
    </nav>
  );
};

const Pagination = ({ currentPage, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  const buildPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("prev-ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("next-ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = buildPages();

  return (
    <nav aria-label="pagination">
      <ul className="pagination">
        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
          <button
            className="page-link"
            onClick={() => onChange(currentPage - 1)}
            aria-label="Previous"
          >
            &laquo;
          </button>
        </li>
        {pages.map((p, idx) => {
          if (p === "prev-ellipsis" || p === "next-ellipsis") {
            return (
              <li key={idx} className="page-item disabled">
                <span className="page-link">…</span>
              </li>
            );
          }
          return (
            <li
              key={p}
              className={`page-item ${p === currentPage ? "active" : ""}`}
            >
              <button className="page-link" onClick={() => onChange(p)}>
                {p}
              </button>
            </li>
          );
        })}
        <li
          className={`page-item ${
            currentPage === totalPages ? "disabled" : ""
          }`}
        >
          <button
            className="page-link"
            onClick={() => onChange(currentPage + 1)}
            aria-label="Next"
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};

const Products = () => {
  const { categoryId } = useParams(); // comes from URL if present
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeCategoryId, setActiveCategoryId] = useState(
    categoryId || null
  ); // local override
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState(null);
  const [errorCats, setErrorCats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // page from query params
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1
  );

  // keep URL param and local state in sync when URL changes (e.g., manual nav)
  useEffect(() => {
    setActiveCategoryId(categoryId || null);
  }, [categoryId]);

  // Fetch categories for sidebar
  useEffect(() => {
    setLoadingCats(true);
    axios
      .get("http://localhost:8000/api/categories/")
      .then((res) => {
        setCategories(res.data);
        setLoadingCats(false);
      })
      .catch((err) => {
        console.error("Category fetch error:", err);
        setErrorCats("Failed to load categories.");
        setLoadingCats(false);
      });
  }, []);

  // Fetch products when activeCategoryId changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchProducts = async () => {
      try {
        let prodUrl = "http://localhost:8000/api/products/";
        if (activeCategoryId) {
          prodUrl = `http://localhost:8000/api/products/?category_id=${activeCategoryId}`;
          try {
            const catRes = await axios.get(
              `http://localhost:8000/api/categories/${activeCategoryId}/`
            );
            setCategoryName(catRes.data.name || "Category");
          } catch {
            setCategoryName("Products");
          }
        } else {
          setCategoryName("All");
        }

        const prodRes = await axios.get(prodUrl);
        setAllProducts(prodRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        console.error("Product fetch error:", err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // reset to first page when category changes
    setSearchParams({ page: "1" });
  }, [activeCategoryId]);

  // Apply search filter
  useEffect(() => {
    let filtered = allProducts;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = allProducts.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(lower)) ||
          (p.description && p.description.toLowerCase().includes(lower))
      );
    }
    setProducts(filtered);
    setSearchParams({ page: "1" });
  }, [searchTerm, allProducts]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const paginated = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleCategoryClick = (cid) => {
    if (cid) {
      setActiveCategoryId(cid);
      navigate(`/products/${cid}`);
    } else {
      setActiveCategoryId(null); // clear filter, fetch all
      // do NOT navigate so URL stays as-is
    }
  };

  const isActiveCat = (cid) => {
    if (!cid && !activeCategoryId) return true;
    return String(cid) === String(activeCategoryId);
  };

  const setPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setSearchParams({ page: String(safe) });
  };

  return (
    <div>
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <div className="container mt-4">
        <div className="row">
          {/* Sidebar */}
          <div className="col-md-3 mb-4">
            <div
              className="border rounded p-3 sticky-top"
              style={{ top: "1rem" }}
            >
              <h5 className="mb-3">Categories</h5>
              {loadingCats ? (
                <div>Loading categories...</div>
              ) : errorCats ? (
                <div className="alert alert-danger">{errorCats}</div>
              ) : (
                <ul className="list-group">
                  <li
                    className={`list-group-item ${
                      isActiveCat(null) ? "active" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleCategoryClick(null)}
                  >
                    All
                  </li>
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className={`list-group-item d-flex align-items-center ${
                        isActiveCat(cat.id) ? "active" : ""
                      }`}
                      style={{ cursor: "pointer", gap: "0.75rem" }}
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          flexShrink: 0,
                          overflow: "hidden",
                          borderRadius: 4,
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        <img
                          src={cat.image_url || SMALL_FALLBACK}
                          alt={cat.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = SMALL_FALLBACK;
                          }}
                        />
                      </div>
                      <span className="flex-grow-1">{cat.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="col-md-9">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="mb-0">{categoryName}</h2>
              <div>
                <small>
                  Showing {paginated.length} of {products.length} products
                </small>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div>Loading products...</div>
            ) : products.length === 0 ? (
              <div>
                No products found
                {categoryName !== "All" ? ` in this category` : ""}.
              </div>
            ) : (
              <>
                <div className="row">
                  {paginated.map((product) => (
                    <div className="col-md-4 mb-4" key={product.id}>
                      <div className="card h-100 shadow-sm">
                        <div
                          style={{
                            width: "100%",
                            height: "180px",
                            overflow: "hidden",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          <img
                            src={product.image_url || FALLBACK_IMG}
                            alt={product.name}
                            className="card-img-top"
                            style={{
                              objectFit: "cover",
                              width: "100%",
                              height: "100%",
                            }}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_IMG;
                            }}
                          />
                        </div>
                        <div className="card-body d-flex flex-column">
                          <h5 className="card-title">{product.name}</h5>
                          <p
                            className="card-text text-truncate"
                            style={{ flexGrow: 1 }}
                          >
                            {product.description}
                          </p>
                          <div className="mt-2">
                            <p className="mb-1 fw-bold">₹{product.price}</p>
                            <p className="mb-1">
                              In stock:{" "}
                              {typeof product.quantity !== "undefined"
                                ? product.quantity
                                : "N/A"}
                            </p>
                          </div>
                          <div className="container">
                            <button className="btn btn-primary center">
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination controls */}
                <div className="d-flex justify-content-center mt-3">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
