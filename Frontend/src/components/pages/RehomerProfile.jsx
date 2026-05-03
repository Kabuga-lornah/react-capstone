import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  submitRehomerVerification,
  updateCurrentUser,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import "./RehomerProfile.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const statusConfig = {
  incomplete: {
    label: "Incomplete",
    className: "rehomer-profile-status--incomplete",
  },
  pending: {
    label: "Pending Review",
    className: "rehomer-profile-status--pending",
  },
  verified: {
    label: "Verified",
    className: "rehomer-profile-status--verified",
  },
  rejected: {
    label: "Rejected",
    className: "rehomer-profile-status--rejected",
  },
};

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

const fileToFieldMap = {
  profilePhoto: "profile_photo_url",
  idFront: "id_front_url",
  idBack: "id_back_url",
};

const RehomerProfile = () => {
  const navigate = useNavigate();
  const { userData, setAuthenticatedUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: userData?.first_name || "",
    last_name: userData?.last_name || "",
    email: userData?.email || "",
    phone_number: userData?.phone_number || "",
    bio: userData?.bio || "",
    profile_photo_url: userData?.profile_photo_url || "",
    id_front_url: userData?.id_front_url || "",
    id_back_url: userData?.id_back_url || "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [uploadingField, setUploadingField] = useState("");

  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const statusUi = statusConfig[verificationStatus] || statusConfig.incomplete;

  const welcomeName = useMemo(() => {
    const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim();
    return fullName || userData?.username || userData?.email || "Rehomer";
  }, [userData]);

  const syncProfile = async () => {
    const refreshedProfile = await getCurrentUser();
    setAuthenticatedUser(refreshedProfile);
    setFormData((currentData) => ({
      ...currentData,
      first_name: refreshedProfile.first_name || "",
      last_name: refreshedProfile.last_name || "",
      email: refreshedProfile.email || "",
      phone_number: refreshedProfile.phone_number || "",
      bio: refreshedProfile.bio || "",
      profile_photo_url: refreshedProfile.profile_photo_url || "",
      id_front_url: refreshedProfile.id_front_url || "",
      id_back_url: refreshedProfile.id_back_url || "",
    }));
    return refreshedProfile;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const updatedProfile = await updateCurrentUser(formData);
      setAuthenticatedUser(updatedProfile);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event, fileKey) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.match("image.*")) {
      setMessage({ type: "error", text: "Please select an image file (JPEG or PNG)." });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ type: "error", text: "Image must be smaller than 5MB." });
      return;
    }

    try {
      setUploadingField(fileKey);
      setMessage({ type: "", text: "" });
      const uploadedUrl = await uploadImageToCloudinary(file);
      const targetField = fileToFieldMap[fileKey];
      const updatedProfile = await updateCurrentUser({ [targetField]: uploadedUrl });
      setAuthenticatedUser(updatedProfile);
      setFormData((currentData) => ({
        ...currentData,
        [targetField]: uploadedUrl,
      }));
      setMessage({ type: "success", text: "Document uploaded successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to upload image." });
    } finally {
      setUploadingField("");
    }
  };

  const handleSubmitVerification = async () => {
    try {
      setSubmittingVerification(true);
      setMessage({ type: "", text: "" });
      await submitRehomerVerification({
        phone_number: formData.phone_number,
        profile_photo_url: formData.profile_photo_url,
        id_front_url: formData.id_front_url,
        id_back_url: formData.id_back_url,
      });
      await syncProfile();
      setMessage({
        type: "success",
        text: "Verification submitted. You can list pets once approved.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to submit verification.",
      });
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <div className="rehomer-profile-shell">
      <div className="rehomer-profile-page">
        <section className="rehomer-profile-hero">
          <div>
            <span className="rehomer-profile-badge">Rehomer Profile</span>
            <h1>{welcomeName}</h1>
            <p>Keep your contact details current and submit your rehomer verification so you can list pets safely.</p>
          </div>
          <div className={`rehomer-profile-status ${statusUi.className}`}>
            {statusUi.label}
          </div>
        </section>

        {message.text ? (
          <div className={`rehomer-profile-banner rehomer-profile-banner--${message.type}`}>
            {message.text}
          </div>
        ) : null}

        <div className="rehomer-profile-layout">
          <form className="rehomer-profile-card" onSubmit={handleSaveProfile}>
            <div className="rehomer-profile-card__header">
              <span className="rehomer-profile-card__eyebrow">Profile Details</span>
              <h2>Contact and identity details</h2>
              <p>These details are only visible to you and admins for verification review.</p>
            </div>

            <div className="rehomer-profile-grid">
              <label className="rehomer-profile-field">
                <span>First name</span>
                <input name="first_name" value={formData.first_name} onChange={handleChange} />
              </label>
              <label className="rehomer-profile-field">
                <span>Last name</span>
                <input name="last_name" value={formData.last_name} onChange={handleChange} />
              </label>
              <label className="rehomer-profile-field">
                <span>Email</span>
                <input name="email" value={formData.email} onChange={handleChange} type="email" />
              </label>
              <label className="rehomer-profile-field">
                <span>Phone number</span>
                <input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="For example, +2547..."
                />
              </label>
              <label className="rehomer-profile-field rehomer-profile-field--wide">
                <span>Short bio</span>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Introduce yourself briefly and explain your role."
                />
              </label>
            </div>

            <div className="rehomer-profile-actions">
              <button type="submit" className="rehomer-profile-button rehomer-profile-button--primary" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
              <button
                type="button"
                className="rehomer-profile-button rehomer-profile-button--secondary"
                onClick={() => navigate("/rehomer-dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </form>

          <div className="rehomer-profile-side">
            <section className="rehomer-profile-card">
              <div className="rehomer-profile-card__header">
                <span className="rehomer-profile-card__eyebrow">Uploads</span>
                <h2>Private verification files</h2>
                <p>These files are not shown publicly. They are for your verification review only.</p>
              </div>

              <div className="rehomer-profile-upload-list">
                <div className="rehomer-profile-upload">
                  <div>
                    <strong>Profile photo</strong>
                    <p>Optional, but helpful for a complete profile.</p>
                  </div>
                  {formData.profile_photo_url ? (
                    <img src={formData.profile_photo_url} alt="Profile preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  <label className="rehomer-profile-upload__button">
                    <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "profilePhoto")} />
                    {uploadingField === "profilePhoto" ? "Uploading..." : "Upload profile photo"}
                  </label>
                </div>

                <div className="rehomer-profile-upload">
                  <div>
                    <strong>ID front</strong>
                    <p>Required before verification can be submitted.</p>
                  </div>
                  {formData.id_front_url ? (
                    <img src={formData.id_front_url} alt="ID front preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  <label className="rehomer-profile-upload__button">
                    <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "idFront")} />
                    {uploadingField === "idFront" ? "Uploading..." : "Upload ID front"}
                  </label>
                </div>

                <div className="rehomer-profile-upload">
                  <div>
                    <strong>ID back</strong>
                    <p>Required before verification can be submitted.</p>
                  </div>
                  {formData.id_back_url ? (
                    <img src={formData.id_back_url} alt="ID back preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  <label className="rehomer-profile-upload__button">
                    <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "idBack")} />
                    {uploadingField === "idBack" ? "Uploading..." : "Upload ID back"}
                  </label>
                </div>
              </div>
            </section>

            <section className="rehomer-profile-card">
              <div className="rehomer-profile-card__header">
                <span className="rehomer-profile-card__eyebrow">Verification</span>
                <h2>Submit for review</h2>
                <p>For MVP testing, an admin can review your documents in Django admin and mark you verified or rejected.</p>
              </div>

              <div className="rehomer-profile-checklist">
                <div>Phone number: {formData.phone_number ? "Added" : "Missing"}</div>
                <div>ID front: {formData.id_front_url ? "Added" : "Missing"}</div>
                <div>ID back: {formData.id_back_url ? "Added" : "Missing"}</div>
              </div>

              <button
                type="button"
                className="rehomer-profile-button rehomer-profile-button--primary"
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
              >
                {submittingVerification ? "Submitting..." : "Submit Verification"}
              </button>

              {userData?.rehomer_verification_notes ? (
                <div className="rehomer-profile-notes">
                  <strong>Admin notes</strong>
                  <p>{userData.rehomer_verification_notes}</p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RehomerProfile;
