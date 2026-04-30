import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom"; // Added Link import
import { auth } from "../pages/firebaseconfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";

const Signup = () => {
  const { type } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      // 1. Create user account with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Update user profile with display name
      await updateProfile(user, {
        displayName: name
      });

      // 3. Save additional user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        isRehomer: type === "rehomer",
        userType: type,
        createdAt: new Date(),
      });

      // 4. Immediate redirect after successful signup
      if (type === "rehomer") {
        navigate("/rehomer-dashboard");
      } else {
        // For regular users, redirect to login with success state
        navigate("/login/user", { 
          state: { 
            signupSuccess: true,
            email: user.email 
          } 
        });
      }
      
    } catch (err) {
      // Enhanced error handling
      let errorMessage = "Signup failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }
      setError(errorMessage);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sign Up as {type === "rehomer" ? "Rehomer" : "User"}</h2>
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

        <button type="submit" style={styles.button}>
          Create Account
        </button>

        <div style={styles.loginLink}>
          Already have an account?{" "}
          <Link 
            to={`/login/${type}`} 
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