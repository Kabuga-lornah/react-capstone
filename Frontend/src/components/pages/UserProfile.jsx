import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, updateCurrentUser } from "../../services/api";
import { useAuth } from "./AuthContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const uploadImageToCloudinary = async (file) => {
  const imageFormData = new FormData();
  imageFormData.append("file", file);
  imageFormData.append("upload_preset", "pets_presets");
  imageFormData.append("cloud_name", "dgdf0svqx");

  const response = await fetch("https://api.cloudinary.com/v1_1/dgdf0svqx/image/upload", {
    method: "POST",
    body: imageFormData,
  });

  if (!response.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  const data = await response.json();
  return data.secure_url;
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { userData, setAuthenticatedUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: userData?.first_name || "",
    last_name: userData?.last_name || "",
    email: userData?.email || "",
    phone_number: userData?.phone_number || "",
    community_alias: userData?.community_alias || "",
    profile_photo_url: userData?.profile_photo_url || "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayName = useMemo(() => {
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();
    return fullName || userData?.displayName || userData?.email || "Your profile";
  }, [formData.first_name, formData.last_name, userData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.match("image.*")) {
      setMessage({ type: "error", text: "Please select a JPEG or PNG image." });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ type: "error", text: "Image must be smaller than 5MB." });
      return;
    }

    try {
      setUploadingPhoto(true);
      setMessage({ type: "", text: "" });
      const uploadedUrl = await uploadImageToCloudinary(file);
      const updatedProfile = await updateCurrentUser({ profile_photo_url: uploadedUrl });
      setAuthenticatedUser(updatedProfile);
      setFormData((currentData) => ({
        ...currentData,
        profile_photo_url: uploadedUrl,
      }));
      setMessage({ type: "success", text: "Profile photo updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to upload photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const updatedProfile = await updateCurrentUser({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        community_alias: formData.community_alias.trim(),
      });
      setAuthenticatedUser(updatedProfile);
      await getCurrentUser();
      setMessage({ type: "success", text: "Your profile has been updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-profile-shell">
      <style>{`
        .user-profile-shell {
          min-height: 100vh;
          background: #fffbf5;
          color: #1c1207;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding: 18px 16px calc(96px + env(safe-area-inset-bottom, 0px));
        }

        .user-profile-wrap {
          max-width: 760px;
          margin: 0 auto;
        }

        .user-profile-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0 18px;
          border-bottom: 1px solid rgba(245, 154, 35, 0.18);
          margin-bottom: 18px;
        }

        .user-profile-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #c87907;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .user-profile-hero h1 {
          font-size: 1.75rem;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .user-profile-hero p {
          color: #7b6245;
          font-size: 0.95rem;
          line-height: 1.55;
          max-width: 520px;
        }

        .user-profile-avatar {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, #fff0c8 0%, #ffd67a 100%);
          color: #9c5f00;
          font-size: 1.5rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-profile-banner {
          padding: 12px 0 16px;
          border-bottom: 1px solid rgba(245, 154, 35, 0.14);
          margin-bottom: 16px;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .user-profile-banner--success {
          color: #1f7a46;
        }

        .user-profile-banner--error {
          color: #b45309;
        }

        .user-profile-form {
          display: grid;
          gap: 18px;
        }

        .user-profile-section {
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(245, 154, 35, 0.14);
        }

        .user-profile-section h2 {
          font-size: 1rem;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .user-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 16px;
        }

        .user-profile-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .user-profile-field--wide {
          grid-column: 1 / -1;
        }

        .user-profile-field span {
          color: #a56e24;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .user-profile-field input {
          border: none;
          border-bottom: 1px solid rgba(245, 154, 35, 0.24);
          background: transparent;
          padding: 0 0 10px;
          font-size: 1rem;
          color: #1c1207;
          outline: none;
        }

        .user-profile-field input:focus {
          border-bottom-color: #f59a23;
        }

        .user-profile-photo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .user-profile-photo-copy p {
          color: #7b6245;
          font-size: 0.92rem;
          line-height: 1.5;
          margin-top: 6px;
        }

        .user-profile-photo-button {
          border: none;
          background: transparent;
          color: #c87907;
          font-size: 0.92rem;
          font-weight: 800;
          padding: 0;
          cursor: pointer;
        }

        .user-profile-photo-button input {
          display: none;
        }

        .user-profile-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 4px;
        }

        .user-profile-back {
          border: none;
          background: transparent;
          color: #9c5f00;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .user-profile-save {
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffab2e 0%, #f58c00 100%);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 800;
          padding: 13px 22px;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(245, 130, 13, 0.18);
        }

        @media (max-width: 640px) {
          .user-profile-grid {
            grid-template-columns: 1fr;
          }

          .user-profile-hero {
            align-items: flex-start;
          }

          .user-profile-hero h1 {
            font-size: 1.45rem;
          }

          .user-profile-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .user-profile-save,
          .user-profile-back {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <div className="user-profile-wrap">
        <section className="user-profile-hero">
          <div>
            <span className="user-profile-eyebrow">User Profile</span>
            <h1>{displayName}</h1>
            <p>Update your contact details, profile photo, and community username from one simple place.</p>
          </div>
          <div className="user-profile-avatar" aria-hidden="true">
            {formData.profile_photo_url ? (
              <img src={formData.profile_photo_url} alt={displayName} />
            ) : (
              (displayName.charAt(0) || "P").toUpperCase()
            )}
          </div>
        </section>

        {message.text ? (
          <div className={`user-profile-banner user-profile-banner--${message.type}`}>
            {message.text}
          </div>
        ) : null}

        <form className="user-profile-form" onSubmit={handleSubmit}>
          <section className="user-profile-section">
            <h2>Profile photo</h2>
            <div className="user-profile-photo-row">
              <div className="user-profile-photo-copy">
                <strong>{formData.profile_photo_url ? "Photo added" : "Add a profile photo"}</strong>
                <p>Use a photo you can change later whenever you want.</p>
              </div>
              <label className="user-profile-photo-button">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                {uploadingPhoto ? "Uploading..." : formData.profile_photo_url ? "Change photo" : "Upload photo"}
              </label>
            </div>
          </section>

          <section className="user-profile-section">
            <h2>Your details</h2>
            <div className="user-profile-grid">
              <label className="user-profile-field">
                <span>First name</span>
                <input name="first_name" value={formData.first_name} onChange={handleChange} />
              </label>
              <label className="user-profile-field">
                <span>Last name</span>
                <input name="last_name" value={formData.last_name} onChange={handleChange} />
              </label>
              <label className="user-profile-field">
                <span>Email address</span>
                <input name="email" type="email" value={formData.email} onChange={handleChange} />
              </label>
              <label className="user-profile-field">
                <span>Phone number</span>
                <input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="For example, +2547..."
                />
              </label>
              <label className="user-profile-field user-profile-field--wide">
                <span>Community username</span>
                <input
                  name="community_alias"
                  value={formData.community_alias}
                  onChange={handleChange}
                  placeholder="Choose the name people see in Community"
                />
              </label>
            </div>
          </section>

          <div className="user-profile-actions">
            <button type="button" className="user-profile-back" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="submit" className="user-profile-save" disabled={saving || uploadingPhoto}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
