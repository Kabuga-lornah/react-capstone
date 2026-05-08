import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  submitRehomerVerification,
  updateCurrentUser,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import RehomerWorkspaceNav from "./RehomerWorkspaceNav";
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

const isLockedStatus = (status) => status === "pending" || status === "verified";

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
  const isReviewLocked = isLockedStatus(verificationStatus);

  const welcomeName = useMemo(() => {
    const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim();
    return fullName || userData?.username || userData?.email || "Rehomer";
  }, [userData]);

  const missingRequiredFields = useMemo(() => {
    const missing = [];
    if (!formData.first_name.trim()) missing.push("first name");
    if (!formData.last_name.trim()) missing.push("last name");
    if (!formData.email.trim()) missing.push("email");
    if (!formData.phone_number.trim()) missing.push("phone number");
    if (!formData.profile_photo_url) missing.push("profile photo");
    if (!formData.id_front_url) missing.push("ID front");
    if (!formData.id_back_url) missing.push("ID back");
    return missing;
  }, [formData]);

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

  const handleFileUpload = async (event, fileKey) => {
    if (isReviewLocked) {
      return;
    }

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
    if (isReviewLocked) {
      return;
    }

    if (missingRequiredFields.length > 0) {
      setMessage({
        type: "error",
        text: `Please add your ${missingRequiredFields.join(", ")} before submitting.`,
      });
      return;
    }

    try {
      setSaving(true);
      setSubmittingVerification(true);
      setMessage({ type: "", text: "" });
      await updateCurrentUser({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        bio: formData.bio,
      });
      await submitRehomerVerification({
        phone_number: formData.phone_number,
        profile_photo_url: formData.profile_photo_url,
        id_front_url: formData.id_front_url,
        id_back_url: formData.id_back_url,
      });
      await syncProfile();
      navigate("/rehomer-dashboard", {
        replace: true,
        state: {
          successMessage:
            "Verification submitted. Please come back in 1 to 2 days to check whether your rehomer profile has been approved.",
        },
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to submit verification.",
      });
    } finally {
      setSaving(false);
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
            <p>Complete your private verification details so your listing access can be reviewed safely.</p>
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
          <section className="rehomer-profile-card">
            <div className="rehomer-profile-card__header">
              <span className="rehomer-profile-card__eyebrow">Profile Details</span>
              <h2>Contact and identity details</h2>
              <p>
                These details are only visible to you and admins for verification review.
                {isReviewLocked ? " This profile is locked while review is in progress." : ""}
              </p>
            </div>

            <div className="rehomer-profile-grid">
              <label className="rehomer-profile-field">
                <span>First name <em>*</em></span>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  readOnly={isReviewLocked}
                  disabled={isReviewLocked}
                />
              </label>
              <label className="rehomer-profile-field">
                <span>Last name <em>*</em></span>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  readOnly={isReviewLocked}
                  disabled={isReviewLocked}
                />
              </label>
              <label className="rehomer-profile-field">
                <span>Email <em>*</em></span>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  readOnly={isReviewLocked}
                  disabled={isReviewLocked}
                />
              </label>
              <label className="rehomer-profile-field">
                <span>Phone number <em>*</em></span>
                <input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="For example, +2547..."
                  readOnly={isReviewLocked}
                  disabled={isReviewLocked}
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
                  readOnly={isReviewLocked}
                  disabled={isReviewLocked}
                />
              </label>
            </div>
          </section>

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
                    <strong>Profile photo *</strong>
                    <p>Required for identity review.</p>
                  </div>
                  {formData.profile_photo_url ? (
                    <img src={formData.profile_photo_url} alt="Profile preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  {isReviewLocked ? (
                    <div className="rehomer-profile-upload__locked">Locked while review is in progress.</div>
                  ) : (
                    <label className="rehomer-profile-upload__button">
                      <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "profilePhoto")} />
                      {uploadingField === "profilePhoto" ? "Uploading..." : "Upload profile photo"}
                    </label>
                  )}
                </div>

                <div className="rehomer-profile-upload">
                  <div>
                    <strong>ID front *</strong>
                    <p>Required before verification can be submitted.</p>
                  </div>
                  {formData.id_front_url ? (
                    <img src={formData.id_front_url} alt="ID front preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  {isReviewLocked ? (
                    <div className="rehomer-profile-upload__locked">Locked while review is in progress.</div>
                  ) : (
                    <label className="rehomer-profile-upload__button">
                      <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "idFront")} />
                      {uploadingField === "idFront" ? "Uploading..." : "Upload ID front"}
                    </label>
                  )}
                </div>

                <div className="rehomer-profile-upload">
                  <div>
                    <strong>ID back *</strong>
                    <p>Required before verification can be submitted.</p>
                  </div>
                  {formData.id_back_url ? (
                    <img src={formData.id_back_url} alt="ID back preview" className="rehomer-profile-upload__image" />
                  ) : null}
                  {isReviewLocked ? (
                    <div className="rehomer-profile-upload__locked">Locked while review is in progress.</div>
                  ) : (
                    <label className="rehomer-profile-upload__button">
                      <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "idBack")} />
                      {uploadingField === "idBack" ? "Uploading..." : "Upload ID back"}
                    </label>
                  )}
                </div>
              </div>
            </section>

            <section className="rehomer-profile-card">
              <div className="rehomer-profile-card__header">
                <span className="rehomer-profile-card__eyebrow">Verification</span>
                <h2>Submit for review</h2>
                <p>
                  Submit once and wait for admin review. While your status is pending review or verified,
                  this profile stays locked.
                </p>
              </div>

              <div className="rehomer-profile-checklist">
                <div>Phone number: {formData.phone_number ? "Added" : "Missing"}</div>
                <div>Profile photo: {formData.profile_photo_url ? "Added" : "Missing"}</div>
                <div>ID front: {formData.id_front_url ? "Added" : "Missing"}</div>
                <div>ID back: {formData.id_back_url ? "Added" : "Missing"}</div>
              </div>

              <button
                type="button"
                className="rehomer-profile-button rehomer-profile-button--primary"
                onClick={handleSubmitVerification}
                disabled={submittingVerification || saving || isReviewLocked}
              >
                {verificationStatus === "verified"
                  ? "Verified"
                  : verificationStatus === "pending"
                    ? "Pending Review"
                    : submittingVerification || saving
                      ? "Submitting..."
                      : "Submit Verification"}
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

      <RehomerWorkspaceNav />
    </div>
  );
};

export default RehomerProfile;
