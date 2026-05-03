import React, { useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  clearTokens,
  getCurrentUser,
  loginUser,
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

const getLoginLinkType = (type) => (type === "rehomer" || type === "shelter" ? type : "user");

const Login = () => {
  const { type } = useParams();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(location.state?.successMessage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setAuthenticatedUser, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const expectedRole = mapRouteTypeToRole(type);

      const tokenResponse = await loginUser({
        username: normalizedEmail,
        password,
      });

      const profile = await getCurrentUser();

      if (profile.role !== expectedRole) {
        clearTokens();
        logout();
        setError(
          `Please login through the ${profile.role === "rehomer" ? "rehomer" : profile.role === "shelter_admin" ? "shelter" : "user"} login page`,
        );
        return;
      }

      setAuthenticatedUser(profile, {
        access: tokenResponse.access,
        refresh: tokenResponse.refresh,
      });

      navigate(getRedirectPath(profile.role), { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login as {getRouteLabel(type)}</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <button type="submit" style={styles.button} disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
      <div style={styles.signupLink}>
        Don't have an account?{" "}
        <Link
          to={`/signup/${getLoginLinkType(type)}`}
          style={styles.link}
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "2rem auto",
    padding: "2rem",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontWeight: "500",
  },
  input: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem",
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "1rem",
    "&:hover": {
      backgroundColor: "#e69500",
    },
  },
  error: {
    color: "red",
    textAlign: "center",
    margin: "1rem 0",
  },
  signupLink: {
    textAlign: "center",
    marginTop: "1.5rem",
  },
  link: {
    color: "#FFA500",
    fontWeight: "500",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
};

export default Login;
