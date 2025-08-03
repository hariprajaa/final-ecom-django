// src/components/Categories.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SMALL_FALLBACK = "https://via.placeholder.com/36";
const PAGE_SIZE = 9;

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate({
        pathname: "/products",
        search: `?q=${encodeURIComponent(searchTerm.trim())}&page=1`,
      });
    } else {
      navigate("/products");
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container">
        <div className="d-flex align-items-center">
          <span
            className="navbar-brand fw-bold mb-0"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            MyStore
          </span>
          <span
            className="nav-link ms-3"
            style={{ cursor: "pointer", padding: 0 }}
            onClick={() => navigate("/products")}
          >
            All Products
          </span>
        </div>

        <div className="d-flex flex-grow-1 justify-content-center">
          <form
            onSubmit={handleSearchSubmit}
            className="w-50"
            style={{ margin: 0 }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Search categories..."
              aria-label="Search categories"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
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
                onClick={() => navigate("/Login")}
              >
                Login
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/SignUp")}
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

const Pagination = ({
  currentPage,
  totalPages,
  onChange,
  showAll,
  setShowAll,
}) => {
  if (totalPages <= 1 && !showAll) return null;

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
    <div className="d-flex flex-column align-items-center gap-2">
      <nav aria-label="categories pagination">
        <ul className="pagination mb-0">
          <li
            className={`page-item ${
              currentPage === 1 || showAll ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() => {
                setShowAll(false);
                onChange(currentPage - 1);
              }}
              aria-label="Previous"
              disabled={currentPage === 1 || showAll}
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
                className={`page-item ${
                  !showAll && p === currentPage ? "active" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => {
                    setShowAll(false);
                    onChange(p);
                  }}
                  disabled={showAll}
                >
                  {p}
                </button>
              </li>
            );
          })}
          <li
            className={`page-item ${
              currentPage === totalPages || showAll ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() => {
                setShowAll(false);
                onChange(currentPage + 1);
              }}
              aria-label="Next"
              disabled={currentPage === totalPages || showAll}
            >
              &raquo;
            </button>
          </li>
          <li className="page-item">
            <button
              className={`page-link ${showAll ? "active" : ""}`}
              onClick={() => setShowAll(true)}
            >
              All
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const Categories = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [displayed, setDisplayed] = useState([]); // filtered by search
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoadingCats(true);
    axios
      .get("http://localhost:8000/api/categories/")
      .then((res) => {
        setCategories(res.data);
        setDisplayed(res.data);
        setLoadingCats(false);
      })
      .catch((err) => {
        console.error("Category fetch error:", err);
        setError("Failed to load categories.");
        setLoadingCats(false);
      });
  }, []);

  useEffect(() => {
    let filtered = categories;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = categories.filter((c) =>
        c.name?.toLowerCase().includes(lower)
      );
    }
    setDisplayed(filtered);
    setCurrentPage(1); // reset when filter changes
    setShowAll(false);
  }, [searchTerm, categories]);

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const paginated = showAll
    ? displayed
    : displayed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCategoryClick = (categoryId) => {
    navigate(`/products/${categoryId}`);
  };

  const handlePageChange = (page) => {
    const safe = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(safe);
    setShowAll(false);
  };
  return (
    <div>
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="mb-0">Product Categories</h2>
          <div>
            <small>
              Showing {paginated.length} of {displayed.length} categories
            </small>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loadingCats ? (
          <div>Loading categories...</div>
        ) : paginated.length === 0 ? (
          <div>No categories match your search.</div>
        ) : (
          <>
            <div className="row">
              {paginated.map((cat) => (
                <div className="col-md-4 mb-4" key={cat.id}>
                  <div
                    className="card h-100 shadow-sm"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "220px", // a bit taller for professional look
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f8f9fa",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        overflow: "hidden",
                        padding: "10px",
                      }}
                    >
                      <img
                        src={cat.image_url || SMALL_FALLBACK}
                        alt={cat.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain", // ✅ keeps whole image visible
                        }}
                        onError={(e) => {
                          e.currentTarget.src = SMALL_FALLBACK;
                        }}
                      />
                    </div>

                    <div className="card-body d-flex flex-column justify-content-center">
                      <h5 className="card-title text-center">{cat.name}</h5>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={handlePageChange}
              showAll={showAll}
              setShowAll={setShowAll}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
