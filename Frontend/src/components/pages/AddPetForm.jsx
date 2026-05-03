import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPet, getAccessToken } from "../../services/api";
import { useAuth } from "./AuthContext";
import "./AddPetForm.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const personalityTraits = [
  "Friendly",
  "Shy",
  "Energetic",
  "Calm",
  "Playful",
  "Independent",
  "Affectionate",
  "Intelligent",
  "Loyal",
];

const petTypes = [
  { label: "Dog", value: "dog" },
  { label: "Cat", value: "cat" },
  { label: "Bird", value: "bird" },
  { label: "Rabbit", value: "rabbit" },
  { label: "Other", value: "other" },
];

const levelOptions = [
  { label: "Unknown", value: "unknown" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const careLevelOptions = [
  { label: "Unknown", value: "unknown" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Experienced", value: "experienced" },
];

const spaceOptions = [
  { label: "Unknown", value: "unknown" },
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

const yesNoUnknownOptions = [
  { label: "Unknown", value: "unknown" },
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const genderOptions = [
  { label: "Select gender", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const careFields = [
  {
    name: "energyLevel",
    label: "Energy Level",
    helper: "How lively or low-key is this pet most days?",
    options: levelOptions,
  },
  {
    name: "careLevel",
    label: "Care Level",
    helper: "How much experience does this pet usually need?",
    options: careLevelOptions,
  },
  {
    name: "spaceNeeded",
    label: "Space Needed",
    helper: "What kind of home size helps this pet thrive?",
    options: spaceOptions,
  },
  {
    name: "groomingNeeds",
    label: "Grooming Needs",
    helper: "How often will coat or hygiene care be needed?",
    options: levelOptions,
  },
  {
    name: "noiseLevel",
    label: "Noise Level",
    helper: "How vocal or expressive is this pet likely to be?",
    options: levelOptions,
  },
  {
    name: "apartmentFriendly",
    label: "Apartment Friendly",
    helper: "Would this pet likely do well in a smaller home setup?",
    options: yesNoUnknownOptions,
  },
  {
    name: "goodWithChildren",
    label: "Good With Children",
    helper: "Share what you know about child compatibility.",
    options: yesNoUnknownOptions,
  },
  {
    name: "goodWithOtherPets",
    label: "Good With Other Pets",
    helper: "Does this pet usually mix well with other animals?",
    options: yesNoUnknownOptions,
  },
];

const healthChecklist = [
  {
    name: "isVaccinated",
    label: "Vaccinated",
    helper: "Only mark this if you have a vet card, vaccination booklet, clinic note, or other clear record.",
  },
  {
    name: "isDewormed",
    label: "Dewormed",
    helper: "Only mark this if you have a treatment note, vet record, receipt, or another reliable confirmation.",
  },
  {
    name: "isNeutered",
    label: "Neutered / Spayed",
    helper: "Only mark this if you have surgery confirmation, a vet note, receipt, or another trusted record.",
  },
];

const listingTips = [
  "Use clear natural light photos.",
  "Mention temperament honestly.",
  "Share health and vaccination details.",
  "Explain the ideal home.",
  "Avoid rushing adoption decisions.",
];

const getDefaultPreviewImage = (type) =>
  `https://res.cloudinary.com/dgdf0svqx/image/upload/v1712345678/default-${type}.jpg`;

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const AddPetThemedSelect = ({
  name,
  value,
  options,
  placeholder,
  onChange,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const buttonLabel = selectedOption?.label || placeholder;

  const handleSelect = (nextValue) => {
    onChange(name, nextValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={selectRef}
      className={`add-pet-themed-select ${isOpen ? "add-pet-themed-select--open" : ""}`}
    >
      <button
        type="button"
        className="add-pet-themed-select__trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={!value ? "add-pet-themed-select__placeholder" : ""}>
          {buttonLabel}
        </span>
        <span className="add-pet-themed-select__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="add-pet-themed-select__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={`${name}-${option.value || "empty"}`}
                type="button"
                role="option"
                aria-selected={selected}
                className={`add-pet-themed-select__option ${selected ? "add-pet-themed-select__option--selected" : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const AddPetForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { userData, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    gender: "",
    location: "",
    description: "",
    personality: [],
    requirements: "",
    type: "dog",
    customPetType: "",
    imageFile: null,
    imageUrl: "",
    isVaccinated: false,
    isDewormed: false,
    isNeutered: false,
    adoptionFee: "",
    energyLevel: "unknown",
    careLevel: "unknown",
    spaceNeeded: "unknown",
    goodWithChildren: "unknown",
    goodWithOtherPets: "unknown",
    groomingNeeds: "unknown",
    noiseLevel: "unknown",
    apartmentFriendly: "unknown",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePositionX, setImagePositionX] = useState(50);
  const [imagePositionY, setImagePositionY] = useState(50);
  const [imageFitMode, setImageFitMode] = useState("cover");

  const hasToken = Boolean(getAccessToken());
  const isAllowedRole = userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const isVerifiedRehomer = verificationStatus === "verified";

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasToken) {
      navigate("/login/rehomer", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  useEffect(() => () => {
    if (formData.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imageUrl);
    }
  }, [formData.imageUrl]);

  const previewImage = useMemo(
    () => formData.imageUrl || getDefaultPreviewImage(formData.type),
    [formData.imageUrl, formData.type],
  );

  const previewFee = formData.adoptionFee
    ? `KSh ${Number(formData.adoptionFee).toLocaleString()}`
    : "Adoption fee not set";

  const previewPetTypeLabel =
    formData.type === "other" && formData.customPetType.trim()
      ? formData.customPetType.trim()
      : formData.type
        ? toTitleCase(formData.type)
        : "Type";

  const previewImageStyle = useMemo(
    () => ({
      objectFit: imageFitMode,
      objectPosition: `${imagePositionX}% ${imagePositionY}%`,
      transform: `scale(${imageZoom})`,
      transformOrigin: `${imagePositionX}% ${imagePositionY}%`,
    }),
    [imageFitMode, imagePositionX, imagePositionY, imageZoom],
  );

  const resetImageFraming = () => {
    setImageZoom(1);
    setImagePositionX(50);
    setImagePositionY(50);
    setImageFitMode("cover");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "type" && value !== "other" ? { customPetType: "" } : {}),
    }));
  };

  const handlePersonalityChange = (trait) => {
    setFormData((prev) => {
      const updatedTraits = prev.personality.includes(trait)
        ? prev.personality.filter((item) => item !== trait)
        : [...prev.personality, trait];

      return { ...prev, personality: updatedTraits };
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.match("image.*")) {
      setError("Please select an image file (JPEG or PNG).");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setFormData((prev) => {
      if (prev.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.imageUrl);
      }

      return {
        ...prev,
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
      };
    });
    resetImageFraming();
    setError("");
  };

  const uploadImageToCloudinary = async (file) => {
    const imageFormData = new FormData();
    imageFormData.append("file", file);
    imageFormData.append("upload_preset", "pets_presets");
    imageFormData.append("cloud_name", "dgdf0svqx");

    try {
      setUploadingImage(true);
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dgdf0svqx/image/upload",
        {
          method: "POST",
          body: imageFormData,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.secure_url;
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      throw new Error("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasToken) {
      navigate("/login/rehomer");
      return;
    }

    if (!isAllowedRole) {
      setError("Only rehomers or shelter admins can create pet listings.");
      return;
    }

    if (!isVerifiedRehomer) {
      setError("Complete verification before adding a pet.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const customTypePrefix =
        formData.type === "other" && formData.customPetType.trim()
          ? `Pet type: ${formData.customPetType.trim()}. `
          : "";

      let uploadedImageUrl = "";

      if (formData.imageFile) {
        uploadedImageUrl = await uploadImageToCloudinary(formData.imageFile);
      } else {
        uploadedImageUrl = getDefaultPreviewImage(formData.type);
      }

      const payload = {
        name: formData.name,
        species: formData.type,
        breed: formData.breed,
        age: formData.age,
        gender: formData.gender,
        location: formData.location || formData.requirements,
        description: `${customTypePrefix}${formData.description}`.trim(),
        personality_traits: formData.personality,
        energy_level: formData.energyLevel,
        care_level: formData.careLevel,
        space_needed: formData.spaceNeeded,
        good_with_children: formData.goodWithChildren,
        good_with_other_pets: formData.goodWithOtherPets,
        grooming_needs: formData.groomingNeeds,
        noise_level: formData.noiseLevel,
        apartment_friendly: formData.apartmentFriendly,
        is_vaccinated: formData.isVaccinated,
        is_dewormed: formData.isDewormed,
        is_neutered: formData.isNeutered,
        adoption_fee: formData.adoptionFee || "0.00",
        status: "available",
        image_url: uploadedImageUrl,
      };

      await createPet(payload);
      setSuccessMessage("Pet listing created successfully. Redirecting...");

      setTimeout(() => {
        if (userData?.role === "rehomer" || userData?.role === "shelter_admin") {
          navigate("/rehomer-dashboard");
          return;
        }

        navigate("/pets");
      }, 1000);
    } catch (submitError) {
      setError(submitError.message || "Failed to create pet listing.");
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && hasToken && !isAllowedRole) {
    return (
      <div className="add-pet-shell">
        <div className="add-pet-layout add-pet-layout--tight">
          <div className="add-pet-state-card">
            <span className="add-pet-badge">Rehomer Listing Studio</span>
            <h1>Add a New Pet</h1>
            <p className="add-pet-state-card__error">
              Access denied. Only rehomers or shelter admins can create pet listings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && hasToken && isAllowedRole && !isVerifiedRehomer) {
    return (
      <div className="add-pet-shell">
        <div className="add-pet-layout add-pet-layout--tight">
          <div className="add-pet-state-card">
            <span className="add-pet-badge">Rehomer Listing Studio</span>
            <h1>Complete verification before adding a pet</h1>
            <p className="add-pet-state-card__copy">
              Your current verification status is <strong>{verificationStatus}</strong>. Submit your rehomer profile and ID details first, then you can return here once approved.
            </p>
            <div className="add-pet-submit">
              <button
                type="button"
                onClick={() => navigate("/rehomer-profile")}
                className="add-pet-submit__primary"
              >
                Go to Rehomer Profile
              </button>
              <button
                type="button"
                onClick={() => navigate("/rehomer-dashboard")}
                className="add-pet-submit__secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-pet-shell">
      <div className="add-pet-layout">
        <section className="add-pet-hero">
          <div>
            <span className="add-pet-badge">Rehomer Listing Studio</span>
            <h1>Add a New Pet</h1>
            <p className="add-pet-hero__subtitle">
              Create a warm, honest profile to help your pet find a safe home.
            </p>
          </div>
          <div className="add-pet-hero__tip">
            <strong>Helpful note</strong>
            <span>Clear photos and honest details improve adoption chances.</span>
          </div>
        </section>

        {error && <div className="add-pet-banner add-pet-banner--error">{error}</div>}
        {successMessage && <div className="add-pet-banner add-pet-banner--success">{successMessage}</div>}

        <div className="add-pet-content">
          <form onSubmit={handleSubmit} className="add-pet-form">
            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Pet Photo</span>
                <h2>Lead with a warm first impression</h2>
                <p>Upload a clear photo that helps adopters feel connected right away.</p>
              </div>

              <div className="add-pet-upload">
                <input
                  ref={fileInputRef}
                  id="pet-image-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="add-pet-upload__input"
                />
                <button
                  type="button"
                  className="add-pet-upload__dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="add-pet-upload__icon">📸</span>
                  <strong>{formData.imageFile ? "Replace your photo" : "Upload a pet photo"}</strong>
                  <span>JPEG or PNG, up to 5MB</span>
                  <em>{uploadingImage ? "Uploading image..." : formData.imageFile ? "Ready to upload" : "Tap to choose a file"}</em>
                </button>

                <div className="add-pet-upload__preview-card">
                  <div className="add-pet-upload__preview-frame">
                    <img
                      src={previewImage}
                      alt="Pet preview"
                      className="add-pet-upload__preview-image"
                      style={previewImageStyle}
                    />
                  </div>
                  <div className="add-pet-upload__preview-copy">
                    <span className="add-pet-card-badge">Preview image</span>
                    <p>
                      {formData.imageFile
                        ? formData.imageFile.name
                        : "No upload yet. A default pet image will be used if you skip this step."}
                    </p>
                  </div>
                </div>

                <div className="add-pet-image-controls">
                  <div className="add-pet-image-controls__header">
                    <div>
                      <span className="add-pet-card-badge add-pet-card-badge--soft">Preview controls</span>
                      <p>Adjust the preview so your pet’s face is clearly visible.</p>
                      <small>This only changes how the image appears in the listing preview.</small>
                    </div>
                    <button
                      type="button"
                      className="add-pet-image-controls__reset"
                      onClick={resetImageFraming}
                    >
                      Reset image position
                    </button>
                  </div>

                  <label className="add-pet-image-controls__toggle">
                    <input
                      type="checkbox"
                      checked={imageFitMode === "contain"}
                      onChange={(event) => setImageFitMode(event.target.checked ? "contain" : "cover")}
                    />
                    <span>Fit full image</span>
                  </label>

                  <div className="add-pet-slider-grid">
                    <label className="add-pet-slider-field">
                      <div>
                        <span>Zoom</span>
                        <strong>{imageZoom.toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.8"
                        step="0.01"
                        value={imageZoom}
                        onChange={(event) => setImageZoom(Number(event.target.value))}
                      />
                    </label>

                    <label className="add-pet-slider-field">
                      <div>
                        <span>Horizontal position</span>
                        <strong>{imagePositionX}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={imagePositionX}
                        onChange={(event) => setImagePositionX(Number(event.target.value))}
                      />
                    </label>

                    <label className="add-pet-slider-field">
                      <div>
                        <span>Vertical position</span>
                        <strong>{imagePositionY}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={imagePositionY}
                        onChange={(event) => setImagePositionY(Number(event.target.value))}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Basic Details</span>
                <h2>Share the essentials clearly</h2>
                <p>These are the details adopters look for first when deciding if a pet fits their home.</p>
              </div>

              <div className="add-pet-grid add-pet-grid--two">
                <label className="add-pet-field">
                  <span>Pet Name</span>
                  <small>Use the name adopters should recognize.</small>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="For example, Milo"
                    required
                  />
                </label>

                <label className="add-pet-field">
                  <span>Breed</span>
                  <small>Include the breed or a helpful best guess.</small>
                  <input
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    placeholder="For example, Beagle mix"
                    required
                  />
                </label>

                <label className="add-pet-field">
                  <span>Age</span>
                  <small>Use years, months, or a short estimate.</small>
                  <input
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="For example, 2 years"
                  />
                </label>

                <label className="add-pet-field">
                  <span>Gender</span>
                  <small>Select the gender if known.</small>
                  <AddPetThemedSelect
                    name="gender"
                    value={formData.gender}
                    options={genderOptions}
                    placeholder="Select gender"
                    ariaLabel="Select gender"
                    onChange={handleSelectChange}
                  />
                </label>

                <label className="add-pet-field">
                  <span>Pet Type</span>
                  <small>Choose the species adopters will browse under.</small>
                  <AddPetThemedSelect
                    name="type"
                    value={formData.type}
                    options={petTypes}
                    placeholder="Select pet type"
                    ariaLabel="Select pet type"
                    onChange={handleSelectChange}
                  />
                </label>

                {formData.type === "other" ? (
                  <label className="add-pet-field">
                    <span>Actual Pet Type</span>
                    <small>Tell adopters what kind of pet this is, for example turtle, duck, hamster, or goat.</small>
                    <input
                      name="customPetType"
                      value={formData.customPetType}
                      onChange={handleChange}
                      placeholder="For example, Turtle"
                      required
                    />
                  </label>
                ) : null}

                <label className="add-pet-field">
                  <span>Location</span>
                  <small>City, neighborhood, or area is enough.</small>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="For example, Westlands, Nairobi"
                  />
                </label>
              </div>
            </section>

            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Personality & Story</span>
                <h2>Help adopters imagine life together</h2>
                <p>Describe the pet with warmth and honesty so the right home can recognize a good fit.</p>
              </div>

              <div className="add-pet-field">
                <span>Personality Traits</span>
                <small>Select all traits that genuinely fit this pet.</small>
                <div className="add-pet-chip-group">
                  {personalityTraits.map((trait) => {
                    const selected = formData.personality.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => handlePersonalityChange(trait)}
                        className={`add-pet-chip ${selected ? "add-pet-chip--selected" : ""}`}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="add-pet-field">
                <span>Description</span>
                <small>What is this pet like day to day? Mention temperament, habits, and the kind of home that fits best.</small>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="For example, Milo is gentle with visitors, enjoys short play sessions, and settles well with a calm evening routine."
                  rows={5}
                />
              </label>
            </section>

            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Adoption Requirements</span>
                <h2>Set expectations with care</h2>
                <p>Share any needs about the home, routine, or adopter setup that would help this pet transition well.</p>
              </div>

              <div className="add-pet-grid add-pet-grid--two">
                <label className="add-pet-field add-pet-field--wide">
                  <span>Adoption Requirements</span>
                  <small>This can include home setup, schedule, experience, or anything adopters should know.</small>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleChange}
                    placeholder="For example, would do best in a calm home, needs secure outdoor space, or benefits from patient introductions."
                    rows={4}
                  />
                </label>

                <label className="add-pet-field">
                  <span>Adoption Fee</span>
                  <small>Leave blank if no fee applies.</small>
                  <input
                    name="adoptionFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.adoptionFee}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </label>
              </div>
            </section>

            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Care & Compatibility</span>
                <h2>Add the details that improve matching</h2>
                <p>These structured details help adopters and the quiz understand what kind of home is most suitable.</p>
              </div>

                <div className="add-pet-select-grid">
                  {careFields.map((field) => (
                    <label key={field.name} className="add-pet-select-card">
                      <span>{field.label}</span>
                      <small>{field.helper}</small>
                      <AddPetThemedSelect
                        name={field.name}
                        value={formData[field.name]}
                        options={field.options}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        ariaLabel={field.label}
                        onChange={handleSelectChange}
                      />
                    </label>
                  ))}
                </div>
            </section>

            <section className="add-pet-section">
              <div className="add-pet-section__header">
                <span className="add-pet-section__eyebrow">Health Checklist</span>
                <h2>Mark only health details you can confirm</h2>
                <p>
                  These notes should be backed by something reliable, like a vet card,
                  vaccination booklet, clinic note, or receipt. If you are unsure, leave
                  it unchecked and explain what you know in the description.
                </p>
              </div>

              <div className="add-pet-toggle-grid">
                {healthChecklist.map((item) => (
                  <label key={item.name} className={`add-pet-toggle-card ${formData[item.name] ? "add-pet-toggle-card--selected" : ""}`}>
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={formData[item.name]}
                      onChange={handleChange}
                    />
                    <div>
                      <span>{item.label}</span>
                      <small>{item.helper}</small>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="add-pet-submit">
              <button
                type="submit"
                disabled={loading || uploadingImage || authLoading}
                className="add-pet-submit__primary"
              >
                {loading ? "Adding Pet..." : "Create Pet Listing"}
                {uploadingImage ? " (Uploading Image...)" : ""}
              </button>
              <button
                type="button"
                onClick={() => navigate("/rehomer-dashboard")}
                className="add-pet-submit__secondary"
              >
                Back to Dashboard
              </button>
            </section>
          </form>

          <aside className="add-pet-sidebar">
            <div className="add-pet-preview-card">
              <span className="add-pet-card-badge">Draft listing preview</span>
              <div className="add-pet-preview-card__image-wrap">
                <img
                  src={previewImage}
                  alt="Pet listing preview"
                  className="add-pet-preview-card__image"
                  style={previewImageStyle}
                />
              </div>
              <div className="add-pet-preview-card__body">
                <h3>{formData.name || "Your pet's name"}</h3>
                <p>
                  {formData.breed || "Breed"} {" - "} {previewPetTypeLabel} {" - "} {formData.age || "Age"}
                </p>
                <p>{formData.location || "Location not added yet"}</p>
                <div className="add-pet-preview-card__chips">
                  {(formData.personality.length > 0 ? formData.personality : ["Personality traits"]).slice(0, 5).map((trait) => (
                    <span key={trait} className="add-pet-preview-chip">
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="add-pet-preview-card__footer">
                  <span className="add-pet-card-badge add-pet-card-badge--soft">Available</span>
                  <strong>{previewFee}</strong>
                </div>
              </div>
            </div>

            <div className="add-pet-tips-card">
              <span className="add-pet-card-badge">Listing Tips</span>
              <h3>Small details build trust</h3>
              <ul>
                {listingTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AddPetForm;

