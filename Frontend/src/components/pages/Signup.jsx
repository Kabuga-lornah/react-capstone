import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../../services/api";
import { useAuth } from "./AuthContext";

const mapRouteTypeToRole = (type) => {
  if (type === "rehomer") {
    return "rehomer";
  }

  if (type === "shelter") {
    return "shelter_admin";
  }

  return "adopter";
};

const getRouteLabel = (type) => {
  if (type === "rehomer") {
    return "Rehomer";
  }

  if (type === "shelter") {
    return "Shelter";
  }

  return "User";
};

const getRedirectPath = (role) => {
  if (role === "rehomer") {
    return "/rehomer-dashboard";
  }

  if (role === "shelter_admin") {
    return "/";
  }

  return "/pets";
};

const splitName = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const Signup = () => {
  const { type } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { firstName, lastName } = splitName(name);
      const role = mapRouteTypeToRole(type);

      await registerUser({
        username: normalizedEmail,
        email: normalizedEmail,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      });

      const tokenResponse = await loginUser({
        username: normalizedEmail,
        password,
      });

      const profile = await getCurrentUser();
      setAuthenticatedUser(profile, {
        access: tokenResponse.access,
        refresh: tokenResponse.refresh,
      });

      navigate(getRedirectPath(profile.role), { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sign Up as {getRouteLabel(type)}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.error}>
            <p>{error}</p>
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="Enter your full name"
            required
            autoFocus
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="Enter your email"
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Create a password (min 6 characters)"
            required
            minLength="6"
          />
        </div>

        <button type="submit" style={styles.button} disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>

        <div style={styles.loginLink}>
          Already have an account?{" "}
          <Link
            to={`/login/${type === "rehomer" || type === "shelter" ? type : "user"}`}
            style={styles.link}
          >
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "450px",
    margin: "40px auto",
    padding: "30px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  title: {
    textAlign: "center",
    fontSize: "28px",
    color: "#333",
    marginBottom: "24px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    color: "#555",
    fontWeight: "500",
  },
  input: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    transition: "border-color 0.3s",
  },
  button: {
    padding: "14px",
    backgroundColor: "#FFA500",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
    marginTop: "10px",
    "&:hover": {
      backgroundColor: "#e69500",
    },
  },
  error: {
    color: "#e74c3c",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "10px",
    padding: "10px",
    backgroundColor: "#fdecea",
    borderRadius: "4px",
  },
  loginLink: {
    textAlign: "center",
    marginTop: "20px",
    color: "#666",
    fontSize: "14px",
  },
  link: {
    color: "#FFA500",
    fontWeight: "600",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
};

export default Signup;
