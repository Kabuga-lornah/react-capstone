import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../pages/firebaseconfig";
import { db, storage } from "../pages/firebaseconfig";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MAX_IMAGE_SIZE = 500 * 1024;

const AddPetForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    gender: "",
    description: "",
    personality: [],
    requirements: "",
    type: "dog",
    imageFile: null,
    imageBase64: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const personalityTraits = [
    "Friendly", "Shy", "Energetic", "Calm", "Playful",
    "Independent", "Affectionate", "Intelligent", "Loyal"
  ];

  const petTypes = ["dog", "cat", "bunny", "snake", "duck", "chick"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePersonalityChange = (trait) => {
    setFormData((prev) => {
      const updatedTraits = prev.personality.includes(trait)
        ? prev.personality.filter((t) => t !== trait)
        : [...prev.personality, trait];
      return { ...prev, personality: updatedTraits };
    });
  };


const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE) {
    setError("Image must be smaller than 500KB");
    return;
  }

  try {
    // Compress the image
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.5, 
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        imageFile: compressedFile,
        imageBase64: reader.result.split(",")[1],
      }));
    };

    reader.readAsDataURL(compressedFile);
  } catch (err) {
    setError("Failed to compress image");
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    let imageUrl = `/${formData.type}-default.jpg`;

    // Submit Base64 string to backend or API
    if (formData.imageBase64) {
      const response = await fetch("/upload-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: formData.imageBase64 }),
      });

      if (!response.ok) {
        throw new Error("Image upload failed");
      }

      const { url } = await response.json();
      imageUrl = url;
    }

    const petData = {
      name: formData.name,
      breed: formData.breed,
      age: formData.age,
      gender: formData.gender,
      description: formData.description,
      personality: formData.personality,
      requirements: formData.requirements,
      type: formData.type,
      imageUrl,
      rehomerId: auth.currentUser.uid,
      rehomerName: auth.currentUser.displayName || "Anonymous",
      createdAt: new Date(),
      adopted: false,
    };

    await addDoc(collection(db, "pets"), petData);
    navigate("/rehomer-dashboard");
  } catch (err) {
    setError(`Failed to submit the form: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-semibold mb-4">Add a New Pet</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Image Upload */}
        <div>
          <label className="block font-medium mb-1">Pet Image (Max 500KB, JPEG/PNG)</label>
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="block"
          />
          {formData.imageBase64 && (
            <div className="mt-2">
              <img
                src={`data:image/jpeg;base64,${formData.imageBase64}`}
                alt="Preview"
                className="w-32 h-32 object-cover border rounded"
              />
              <p className="text-sm text-gray-600 mt-1">Image ready for upload</p>
            </div>
          )}
        </div>

        {/* Name */}
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

        {/* Breed */}
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

        {/* Age */}
        <div>
          <label className="block font-medium">Age</label>
          <input
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Gender */}
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

        {/* Description */}
        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Personality */}
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

        {/* Requirements */}
        <div>
          <label className="block font-medium">Adoption Requirements</label>
          <input
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block font-medium">Pet Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            {petTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Adding Pet..." : "Add Pet"}
        </button>
      </form>
    </div>
  );
};



const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: "30px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: "600",
    fontSize: "16px",
  },
  input: {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    fontSize: "16px",
  },
  traitsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  traitItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#f0f0f0",
    padding: "5px 10px",
    borderRadius: "20px",
  },
  submitButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "20px",
    "&:disabled": {
      backgroundColor: "#ccc",
      cursor: "not-allowed",
    },
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: "20px",
  },
};

export default AddPetForm;
