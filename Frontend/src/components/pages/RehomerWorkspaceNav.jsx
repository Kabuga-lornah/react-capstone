import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken, listConversations } from "../../services/api";
import "./RehomerWorkspaceNav.css";

const IconPaw = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="7" cy="8" rx="2" ry="2.7" />
    <ellipse cx="12" cy="6.2" rx="2" ry="2.9" />
    <ellipse cx="17" cy="8" rx="2" ry="2.7" />
    <ellipse cx="18.2" cy="13.2" rx="1.8" ry="2.4" />
    <ellipse cx="5.8" cy="13.2" rx="1.8" ry="2.4" />
    <path d="M12 11.5c-3.1 0-5.7 2.2-5.7 5 0 1.7 1.2 2.8 2.8 2.8.9 0 1.6-.3 2.1-.7.4-.3.9-.5 1.4-.5s1 .2 1.4.5c.5.4 1.3.7 2.1.7 1.6 0 2.8-1.1 2.8-2.8 0-2.8-2.6-5-5.7-5Z" />
  </svg>
);

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10.5V20h14v-9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const IconPerson = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const isRehomerNavActive = (location, item) => {
  if (item.key === "home") {
    return location.pathname === "/rehomer-dashboard" && !location.search.includes("tab=");
  }

  if (item.key === "requests") {
    return location.pathname === "/rehomer-dashboard" && location.search.includes("tab=requests");
  }

  if (item.key === "pets") {
    return (
      (location.pathname === "/rehomer-dashboard" && location.search.includes("tab=pets")) ||
      location.pathname.startsWith("/pet/")
    );
  }

  if (item.key === "chats") {
    return location.pathname.startsWith("/chats");
  }

  if (item.key === "profile") {
    return (
      location.pathname === "/rehomer-profile" ||
      (location.pathname === "/rehomer-dashboard" && location.search.includes("tab=profile"))
    );
  }

  return false;
};

const RehomerWorkspaceNav = ({ pendingCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  useEffect(() => {
    const loadUnreadChats = async () => {
      if (!getAccessToken()) {
        setUnreadChatsCount(0);
        return;
      }

      try {
        const response = await listConversations();
        const conversations = Array.isArray(response) ? response : response?.results || [];
        const count = conversations.reduce(
          (total, conversation) => total + Number(conversation?.unread_count || 0),
          0,
        );
        setUnreadChatsCount(count);
      } catch (error) {
        setUnreadChatsCount(0);
      }
    };

    loadUnreadChats();
  }, [location.pathname, location.search]);

  const items = [
    { key: "home", label: "Home", icon: <IconHome />, to: "/rehomer-dashboard" },
    { key: "requests", label: "Requests", icon: <IconMail />, to: "/rehomer-dashboard?tab=requests" },
    { key: "pets", label: "My Pets", icon: <IconPaw />, to: "/rehomer-dashboard?tab=pets" },
    { key: "chats", label: "Chats", icon: <IconMail />, to: "/chats" },
    { key: "profile", label: "Profile", icon: <IconPerson />, to: "/rehomer-profile" },
  ];

  return (
    <nav className="rw-nav" aria-label="Rehomer navigation">
      {items.map((item) => {
        const isActive = isRehomerNavActive(location, item);
        return (
          <button
            key={item.key}
            type="button"
            className={`rw-nav__item${isActive ? " is-active" : ""}`}
            onClick={() => navigate(item.to)}
          >
            <span className="rw-nav__icon">{item.icon}</span>
            <span className="rw-nav__label">{item.label}</span>
            {item.key === "requests" && pendingCount > 0 ? (
              <span className="rw-nav__badge">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            ) : null}
            {item.key === "chats" && unreadChatsCount > 0 ? (
              <span className="rw-nav__badge">
                {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

export default RehomerWorkspaceNav;
