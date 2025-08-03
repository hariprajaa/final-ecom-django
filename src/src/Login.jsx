import { useState } from "react";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // simple email regex (not perfect but reasonable client-side)
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isFormValid = isEmailValid && password.trim().length > 0;

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!isFormValid) return;

  setLoading(true);
  setError(null);
  try {
    const res = await axios.post("http://localhost:8000/api/login/", {
      email,
      password,
    });

    const { access, user } = res.data; // assuming backend returns access token named "access"

    // save the access token so you can use it for later requests
    localStorage.setItem("authToken", access);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("access", access);
    window.dispatchEvent(new Event("authChanged"));
    // redirect to home page
    window.location.href = "/";
  } catch (err) {
    if (err.response) {
      setError(
        err.response.data.detail ||
          err.response.data.error ||
          "Invalid credentials"
      );
    } else {
      setError("Network error. Try again.");
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4 text-center">Login</h2>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className={`form-control ${
                  email && !isEmailValid ? "is-invalid" : ""
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              {email && !isEmailValid && (
                <div className="invalid-feedback">Enter a valid email.</div>
              )}
            </div>

            <div className="mb-3 position-relative">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={!isFormValid || loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-3 text-center">
            <small>
              Don't have an account? <a href="/signup">Signup</a>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
