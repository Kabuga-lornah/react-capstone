import React, { useState } from "react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(true);
  };

  const hideDropdown = () => {
    setShowDropdown(false);
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.left}>
        <h1 style={styles.title}>
          <span style={styles.paw}>🐾</span> 
          <span style={styles.titleText}>My FurryFriends</span>
        </h1>
      </div>

      <ul style={styles.links}>
        <li style={styles.link}>
          <Link to="/" style={styles.navLink}>Home</Link>
        </li>
        <li style={styles.link}>
          <Link to="/quiz" style={styles.navLink}>Quiz</Link>
        </li>
        <li
          style={{ ...styles.link, position: "relative" }}
          onMouseEnter={toggleDropdown}
          onMouseLeave={hideDropdown}
        >
          Categories
          {showDropdown && (
            <ul style={styles.dropdown}>
              <li style={styles.dropdownItem}>Pet Type</li>
              <li style={styles.dropdownItem}>Personality</li>
              <li style={styles.dropdownItem}>Lifestyle</li>
              <li style={styles.dropdownItem}>Appearance</li>
              <li style={styles.dropdownItem}>Purpose</li>
            </ul>
          )}
        </li>
        <li style={styles.link}>Blog</li>
        <li style={styles.link}>Contact Us</li>
      </ul>

      <div style={styles.right}>
        {/* Wrap the Login button with Link */}
        <Link to="/login" style={styles.link}>
          <button style={styles.button}>Login</button>
        </Link>
        <button style={styles.button}>Pet Pouch</button>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    backgroundColor: "#FFA500", 
    boxShadow: "0 2px 4px rgb(244, 91, 8)",
    position: "relative",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    fontFamily: "Playfair Display, serif", 
    fontSize: "24px",
    color: "#ffffff",
    fontWeight: "bold",
    margin: 0,
    fontFamily: "'Playfair Display', serif", 
    display: "flex",
    alignItems: "center",
  },
  paw: {
    fontSize: "30px", 
    marginRight: "8px",
  },
  titleText: {
    fontSize: "26px", 
    color: "#ffffff",
    fontWeight: "bold",
  },
  links: {
    display: "flex",
    listStyle: "none",
    gap: "20px",
    margin: 0,
    padding: 0,
  },
  link: {
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "500",
    position: "relative",
  },
  navLink: {
    textDecoration: "none", 
    color: "#ffffff", 
    fontWeight: "500",
  },
  dropdown: {
    position: "absolute",
    top: "35px",
    left: 0,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    listStyle: "none",
    padding: "8px 0",
    margin: 0,
    borderRadius: "6px",
    zIndex: 1000,
    minWidth: "120px",
  },
  dropdownItem: {
    padding: "8px 16px",
    color: "#333",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  right: {
    display: "flex",
    gap: "12px",
  },
  button: {
    backgroundColor: "transparent",
    border: "1px solid #ffffff",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
  },
};

export default Navbar;
