// src/components/Products.jsx

import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  createSearchParams,
} from "react-router-dom";
import axios from "axios";

const FALLBACK_IMG = "https://via.placeholder.com/300x200?text=No+Image";
const SMALL_FALLBACK = "https://via.placeholder.com/36";
const PAGE_SIZE = 9;

const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();

  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("access") || !!localStorage.getItem("authToken")
  );

  useEffect(() => {
    const updateAuth = () => {
      setAuthenticated(
        !!localStorage.getItem("access") || !!localStorage.getItem("authToken")
      );
    };

    window.addEventListener("storage", updateAuth);
    window.addEventListener("authChanged", updateAuth);
    updateAuth();
    return () => {
      window.removeEventListener("storage", updateAuth);
      window.removeEventListener("authChanged", updateAuth);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    window.dispatchEvent(new Event("authChanged"));
    setAuthenticated(false);
    navigate("/");
  };

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
          {authenticated ? (
            <button className="btn btn-outline-danger" onClick={logout}>
              Logout
            </button>
          ) : (
            <>
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
            </>
          )}
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
  const { categoryId: paramCategoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Unified source of truth for URL state
  const urlState = {
    page: parseInt(searchParams.get("page") || "1", 10),
    categoryId: searchParams.get("category_id") || paramCategoryId || null,
    query: searchParams.get("q") || "",
  };

  const [searchTerm, setSearchTerm] = useState(urlState.query);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("All");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState(null);
  const [errorCats, setErrorCats] = useState(null);

  // Keep the URL and local state in sync
  const syncURL = (opts = {}) => {
    const params = createSearchParams({
      page: opts.page !== undefined ? opts.page : urlState.page,
      q: opts.q !== undefined ? opts.q : urlState.query,
      // only include category if there's no active search
      ...(opts.category_id !== undefined
        ? { category_id: opts.category_id }
        : !debouncedSearch && urlState.categoryId
        ? { category_id: urlState.categoryId }
        : {}),
    });
    setSearchParams(params, { replace: true });
  };

  // Fetch categories (once)
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

  // Fetch products: if there's a search term, ignore category filter
  useEffect(() => {
    const fetchSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (!debouncedSearch && urlState.categoryId) {
          params.set("category_id", urlState.categoryId);
        }
        if (debouncedSearch) {
          params.set("q", debouncedSearch);
        }
        params.set("page", urlState.page);

        const res = await axios.get(
          `http://localhost:8000/api/product_search/?${params.toString()}`
        );
        const data = res.data;
        setProducts(data.results);
        setTotal(data.total);
        setTotalPages(data.pages);

        // categoryName: if searching, always show "All"
        if (debouncedSearch) {
          setCategoryName("All");
        } else if (urlState.categoryId) {
          const cat = categories.find(
            (c) => String(c.id) === String(urlState.categoryId)
          );
          setCategoryName(cat ? cat.name : "Category");
        } else {
          setCategoryName("All");
        }

        // sync searchTerm if it drifted
        if (searchTerm !== debouncedSearch) {
          setSearchTerm(debouncedSearch);
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };

    fetchSearch();
  }, [urlState.categoryId, debouncedSearch, urlState.page, categories]);

  const handleCategoryClick = (cid) => {
    syncURL({ page: 1, category_id: cid, q: "" }); // clears search when selecting category
  };

  const clearCategory = () => {
    syncURL({ page: 1, category_id: null, q: "" });
  };

  const setPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    syncURL({
      page: safe,
      category_id: debouncedSearch ? null : urlState.categoryId,
      q: debouncedSearch,
    });
  };

  const isActiveCat = (cid) => {
    if (debouncedSearch) return false; // search overrides category highlighting
    if (!cid && !urlState.categoryId) return true;
    return String(cid) === String(urlState.categoryId);
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
                    onClick={clearCategory}
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
                  Showing {products.length} of {total} products
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
                  {products.map((product) => (
                    <div className="col-md-4 mb-4" key={product.product_id}>
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
                              objectFit: "contain",
                              width: "100%",
                              height: "200px",
                              backgroundColor: "#f8f9fa",
                              padding: "10px",
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
                    currentPage={urlState.page}
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
