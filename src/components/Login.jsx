import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import { Link } from "react-router-dom"; // Import Link component

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate(); // To navigate after successful login

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here (validation, sending data to backend, etc.)
    if (email && password) {
      alert("Login Successful!");
      navigate("/"); // Redirect to home page after login
    } else {
      setErrors({ message: "Please fill in both fields" });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="Enter your email"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Enter your password"
          />
        </div>

        {errors.message && <p style={styles.error}>{errors.message}</p>}

        <button type="submit" style={styles.button}>
          Login
        </button>
      </form>

      <p style={styles.signupLink}>
        Don't have an account?{" "}
        <Link to="/signup" style={styles.link}>Sign Up</Link>
      </p>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  title: {
    textAlign: "center",
    fontSize: "28px",
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "16px",
    marginBottom: "5px",
    color: "#333",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "10px",
    backgroundColor: "#FFA500",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  error: {
    color: "#e74c3c",
    fontSize: "14px",
  },
  signupLink: {
    textAlign: "center",
    marginTop: "10px",
  },
  link: {
    textDecoration: "none",
    color: "#FFA500",
    fontWeight: "bold",
  },
};

export default Login;
