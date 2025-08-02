import { useState } from "react";
import axios from "axios";

const Signup = () => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const isEmailValid = /\S+@\S+\.\S+/.test(form.email);
  const isPasswordMatch = form.password === form.confirm_password;
  const isPasswordStrong = form.password.trim().length >= 6; // adjust policy as needed
  const isDobValid = Boolean(form.dob); // could add more validation (e.g., age >= 13)
  const isNameValid = form.first_name.trim() && form.last_name.trim();

  const isFormValid =
    isEmailValid &&
    isPasswordMatch &&
    isPasswordStrong &&
    isDobValid &&
    isNameValid;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dob: form.dob,
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      };

      const res = await axios.post(
        "http://localhost:8000/api/signup/",
        payload
      );
      // Adjust based on backend response (e.g., auto-login, verification email, etc.)
      setSuccessMsg("Signup successful.");
      // Optionally clear form:
      setForm({
        first_name: "",
        last_name: "",
        dob: "",
        email: "",
        password: "",
        confirm_password: "",
      });
    } catch (err) {
      console.error("Signup error:", err);
      if (err.response?.data) {
        // Try to extract a message
        const detail =
          err.response.data.detail ||
          err.response.data.error ||
          JSON.stringify(err.response.data);
        setError(detail);
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4 text-center">Sign Up</h2>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success" role="alert">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="first_name" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  className={`form-control ${
                    form.first_name && !form.first_name.trim()
                      ? "is-invalid"
                      : ""
                  }`}
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
                {!form.first_name.trim() && (
                  <div className="invalid-feedback">First name required.</div>
                )}
              </div>
              <div className="col-md-6">
                <label htmlFor="last_name" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  className={`form-control ${
                    form.last_name && !form.last_name.trim() ? "is-invalid" : ""
                  }`}
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
                {!form.last_name.trim() && (
                  <div className="invalid-feedback">Last name required.</div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="dob" className="form-label">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  className={`form-control ${!isDobValid ? "is-invalid" : ""}`}
                  value={form.dob}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split("T")[0]} // no future date
                />
                {!isDobValid && (
                  <div className="invalid-feedback">
                    Date of birth required.
                  </div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-control ${
                    form.email && !isEmailValid ? "is-invalid" : ""
                  }`}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
                {form.email && !isEmailValid && (
                  <div className="invalid-feedback">Enter a valid email.</div>
                )}
              </div>

              <div className="col-12 position-relative">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    className={`form-control ${
                      form.password && !isPasswordStrong ? "is-invalid" : ""
                    }`}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
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
                {form.password && !isPasswordStrong && (
                  <div className="invalid-feedback">
                    Password must be at least 6 characters.
                  </div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="confirm_password" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  className={`form-control ${
                    form.confirm_password && !isPasswordMatch
                      ? "is-invalid"
                      : ""
                  }`}
                  value={form.confirm_password}
                  onChange={handleChange}
                  required
                />
                {form.confirm_password && !isPasswordMatch && (
                  <div className="invalid-feedback">
                    Passwords do not match.
                  </div>
                )}
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={!isFormValid || loading}
                >
                  {loading ? "Signing up..." : "Sign Up"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-3 text-center">
            <small>
              Already have an account? <a href="/login">Login</a>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
