import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../pages/firebaseconfig";
import { db } from "../pages/firebaseconfig";
import { collection, addDoc } from "firebase/firestore";


const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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
    imageUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const personalityTraits = [
    "Friendly", "Shy", "Energetic", "Calm", "Playful",
    "Independent", "Affectionate", "Intelligent", "Loyal"
  ];

  const petTypes = ["dogs", "cats", "bunnies", "snakes", "ducks", "chicks"];

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError("Please select an image file (JPEG, PNG)");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      imageFile: file,
      imageUrl: URL.createObjectURL(file)
    }));
    setError("");
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'pets_presets'); 
    formData.append('cloud_name', 'dgdf0svqx')
    
    try {
      setUploadingImage(true);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dgdf0svqx/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let imageUrl = "";

      if (formData.imageFile) {
        imageUrl = await uploadImageToCloudinary(formData.imageFile);
      } else {
        // Fallback to default image
        imageUrl = `https://res.cloudinary.com/dgdf0svqx/image/upload/v1712345678/default-${formData.type}.jpg`;
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
          disabled={loading || uploadingImage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full disabled:bg-blue-300"
        >
          {loading ? "Adding Pet..." : "Add Pet"}
          {uploadingImage && " (Uploading Image...)"}
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
