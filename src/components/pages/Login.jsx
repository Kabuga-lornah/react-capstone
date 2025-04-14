import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { auth } from "./firebaseconfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseconfig";

const Login = () => {
  const { type } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if ((type === "rehomer" && !userData.isRehomer) || 
            (type !== "rehomer" && userData.isRehomer)) {
          setError(`Please login through the ${userData.isRehomer ? 'rehomer' : 'user'} login page`);
          await auth.signOut();
          return;
        }
        
        if (userData.isRehomer) {
          navigate("/rehomer-dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else {
        setError("User data not found. Please complete your registration.");
        await auth.signOut();
      }
    } catch (err) {
      setError(
        err.message.includes("user-not-found") 
          ? "No account found with this email"
          : err.message.includes("wrong-password")
          ? "Incorrect password"
          : "Login failed. Please try again."
      );
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login as {type === "rehomer" ? "Rehomer" : "User"}</h2>
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
        <button type="submit" style={styles.button}>Login</button>
      </form>
      <div style={styles.signupLink}>
        Don't have an account?{' '}
        <Link 
          to={type === "rehomer" ? "/signup/rehomer" : "/signup/user"} 
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