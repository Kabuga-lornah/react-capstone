import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPet, getAccessToken } from "../../services/api";
import { useAuth } from "./AuthContext";

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

const AddPetForm = () => {
  const navigate = useNavigate();
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
    imageFile: null,
    imageUrl: "",
    isVaccinated: false,
    isDewormed: false,
    isNeutered: false,
    adoptionFee: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const hasToken = Boolean(getAccessToken());
  const isAllowedRole = userData?.role === "rehomer" || userData?.role === "shelter_admin";

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasToken) {
      navigate("/login/rehomer", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      setError("Please select an image file (JPEG, PNG)");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      imageFile: file,
      imageUrl: URL.createObjectURL(file),
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasToken) {
      navigate("/login/rehomer");
      return;
    }

    if (!isAllowedRole) {
      setError("Only rehomers or shelter admins can create pet listings.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      let uploadedImageUrl = "";

      if (formData.imageFile) {
        uploadedImageUrl = await uploadImageToCloudinary(formData.imageFile);
      } else {
        uploadedImageUrl = `https://res.cloudinary.com/dgdf0svqx/image/upload/v1712345678/default-${formData.type}.jpg`;
      }

      const payload = {
        name: formData.name,
        species: formData.type,
        breed: formData.breed,
        age: formData.age,
        gender: formData.gender,
        location: formData.location || formData.requirements,
        description: formData.description,
        personality_traits: formData.personality,
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
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
        <h1 className="text-2xl font-semibold mb-4">Add a New Pet</h1>
        <p className="text-red-500">
          Access denied. Only rehomers or shelter admins can create pet listings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-semibold mb-4">Add a New Pet</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {successMessage && <p className="text-green-600 mb-4">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Pet Image (Max 5MB, JPEG/PNG)</label>
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {formData.imageUrl && (
            <div className="mt-4">
              <img
                src={formData.imageUrl}
                alt="Pet preview"
                className="max-w-xs max-h-64 object-contain rounded-lg border border-gray-200"
              />
              <p className="text-sm text-gray-500 mt-1">
                {uploadingImage ? "Uploading image to Cloudinary..." : "Ready to upload"}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block font-medium">Pet Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Breed</label>
          <input
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Age</label>
          <input
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Location</label>
          <input
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Enter the pet's location"
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Personality Traits</label>
          <div className="grid grid-cols-3 gap-2">
            {personalityTraits.map((trait) => (
              <label key={trait} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.personality.includes(trait)}
                  onChange={() => handlePersonalityChange(trait)}
                />
                {trait}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium">Adoption Requirements</label>
          <input
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Pet Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            {petTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Adoption Fee</label>
          <input
            name="adoptionFee"
            type="number"
            min="0"
            step="0.01"
            value={formData.adoptionFee}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isVaccinated"
              checked={formData.isVaccinated}
              onChange={handleChange}
            />
            Vaccinated
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isDewormed"
              checked={formData.isDewormed}
              onChange={handleChange}
            />
            Dewormed
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isNeutered"
              checked={formData.isNeutered}
              onChange={handleChange}
            />
            Neutered / Spayed
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || uploadingImage || authLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full disabled:bg-blue-300"
        >
          {loading ? "Adding Pet..." : "Add Pet"}
          {uploadingImage && " (Uploading Image...)"}
        </button>
      </form>
    </div>
  );
};

export default AddPetForm;
