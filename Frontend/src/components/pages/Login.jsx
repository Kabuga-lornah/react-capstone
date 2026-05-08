import React, { useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { clearTokens, getCurrentUser, loginUser } from "../../services/api";
import { useAuth } from "./AuthContext";

const mapRouteTypeToRole = (type) => {
  if (type === "rehomer") return "rehomer";
  if (type === "shelter") return "shelter_admin";
  return "adopter";
};

const getRouteLabel = (type) => {
  if (type === "rehomer") return "Rehomer";
  if (type === "shelter") return "Shelter";
  return "User";
};

const getRedirectPath = (role) => {
  if (role === "rehomer") return "/rehomer-dashboard";
  if (role === "shelter_admin" || role === "platform_admin") return "/admin-dashboard";
  return "/pets";
};

const isAdminRole = (role) => role === "shelter_admin" || role === "platform_admin";

const getLoginLinkType = (type) =>
  type === "rehomer" || type === "shelter" ? type : "user";

if (typeof document !== "undefined" && !document.getElementById("ff-fonts")) {
  const link = document.createElement("link");
  link.id = "ff-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&display=swap";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes ff-shimmer { 0%{left:-100%} 100%{left:220%} }
    @keyframes ff-floatpaw { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes ff-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(style);
}

const Login = () => {
  const { type = "user" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser, logout } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState(
    location.state?.successMessage
      ? { type: "success", text: location.state.successMessage }
      : { type: "", text: "" }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const expectedRole = mapRouteTypeToRole(type);
      const tokenResponse = await loginUser({
        username: normalizedEmail,
        password,
      });
      const profile = await getCurrentUser();

      if (isAdminRole(profile.role)) {
        setAuthenticatedUser(profile, {
          access: tokenResponse.access,
          refresh: tokenResponse.refresh,
        });
        navigate(getRedirectPath(profile.role), { replace: true });
        return;
      }

      if (profile.role !== expectedRole) {
        clearTokens();
        logout();
        setMessage({
          type: "error",
          text: `Please login through the ${
            profile.role === "rehomer"
              ? "rehomer"
              : profile.role === "shelter_admin"
                ? "shelter"
                : "user"
          } login page`,
        });
        return;
      }

      setAuthenticatedUser(profile, {
        access: tokenResponse.access,
        refresh: tokenResponse.refresh,
      });
      navigate(getRedirectPath(profile.role), { replace: true });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Login failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.blob1} />
      <div style={s.blob2} />

      {["6%", "88%"].map((left, index) => (
        <span
          key={left}
          style={{
            ...s.floatingPaw,
            left,
            top: index === 0 ? "18%" : "42%",
            animationDelay: `${index * 1.5}s`,
          }}
        >
          paw
        </span>
      ))}

      <div style={s.topBar}>
        <div style={s.logoMark}>
          <div style={s.logoText}>
            My<span style={{ color: "#E87E00" }}>Furry</span>Friends
          </div>
        </div>
      </div>

      <div style={s.contentShell}>
        <div style={s.heroSection}>
          <h2 style={s.heroTitle}>Welcome back</h2>
          <p style={s.heroSub}>Sign in and continue where you left off.</p>
        </div>

        <div style={s.loginSection}>
          <div style={s.tabRow}>
            {[
              { key: "user", label: "Find a pet", path: "/login/user" },
              { key: "rehomer", label: "Rehome a pet", path: "/login/rehomer" },
            ].map(({ key, label, path }) => (
              <button
                key={key}
                onClick={() => navigate(path)}
                style={{
                  ...s.tabBtn,
                  ...(type === key ? s.tabBtnActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {message.text && (
            <div
              style={{
                ...s.alert,
                ...(message.type === "success" ? s.alertSuccess : s.alertError),
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="hello@example.com"
                required
                style={{
                  ...s.formInput,
                  ...(focusedField === "email" ? s.formInputFocus : {}),
                }}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  style={{
                    ...s.formInput,
                    paddingRight: 62,
                    ...(focusedField === "password" ? s.formInputFocus : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  style={s.eyeBtn}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div style={s.forgotWrap}>
              <Link to="/forgot-password" style={s.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} style={s.btnLogin}>
              <div style={s.btnShine} />
              {isSubmitting ? "Logging in..." : `Log in as ${getRouteLabel(type)}`}
            </button>
          </form>

          <div style={s.orDivider}>
            <div style={s.orLine} />
            <span style={s.orLabel}>or continue with</span>
            <div style={s.orLine} />
          </div>

          <button style={s.googleBtn}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={s.footerLinks}>
            Don&apos;t have an account?{" "}
            <Link to={`/signup/${getLoginLinkType(type)}`} style={s.footerLink}>
              Sign up free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ display: "block" }}>
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const s = {
  wrap: {
    fontFamily: "'Nunito', sans-serif",
    background: "#FFF8EE",
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    position: "relative",
    overflow: "hidden",
    padding: "26px 0 20px",
  },
  contentShell: {
    minHeight: "calc(100dvh - 82px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    paddingBottom: 72,
  },
  blob1: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "#FFCD7A",
    filter: "blur(50px)",
    opacity: 0.35,
    pointerEvents: "none",
  },
  blob2: {
    position: "absolute",
    bottom: 60,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: "50%",
    background: "#FFAA33",
    filter: "blur(50px)",
    opacity: 0.2,
    pointerEvents: "none",
  },
  floatingPaw: {
    position: "absolute",
    pointerEvents: "none",
    opacity: 0.05,
    fontSize: 20,
    fontWeight: 800,
    color: "#C07000",
    textTransform: "uppercase",
    animation: "ff-floatpaw 8s ease-in-out infinite",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "10px 20px 18px",
  },
  logoMark: { display: "flex", alignItems: "center", gap: 8 },
  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 15,
    fontWeight: 800,
    color: "#3D2000",
  },
  heroSection: {
    padding: "0 20px 0",
    textAlign: "center",
    animation: "ff-fadein 0.4s ease",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 800,
    color: "#2A1500",
    lineHeight: 1.2,
    margin: "0 0 6px",
  },
  heroSub: {
    fontSize: 13,
    color: "#7A5C35",
    lineHeight: 1.6,
    margin: 0,
  },
  loginSection: { padding: "20px 20px 0" },
  tabRow: {
    display: "flex",
    background: "rgba(255,200,80,0.15)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 18,
    border: "1px solid rgba(255,180,50,0.25)",
  },
  tabBtn: {
    flex: 1,
    border: "none",
    borderRadius: 999,
    padding: "9px 10px",
    background: "transparent",
    color: "#9A6C30",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Nunito', sans-serif",
  },
  tabBtnActive: {
    background: "#FF9900",
    color: "#fff",
    boxShadow: "0 6px 16px rgba(255,140,0,0.35)",
  },
  alert: {
    textAlign: "center",
    margin: "0 0 14px",
    padding: "12px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.6,
    border: "1px solid transparent",
  },
  alertSuccess: {
    color: "#7A4800",
    background: "#FFF5DF",
    borderColor: "#F3C981",
    boxShadow: "0 8px 20px rgba(245,158,11,0.08)",
  },
  alertError: {
    color: "#7A4800",
    background: "#FFF3E0",
    borderColor: "#F6C87A",
    boxShadow: "0 8px 20px rgba(245,158,11,0.06)",
  },
  formGroup: { marginBottom: 12 },
  formLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9A6C30",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
    marginBottom: 6,
    display: "block",
  },
  formInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px",
    border: "1.5px solid rgba(210,160,60,0.35)",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    color: "#2A1500",
    background: "rgba(255,255,255,0.85)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "'Nunito', sans-serif",
  },
  formInputFocus: {
    borderColor: "#FF9900",
    boxShadow: "0 0 0 3px rgba(255,153,0,0.15)",
    background: "#fff",
  },
  eyeBtn: {
    position: "absolute",
    top: "50%",
    right: 12,
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    color: "#B56A00",
    padding: 4,
  },
  forgotWrap: { textAlign: "right", margin: "-4px 0 14px" },
  forgotLink: {
    fontSize: 12,
    color: "#E07800",
    fontWeight: 700,
    textDecoration: "none",
  },
  btnLogin: {
    width: "100%",
    padding: 15,
    background: "linear-gradient(135deg,#FF9900 0%,#E87800 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    border: "none",
    borderRadius: 16,
    cursor: "pointer",
    marginTop: 2,
    letterSpacing: "0.3px",
    fontFamily: "'Nunito', sans-serif",
    boxShadow:
      "0 8px 24px rgba(255,140,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    transition: "transform 0.15s, box-shadow 0.15s",
    position: "relative",
    overflow: "hidden",
  },
  btnShine: {
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "60%",
    height: "100%",
    background:
      "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
    animation: "ff-shimmer 2.4s infinite",
  },
  orDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "16px 0 12px",
  },
  orLine: { flex: 1, height: 1, background: "rgba(200,140,50,0.2)" },
  orLabel: { fontSize: 11, fontWeight: 700, color: "#B08050" },
  googleBtn: {
    width: "100%",
    padding: 13,
    background: "rgba(255,255,255,0.9)",
    border: "1.5px solid rgba(210,160,60,0.35)",
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 700,
    color: "#2A1500",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
    transition: "box-shadow 0.2s, transform 0.15s",
  },
  footerLinks: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: "#9A7040",
  },
  footerLink: {
    color: "#E07800",
    fontWeight: 800,
    textDecoration: "none",
  },
};

export default Login;
