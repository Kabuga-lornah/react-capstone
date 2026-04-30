import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./pages/AuthContext";
import { auth } from "./pages/firebaseconfig"; 
import { PetPouchContext } from './pages/PetPouchContext';



const Navbar = () => {
  const { user, userData, isRehomer } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  // const [petPouchCount, setPetPouchCount] = useState(0);
  const navigate = useNavigate();
  const { petPouchCount } = useContext(PetPouchContext);

 

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
    setShowDropdown(false);
  };

  return (
    <nav className="navbar">
      
      <div className="nav-container">
        <Link to="/" className="logo">My FurryFriends</Link>
        
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/pets" className="nav-link">Browse Pets</Link>
          <Link to="/quiz" className="nav-link">Quiz</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          <Link to="/my-listing" className="nav-link">My Listings</Link>
          {user && (
            <Link to="/pet-pouch" className="nav-link">
              <div>Pet Pouch: {petPouchCount}</div>
            </Link>
            
          )}
           <Link to="/contact" className="nav-link">Contact Us</Link>
        </div>

        <div className="auth-section">
          {user ? (
            <div className="user-menu">
              {isRehomer() && (
                <Link to="/rehomer-dashboard" className="nav-link">Dashboard</Link>
              )}
              
              <div 
                className="user-icon"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              
              {showDropdown && (
                <div className="dropdown-menu">
                  <button onClick={handleLogout} className="dropdown-item">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="login-container">
              <button 
                onClick={() => setShowLoginOptions(!showLoginOptions)}
                className="login-button"
              >
                Login
              </button>
              
              {showLoginOptions && (
                <div className="login-dropdown">
                  <Link 
                    to="/login/user" 
                    className="login-option"
                    onClick={() => setShowLoginOptions(false)}
                  >
                    As User
                  </Link>
                  <Link 
                    to="/login/rehomer" 
                    className="login-option"
                    onClick={() => setShowLoginOptions(false)}
                  >
                    As Rehomer
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = `
  .navbar {
    background-color: #FFA500;
    padding: 1rem 2rem;
    position: relative;
    z-index: 100;
  }
  
  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .logo {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    text-decoration: none;
  }
  
  .nav-links {
    display: flex;
    gap: 2rem;
  }
  
  .nav-link {
    color: white;
    text-decoration: none;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .nav-link:hover {
    opacity: 0.8;
  }
  
  .auth-section {
    position: relative;
  }
  
  .user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .user-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: white;
    color: #FFA500;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s;
  }
  
  .user-icon:hover {
    transform: scale(1.05);
  }
  
  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 0.5rem;
    min-width: 120px;
  }
  
  .dropdown-item {
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    padding: 0.5rem;
    cursor: pointer;
    color: #333;
  }
  
  .dropdown-item:hover {
    background-color: #f5f5f5;
  }
  
  .login-container {
    position: relative;
  }
  
  .login-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .login-button:hover {
    background-color: rgba(255,255,255,0.1);
  }
  
  .login-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 0.5rem;
    min-width: 120px;
  }
  
  .login-option {
    display: block;
    padding: 0.5rem;
    color: #FFA500;
    text-decoration: none;
  }
  
  .login-option:hover {
    background-color: #f5f5f5;
  }
`;

// Inject styles
const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default Navbar;