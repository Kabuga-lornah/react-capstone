import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
} from "../services/api";
import { useAuth } from "./pages/AuthContext";
import { PetPouchContext } from "./pages/PetPouchContext";

const getNavLinksByRole = (role, petPouchCount, isVerifiedRehomer) => {
  if (role === "rehomer" || role === "shelter_admin") {
    const links = [
      { label: "Dashboard", to: "/rehomer-dashboard" },
      { label: "My Pets", to: "/rehomer-dashboard?tab=pets" },
      { label: "Requests", to: "/rehomer-dashboard?tab=requests" },
      { label: "Adoption Tips", to: "/rehomer-dashboard?tab=tips" },
      { label: "Public Listings", to: "/pets" },
      { label: "Contact Us", to: "/contact" },
    ];

    if (isVerifiedRehomer) {
      links.splice(1, 0, { label: "Add Pet", to: "/add-pet", cta: true });
    }

    return links;
  }

  if (role === "adopter" || role === "user") {
    return [
      { label: "Home", to: "/" },
      { label: "Browse Pets", to: "/pets" },
      { label: "Quiz", to: "/quiz" },
      { label: `Pet Pouch${typeof petPouchCount === "number" ? ` ${petPouchCount}` : ""}`, to: "/pet-pouch" },
      { label: "My Applications", to: "/my-listing" },
      { label: "Contact Us", to: "/contact" },
    ];
  }

  return [
    { label: "Home", to: "/" },
    { label: "Browse Pets", to: "/pets" },
    { label: "Quiz", to: "/quiz" },
    { label: "Blog", to: "/blog" },
    { label: "Contact Us", to: "/contact" },
  ];
};

const getMobilePrimaryLinks = (role, petPouchCount, isVerifiedRehomer, notificationCount) => {
  if (role === "rehomer" || role === "shelter_admin") {
    return [
      { label: "Home", to: "/rehomer-dashboard", icon: "🏠" },
      { label: isVerifiedRehomer ? "Add Pet" : "My Pets", to: isVerifiedRehomer ? "/add-pet" : "/rehomer-dashboard?tab=pets", icon: isVerifiedRehomer ? "➕" : "🐶" },
      { label: "Requests", to: "/rehomer-dashboard?tab=requests", icon: "💌", badge: notificationCount > 0 ? notificationCount : null },
      { label: "Listings", to: "/pets", icon: "🐾" },
      { label: "Profile", to: "/rehomer-profile", icon: "👤" },
    ];
  }

  if (role === "adopter" || role === "user") {
    return [
      { label: "Home", to: "/", icon: "🏠" },
      { label: "Pets", to: "/pets", icon: "🐾" },
      { label: "Quiz", to: "/quiz", icon: "✨" },
      { label: "Pouch", to: "/pet-pouch", icon: "🧡", badge: typeof petPouchCount === "number" && petPouchCount > 0 ? petPouchCount : null },
      { label: "Apps", to: "/my-listing", icon: "📋" },
    ];
  }

  return [
    { label: "Home", to: "/", icon: "🏠" },
    { label: "Pets", to: "/pets", icon: "🐾" },
    { label: "Quiz", to: "/quiz", icon: "✨" },
    { label: "Blog", to: "/blog", icon: "📖" },
    { label: "Login", to: "/login/user", icon: "👤" },
  ];
};

const isLinkActive = (location, to) => {
  if (to.includes("?")) {
    return `${location.pathname}${location.search}` === to;
  }

  if (to === "/") {
    return location.pathname === "/";
  }

  return location.pathname === to;
};

const formatNotificationTime = (value) => {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return timestamp.toLocaleDateString();
};

