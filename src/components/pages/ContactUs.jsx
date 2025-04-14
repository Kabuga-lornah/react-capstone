import React, { useState } from "react";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  const styles = {
    container: {
      display: "flex",
      maxWidth: "1000px",
      margin: "40px auto",
      border: "1px solid #e0e0e0",
      position: "relative",
      backgroundColor: "#fff",
      borderRadius: "0", // Remove border radius for sharp corners
      overflow: "hidden", // Ensures image doesn't overflow
    },
    imageSection: {
      flex: "1",
      display: "flex",
      alignItems: "stretch", // Make image section full height
      minHeight: "500px", // Set minimum height
    },
    imageContainer: {
      width: "100%",
      height: "100%",
      display: "flex",
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    formSection: {
      flex: "1",
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center", // Center form vertically
    },
    title: {
      fontSize: "28px",
      marginBottom: "20px",
      fontWeight: "bold",
      color: "#333",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    input: {
      padding: "12px",
      fontSize: "16px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      backgroundColor: "#f9f9f9",
    },
    textarea: {
      padding: "12px",
      fontSize: "16px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      minHeight: "120px",
      backgroundColor: "#f9f9f9",
    },
    button: {
      backgroundColor: "#FFA500",
      color: "#fff",
      padding: "12px",
      border: "none",
      borderRadius: "4px",
      fontSize: "16px",
      cursor: "pointer",
      fontWeight: "bold",
      marginTop: "10px",
      transition: "background-color 0.3s",
      "&:hover": {
        backgroundColor: "#e69500",
      },
    },
    contactInfo: {
      marginTop: "30px",
      color: "#555",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    successMessage: {
      color: "orange",
      fontSize: "16px",
      marginBottom: "20px",
    },
   
    cornerTopLeft: {
      position: "absolute",
      top: "10px",
      left: "10px",
      width: "40px",
      height: "40px",
      borderTop: "2px solid #FFA500",
      borderLeft: "2px solid #FFA500",
    },
    cornerBottomRight: {
      position: "absolute",
      bottom: "10px",
      right: "10px",
      width: "40px",
      height: "40px",
      borderBottom: "2px solid #FFA500",
      borderRight: "2px solid #FFA500",
    },
  };

  return (
    <div style={styles.container}>
      {/* Only two corner elements for cleaner design */}
      <div style={styles.cornerTopLeft}></div>
      <div style={styles.cornerBottomRight}></div>
      
      {/* Image section on the left - now full height */}
      <div style={styles.imageSection}>
        <div style={styles.imageContainer}>
          <img 
            src="/contactus.jpg" 
            alt="Contact" 
            style={styles.image}
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_18945b7b5b8%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_18945b7b5b8%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22285.9140625%22%20y%3D%22218.2%22%3EContact%20Us%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E"
            }}
          />
        </div>
      </div>
      
      
      <div style={styles.formSection}>
        <h2 style={styles.title}>Contact Us</h2>
        {submitted && <p style={styles.successMessage}>Thanks for reaching out! We'll get back to you soon 😊</p>}
        
        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            style={styles.input}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />
          <textarea
            name="message"
            placeholder="Your Message"
            value={formData.message}
            onChange={handleChange}
            style={styles.textarea}
            required
          ></textarea>
          <button type="submit" style={styles.button}>
            Send Message
          </button>
        </form>

        <div style={styles.contactInfo}>
          <p><strong>Email:</strong> support@myfurryfriends.com</p>
          <p><strong>Phone:</strong> +254 712 345 678</p>
          <p><strong>Location:</strong> Ngong Road, Nairobi, Kenya</p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;