import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../pages/firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../pages/firebaseconfig";
import { useAuthState } from "react-firebase-hooks/auth";

const MyListings = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState([]);
  const [adoptionRequests, setAdoptionRequests] = useState([]); // State for adoption requests
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("notifications"); // "notifications" or "myRequests"

  // Fetch notifications and adoption requests
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeNotifications = onSnapshot(
      query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          visitDate: doc.data().visitDate?.toDate(),
        }));
        setNotifications(notifs);
      }
    );

    // Fetch adoption requests where the userId matches the current user's ID
    const fetchAdoptionRequests = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "adoptionRequests"),
          where("userId", "==", user.uid) // Filter by user's ID
          // Potentially add more filters, e.g., where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAdoptionRequests(requests);
      } catch (error) {
        console.error("Error fetching adoption requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdoptionRequests();

    return () => {
      unsubscribeNotifications();
    };
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Listings</h1>

      <div style={styles.tabContainer}>
        <button
          style={
            activeTab === "notifications" ? styles.activeTab : styles.tab
          }
          onClick={() => setActiveTab("notifications")}
        >
          Notifications
          {notifications.filter((n) => !n.read).length > 0 && (
            <span style={styles.badge}>
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </button>
        <button
          style={activeTab === "myRequests" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("myRequests")}
        >
          My Adoption Requests
        </button>
      </div>

      {activeTab === "notifications" && (
        <div style={styles.notificationsContainer}>
          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p style={styles.emptyMessage}>No notifications yet.</p>
          ) : (
            <div style={styles.notificationsList}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={
                    !notification.read
                      ? styles.unreadNotification
                      : styles.notification
                  }
                  onClick={() => markAsRead(notification.id)}
                >
                  <h3 style={styles.notificationTitle}>{notification.title}</h3>
                  <p style={styles.notificationMessage}>
                    {notification.message}
                  </p>
                  {notification.visitDate && (
                    <p style={styles.visitDate}>
                      Scheduled visit: {formatDate(notification.visitDate)}
                    </p>
                  )}
                  {!notification.read && (
                    <span style={styles.unreadBadge}>New</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "myRequests" && (
        <div style={styles.requestsContainer}>
          {loading ? (
            <p>Loading adoption requests...</p>
          ) : adoptionRequests.length === 0 ? (
            <p>No adoption requests found.</p>
          ) : (
            <div style={styles.adoptionRequestsList}>
              {adoptionRequests.map((request) => (
                <div key={request.id} style={styles.adoptionRequestCard}>
                  <h3>Pet Name: {request.petName}</h3>
                  <p>Message: {request.message}</p>
                  <p>Status: {request.status}</p>
                  {/* Display other relevant information */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
    container: {
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
    },
    title: {
      textAlign: "center",
      color: "#FFA500",
      marginBottom: "30px",
    },
    tabContainer: {
      display: "flex",
      marginBottom: "20px",
      borderBottom: "1px solid #FFA500",
    },
    tab: {
      padding: "10px 20px",
      background: "none",
      border: "none",
      cursor: "pointer",
      position: "relative",
      color: "#FFA500",
    },
    activeTab: {
      padding: "10px 20px",
      background: "none",
      border: "none",
      borderBottom: "2px solid #FFA500",
      cursor: "pointer",
      fontWeight: "bold",
      position: "relative",
      color: "#FFA500",
    },
    badge: {
      position: "absolute",
      top: "-5px",
      right: "5px",
      backgroundColor: "#FFA500",
      color: "white",
      borderRadius: "50%",
      padding: "2px 6px",
      fontSize: "12px",
    },
    notificationsContainer: {
      backgroundColor: "#fffaf0",
      borderRadius: "8px",
      padding: "20px",
    },
    emptyMessage: {
      textAlign: "center",
      color: "#FFA500",
    },
    notificationsList: {
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    notification: {
      backgroundColor: "#fff",
      padding: "15px",
      borderRadius: "5px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      cursor: "pointer",
      position: "relative",
    },
    unreadNotification: {
      backgroundColor: "#fff8e1",
      padding: "15px",
      borderRadius: "5px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      cursor: "pointer",
      position: "relative",
      borderLeft: "4px solid #FFA500",
    },
    notificationTitle: {
      margin: "0 0 5px 0",
      color: "#FFA500",
    },
    notificationMessage: {
      margin: "0 0 10px 0",
      color: "#555",
    },
    visitDate: {
      margin: "0",
      color: "#FFA500",
      fontWeight: "bold",
    },
    unreadBadge: {
      position: "absolute",
      top: "10px",
      right: "10px",
      backgroundColor: "#FFA500",
      color: "white",
      padding: "2px 8px",
      borderRadius: "10px",
      fontSize: "12px",
    },
    requestsContainer: {
      padding: "20px",
    },
    adoptionRequestsList: {
      // Style as needed
    },
    adoptionRequestCard: {
      border: "1px solid #FFA500",
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "4px",
    },
  };

export default MyListings;