const Navbar = () => {
  const { user, userData, logout } = useAuth();
  const { petPouchCount } = useContext(PetPouchContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const role = userData?.role || user?.role || null;
  const isVerifiedRehomer = userData?.rehomer_verification_status === "verified";
  const isPetManager = role === "rehomer" || role === "shelter_admin";
  const navLinks = useMemo(
    () => getNavLinksByRole(role, petPouchCount, isVerifiedRehomer),
    [role, petPouchCount, isVerifiedRehomer],
  );
  const mobilePrimaryLinks = useMemo(
    () => getMobilePrimaryLinks(role, petPouchCount, isVerifiedRehomer, notificationCount),
    [role, petPouchCount, isVerifiedRehomer, notificationCount],
  );

  const fetchUnreadCount = async () => {
    if (!user || !isPetManager) {
      setNotificationCount(0);
      return;
    }

    try {
      const response = await getUnreadNotificationCount();
      setNotificationCount(response?.count || 0);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user || !isPetManager) {
      setNotifications([]);
      return;
    }

    try {
      setNotificationsLoading(true);
      const response = await listNotifications();
      setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setShowNotifications(false);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
    setShowNotifications(false);
  };

  useEffect(() => {
    if (!showDropdown && !showNotifications) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showDropdown, showNotifications]);

  useEffect(() => {
    if (!user || !isPetManager) {
      setNotifications([]);
      setNotificationCount(0);
      return undefined;
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => clearInterval(interval);
  }, [user, isPetManager]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [showNotifications]);

  const handleMenuNavigate = (to) => {
    closeMenus();
    navigate(to);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
        setNotificationCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }

    closeMenus();
    if (notification.pet?.id) {
      navigate(`/pet/${notification.pet.id}`);
    }
  };

  const displayName = userData?.displayName || user?.displayName || user?.email || "User";
  const displayEmail = userData?.email || user?.email || "";
  const avatarInitial =
    displayName?.charAt(0)?.toUpperCase() || displayEmail?.charAt(0)?.toUpperCase() || "U";
  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const verificationLabelMap = {
    incomplete: "Incomplete",
    pending: "Pending Review",
    verified: "Verified",
    rejected: "Rejected",
  };

  return (
    <nav className="mff-navbar">
      <div className="mff-navbar__container">
        <Link to="/" className="mff-navbar__logo" onClick={closeMenus}>
          My FurryFriends
        </Link>

        <button
          type="button"
          className="mff-navbar__toggle"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`mff-navbar__content ${mobileMenuOpen ? "mff-navbar__content--open" : ""}`}>
          <div className="mff-navbar__links">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenus}
                className={`mff-navbar__link ${
                  link.cta ? "mff-navbar__link--cta" : ""
                } ${
                  isLinkActive(location, link.to) ? "mff-navbar__link--active" : ""
                }`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="mff-navbar__auth">
            {user ? (
              <div className="mff-navbar__user" ref={dropdownRef}>
                {isPetManager && (
                  <button
                    type="button"
                    className="mff-navbar__notification-button"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowNotifications((current) => !current);
                    }}
                    aria-label="Open notifications"
                  >
                    <span className="mff-navbar__notification-icon">🔔</span>
                    {notificationCount > 0 && (
                      <span className="mff-navbar__notification-count">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="mff-navbar__avatar"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowDropdown((current) => !current);
                  }}
                  aria-label="Open user menu"
                >
                  {userData?.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt={displayName}
                      className="mff-navbar__avatar-image"
                    />
                  ) : (
                    avatarInitial
                  )}
                </button>

                {showNotifications && isPetManager && (
                  <div className="mff-navbar__dropdown mff-navbar__dropdown--notifications">
                    <div className="mff-navbar__dropdown-header mff-navbar__dropdown-header--stacked">
                      <div className="mff-navbar__dropdown-name">Notifications</div>
                      <div className="mff-navbar__dropdown-email">
                        Wishlist saves and interest from adopters
                      </div>
                    </div>

                    <div className="mff-navbar__notifications-list">
                      {notificationsLoading ? (
                        <div className="mff-navbar__notifications-state">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="mff-navbar__notifications-state">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className={`mff-navbar__notification-item ${
                              notification.read ? "" : "mff-navbar__notification-item--unread"
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="mff-navbar__notification-topline">
                              <span className="mff-navbar__notification-title">
                                {notification.title}
                              </span>
                              <span className="mff-navbar__notification-time">
                                {formatNotificationTime(notification.created_at)}
                              </span>
                            </div>
                            <div className="mff-navbar__notification-message">
                              {notification.message}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {showDropdown && (
                  <div className="mff-navbar__dropdown">
                    <div className="mff-navbar__dropdown-header">
                      <div className="mff-navbar__dropdown-avatar">
                        {userData?.profile_photo_url ? (
                          <img
                            src={userData.profile_photo_url}
                            alt={displayName}
                            className="mff-navbar__dropdown-avatar-image"
                          />
                        ) : (
                          avatarInitial
                        )}
                      </div>
                      <div className="mff-navbar__dropdown-meta">
                        <div className="mff-navbar__dropdown-name">{displayName}</div>
                        <div className="mff-navbar__dropdown-email">{displayEmail}</div>
                        {(role === "rehomer" || role === "shelter_admin") && (
                          <span
                            className={`mff-navbar__status-badge mff-navbar__status-badge--${
                              isVerifiedRehomer
                                ? "verified"
                                : verificationStatus === "pending"
                                  ? "pending"
                                  : verificationStatus === "rejected"
                                    ? "rejected"
                                    : "incomplete"
                            }`}
                          >
                            {verificationLabelMap[verificationStatus] || "Incomplete"}
                          </span>
                        )}
                      </div>
                    </div>
                    {(role === "rehomer" || role === "shelter_admin") && (
                      <>
                        <button
                          type="button"
                          className="mff-navbar__dropdown-item"
                          onClick={() => handleMenuNavigate("/rehomer-profile")}
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          className="mff-navbar__dropdown-item"
                          onClick={() => handleMenuNavigate("/rehomer-dashboard")}
                        >
                          Dashboard
                        </button>
                        <button
                          type="button"
                          className="mff-navbar__dropdown-item"
                          onClick={() => handleMenuNavigate("/add-pet")}
                          disabled={!isVerifiedRehomer}
                        >
                          Add Pet
                        </button>
                      </>
                    )}
                    {(role === "adopter" || role === "user") && (
                      <>
                        <button
                          type="button"
                          className="mff-navbar__dropdown-item"
                          onClick={() => handleMenuNavigate("/my-listing")}
                        >
                          My Applications
                        </button>
                        <button
                          type="button"
                          className="mff-navbar__dropdown-item"
                          onClick={() => handleMenuNavigate("/pet-pouch")}
                        >
                          Pet Pouch
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="mff-navbar__dropdown-item mff-navbar__dropdown-item--logout"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mff-navbar__guest-actions">
                <NavLink
                  to="/login/user"
                  onClick={closeMenus}
                  className={`mff-navbar__link ${isLinkActive(location, "/login/user") ? "mff-navbar__link--active" : ""}`}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup/rehomer"
                  onClick={closeMenus}
                  className={`mff-navbar__link mff-navbar__link--cta ${
                    isLinkActive(location, "/signup/rehomer") ? "mff-navbar__link--active" : ""
                  }`}
                >
                  Become a Rehomer
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mff-bottom-nav" aria-label="Primary mobile navigation">
        {mobilePrimaryLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={closeMenus}
            className={`mff-bottom-nav__item ${
              isLinkActive(location, link.to) ? "mff-bottom-nav__item--active" : ""
            }`}
          >
            <span className="mff-bottom-nav__icon" aria-hidden="true">
              {link.icon}
            </span>
            <span className="mff-bottom-nav__label">{link.label}</span>
            {link.badge ? (
              <span className="mff-bottom-nav__badge">
                {link.badge > 99 ? "99+" : link.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

const styles = `
  .mff-navbar {
    background: linear-gradient(90deg, #f6a000 0%, #ffb51f 34%, #ffc94d 68%, #ffe39a 100%);
    position: relative;
    z-index: 100;
    box-shadow: 0 10px 28px rgba(214, 132, 14, 0.22);
  }

  .mff-bottom-nav {
    display: none;
  }

  .mff-navbar__container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .mff-navbar__logo {
    color: white;
    text-decoration: none;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  .mff-navbar__toggle {
    display: none;
    border: none;
    background: rgba(255, 249, 232, 0.92);
    width: 44px;
    height: 44px;
    border-radius: 14px;
    cursor: pointer;
    padding: 10px;
    box-shadow: 0 10px 24px rgba(156, 95, 0, 0.16);
  }

  .mff-navbar__toggle span {
    display: block;
    height: 2px;
    width: 100%;
    background: #9c5f00;
    border-radius: 999px;
  }

  .mff-navbar__toggle span + span {
    margin-top: 6px;
  }

  .mff-navbar__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex: 1;
  }

  .mff-navbar__links,
  .mff-navbar__guest-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .mff-navbar__links {
    justify-content: center;
    flex: 1;
  }

  .mff-navbar__link {
    color: white;
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 10px 14px;
    border-radius: 999px;
    transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
  }

  .mff-navbar__link:hover {
    background: rgba(255, 248, 225, 0.2);
    transform: translateY(-1px);
  }

  .mff-navbar__link--active {
    background: rgba(255, 248, 225, 0.26);
  }

  .mff-navbar__link--cta {
    background: linear-gradient(135deg, #fff9df 0%, #ffe7a6 55%, #ffd161 100%);
    color: #9c5f00;
    box-shadow: 0 12px 28px rgba(214, 132, 14, 0.18);
  }

  .mff-navbar__link--cta:hover {
    background: linear-gradient(135deg, #fffbed 0%, #ffedbc 55%, #ffd97a 100%);
  }

  .mff-navbar__auth {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .mff-navbar__user {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mff-navbar__avatar {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #fff8e1 0%, #ffe29a 100%);
    color: #9c5f00;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 22px rgba(214, 132, 14, 0.16);
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mff-navbar__notification-button {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 248, 225, 0.22);
    color: white;
    cursor: pointer;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.18s ease, transform 0.18s ease;
  }

  .mff-navbar__notification-button:hover {
    background: rgba(255, 248, 225, 0.3);
    transform: translateY(-1px);
  }

  .mff-navbar__notification-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .mff-navbar__notification-count {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: #fff1bf;
    color: #9c5f00;
    font-size: 0.68rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(214, 132, 14, 0.16);
  }

  .mff-navbar__avatar-image,
  .mff-navbar__dropdown-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mff-navbar__dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    min-width: 260px;
    background: white;
    border-radius: 22px;
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14);
    padding: 12px;
    border: 1px solid rgba(255, 174, 91, 0.18);
  }

  .mff-navbar__dropdown--notifications {
    width: min(360px, calc(100vw - 32px));
  }

  .mff-navbar__dropdown-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px 12px;
    border-bottom: 1px solid rgba(255, 174, 91, 0.14);
    margin-bottom: 6px;
  }

  .mff-navbar__dropdown-header--stacked {
    display: block;
  }

  .mff-navbar__dropdown-avatar {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    background: #fff4df;
    color: #f5820d;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .mff-navbar__dropdown-meta {
    min-width: 0;
  }

  .mff-navbar__dropdown-name {
    color: #2b2b2b;
    font-size: 0.92rem;
    font-weight: 800;
    word-break: break-word;
  }

  .mff-navbar__dropdown-email {
    color: #6f675d;
    font-size: 0.8rem;
    margin-top: 2px;
    word-break: break-word;
  }

  .mff-navbar__status-badge {
    display: inline-flex;
    align-items: center;
    margin-top: 8px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .mff-navbar__status-badge--verified {
    background: #ecfff4;
    color: #1f8a58;
  }

  .mff-navbar__status-badge--pending {
    background: #fff4df;
    color: #c97308;
  }

  .mff-navbar__status-badge--rejected {
    background: #fff1f1;
    color: #c53030;
  }

  .mff-navbar__status-badge--incomplete {
    background: #fff7ea;
    color: #b7791f;
  }

  .mff-navbar__dropdown-item {
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    padding: 10px;
    border-radius: 12px;
    color: #1f2937;
    font-weight: 600;
    cursor: pointer;
  }

  .mff-navbar__dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mff-navbar__dropdown-item:hover {
    background: #fff7ec;
    color: #e67300;
  }

  .mff-navbar__dropdown-item:disabled:hover {
    background: transparent;
    color: #1f2937;
  }

  .mff-navbar__dropdown-item--logout {
    border-top: 1px solid rgba(255, 174, 91, 0.14);
    margin-top: 6px;
    padding-top: 12px;
    color: #b45309;
  }

  .mff-navbar__notifications-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 360px;
    overflow-y: auto;
    padding: 4px 2px 2px;
  }

  .mff-navbar__notifications-state {
    color: #6f675d;
    font-size: 0.9rem;
    padding: 16px 10px;
    text-align: center;
  }

  .mff-navbar__notification-item {
    width: 100%;
    border: 1px solid rgba(255, 174, 91, 0.16);
    background: #fffdf9;
    text-align: left;
    padding: 12px;
    border-radius: 16px;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  }

  .mff-navbar__notification-item:hover {
    background: #fff7ec;
    border-color: rgba(245, 130, 13, 0.24);
    transform: translateY(-1px);
  }

  .mff-navbar__notification-item--unread {
    background: #fff6e7;
    border-color: rgba(245, 130, 13, 0.28);
  }

  .mff-navbar__notification-topline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .mff-navbar__notification-title {
    color: #2b2b2b;
    font-size: 0.88rem;
    font-weight: 800;
  }

  .mff-navbar__notification-time {
    color: #8c7462;
    font-size: 0.72rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mff-navbar__notification-message {
    color: #5f574d;
    font-size: 0.82rem;
    line-height: 1.45;
    margin-top: 6px;
  }

  @media (max-width: 980px) {
    .mff-navbar__container {
      flex-wrap: wrap;
    }

    .mff-navbar__toggle {
      display: block;
      margin-left: auto;
    }

    .mff-navbar__content {
      width: 100%;
      display: none;
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
      padding-top: 6px;
    }

    .mff-navbar__content--open {
      display: flex;
    }

    .mff-navbar__links,
    .mff-navbar__guest-actions {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }

    .mff-navbar__auth {
      justify-content: flex-start;
    }

    .mff-navbar__user {
      width: 100%;
    }

    .mff-navbar__link {
      width: 100%;
      text-align: center;
    }

    .mff-navbar__dropdown {
      left: 0;
      right: auto;
    }

    .mff-navbar__dropdown--notifications {
      left: 0;
      right: auto;
    }
  }

  @media (max-width: 768px) {
    body {
      padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px));
    }

    .mff-navbar {
      background: linear-gradient(180deg, #ffb51f 0%, #ffc94d 100%);
      position: sticky;
      top: 0;
    }

    .mff-navbar__container {
      padding: 14px 16px;
      flex-wrap: nowrap;
    }

    .mff-navbar__logo {
      font-size: 1.15rem;
      max-width: 60vw;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mff-navbar__toggle,
    .mff-navbar__content {
      display: none !important;
    }

    .mff-bottom-nav {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      padding: 10px 10px 12px;
      border-radius: 24px;
      background: rgba(255, 252, 244, 0.96);
      border: 1px solid rgba(255, 186, 63, 0.22);
      box-shadow: 0 18px 40px rgba(156, 95, 0, 0.18);
      backdrop-filter: blur(16px);
      z-index: 140;
    }

    .mff-bottom-nav__item {
      position: relative;
      text-decoration: none;
      color: #8b6a2f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 56px;
      border-radius: 18px;
      transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
    }

    .mff-bottom-nav__item:hover {
      background: rgba(255, 236, 192, 0.72);
      transform: translateY(-1px);
    }

    .mff-bottom-nav__item--active {
      background: linear-gradient(180deg, rgba(255, 190, 73, 0.24) 0%, rgba(255, 213, 122, 0.42) 100%);
      color: #9c5f00;
      box-shadow: inset 0 0 0 1px rgba(255, 186, 63, 0.16);
    }

    .mff-bottom-nav__icon {
      font-size: 1.05rem;
      line-height: 1;
    }

    .mff-bottom-nav__label {
      font-size: 0.67rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      line-height: 1;
      white-space: nowrap;
    }

    .mff-bottom-nav__badge {
      position: absolute;
      top: 2px;
      right: 10px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: #ff8a00;
      color: white;
      font-size: 0.62rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 14px rgba(255, 138, 0, 0.24);
    }
  }
`;

if (typeof document !== "undefined") {
  let styleElement = document.getElementById("mff-navbar-styles");

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "mff-navbar-styles";
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = styles;
}

export default Navbar;
