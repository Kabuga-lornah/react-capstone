import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPets } from "../../services/api";
import { useAuth } from "./AuthContext";

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const getPetImageUrl = (pet) => {
  const mainImage = pet.images?.find((image) => image.is_main);
  const fallbackImage = pet.images?.[0];

  return (
    pet.imageUrl ||
    pet.image_url ||
    mainImage?.image_url ||
    fallbackImage?.image_url ||
    mainImage?.image ||
    fallbackImage?.image ||
    "/default-pet.jpg"
  );
};

const normalizePet = (pet) => ({
  ...pet,
  id: String(pet.id),
  type: pet.type || pet.species || "other",
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [],
  imageUrl: getPetImageUrl(pet),
});

const PetQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [availablePets, setAvailablePets] = useState([]);
  const [likedPets, setLikedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const questions = [
    "What activity do you enjoy the most?",
    "How would your friends describe you?",
    "What's your favorite time of day?",
    "Choose a weekend activity:",
    "What kind of movies do you enjoy most?",
    "How do you handle stress?",
    "What's your ideal vacation?",
    "Choose a superpower:",
    "What's your communication style?",
    "How do you make decisions?",
  ];

  const options = [
    ["Running", "Reading", "Sleeping", "Eating"],
    ["Adventurous", "Calm", "Playful", "Loyal"],
    ["Morning", "Afternoon", "Evening", "Night"],
    ["Hiking", "Watching TV", "Playing games", "Cooking"],
    ["Action", "Drama", "Comedy", "Documentary"],
    ["Exercise", "Meditation", "Distract myself", "Talk to friends"],
    ["Beach relaxation", "Mountain trekking", "City exploration", "Countryside retreat"],
    ["Super strength", "Invisibility", "Teleportation", "Mind reading"],
    ["Direct and clear", "Thoughtful and careful", "Expressive and animated", "Observant and quiet"],
    ["Quickly based on instinct", "After careful research", "With input from others", "I struggle with decisions"],
  ];

  const personalityMatches = {
    Running: ["Energetic", "Active", "Playful", "Athletic"],
    Reading: ["Calm", "Quiet", "Gentle", "Intelligent"],
    Sleeping: ["Laid-back", "Easygoing", "Relaxed"],
    Eating: ["Food-motivated", "Eager", "Hungry"],
    Adventurous: ["Brave", "Confident", "Curious", "Daring"],
    Calm: ["Gentle", "Quiet", "Relaxed", "Peaceful"],
    Playful: ["Fun-loving", "Energetic", "Friendly", "Goofy"],
    Loyal: ["Devoted", "Affectionate", "Obedient", "Faithful"],
    Morning: ["Energetic", "Alert", "Active", "Early-riser"],
    Afternoon: ["Sociable", "Friendly", "Relaxed"],
    Evening: ["Calm", "Quiet", "Cuddly"],
    Night: ["Independent", "Quiet", "Nocturnal"],
    Hiking: ["Adventurous", "Energetic", "Outdoorsy"],
    "Watching TV": ["Cuddly", "Calm", "Relaxed", "Lazy"],
    "Playing games": ["Playful", "Intelligent", "Competitive"],
    Cooking: ["Food-motivated", "Patient", "Attentive"],
    Action: ["Energetic", "Playful", "Excitable"],
    Drama: ["Sensitive", "Expressive", "Emotional"],
    Comedy: ["Playful", "Goofy", "Entertaining"],
    Documentary: ["Intelligent", "Observant", "Curious"],
    Exercise: ["Energetic", "Athletic", "Disciplined"],
    Meditation: ["Calm", "Gentle", "Peaceful"],
    "Distract myself": ["Playful", "Curious", "Easily-bored"],
    "Talk to friends": ["Sociable", "Friendly", "Vocal"],
    "Beach relaxation": ["Calm", "Easygoing", "Relaxed"],
    "Mountain trekking": ["Adventurous", "Brave", "Strong"],
    "City exploration": ["Confident", "Curious", "Adaptable"],
    "Countryside retreat": ["Gentle", "Relaxed", "Peaceful"],
    "Super strength": ["Confident", "Powerful", "Protective"],
    Invisibility: ["Shy", "Quiet", "Observant"],
    Teleportation: ["Energetic", "Playful", "Restless"],
    "Mind reading": ["Intelligent", "Sensitive", "Perceptive"],
    "Direct and clear": ["Confident", "Bold", "Assertive"],
    "Thoughtful and careful": ["Gentle", "Cautious", "Patient"],
    "Expressive and animated": ["Playful", "Vocal", "Excitable"],
    "Observant and quiet": ["Shy", "Gentle", "Watchful"],
    "Quickly based on instinct": ["Confident", "Independent", "Decisive"],
    "After careful research": ["Intelligent", "Cautious", "Thoughtful"],
    "With input from others": ["Sociable", "Friendly", "Cooperative"],
    "I struggle with decisions": ["Gentle", "Cautious", "Indecisive"],
  };

  useEffect(() => {
    const fetchAvailablePets = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        const normalizedPets = petsData.map(normalizePet);

        setAvailablePets(normalizedPets);
      } catch (fetchError) {
        console.error("Error fetching pets:", fetchError);
        setError(fetchError.message || "Failed to load pets. Please try again later.");
        setAvailablePets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailablePets();
  }, []);

  useEffect(() => {
    if (answeredCurrent && currentQuestion < questions.length - 1) {
      const timer = setTimeout(() => {
        setCurrentQuestion((prev) => prev + 1);
        setAnsweredCurrent(false);
      }, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [answeredCurrent, currentQuestion, questions.length]);

  useEffect(() => {
    if (answeredCurrent && currentQuestion === questions.length - 1) {
      calculateResult();
    }
  }, [answeredCurrent, currentQuestion, questions.length]);

  const handleAnswer = (option) => {
    setAnswers({
      ...answers,
      [currentQuestion]: option,
    });
    setAnsweredCurrent(true);
  };

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResult = () => {
    try {
      const allAnswers = Object.values(answers);
      const traits = allAnswers.flatMap((answer) => personalityMatches[answer] || []);

      const traitCounts = traits.reduce((acc, trait) => {
        acc[trait] = (acc[trait] || 0) + 1;
        return acc;
      }, {});

      let topTraits = Object.entries(traitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((item) => item[0]);

      while (topTraits.length < 3) {
        const firstOptionTraits = personalityMatches[options[0][0]] || [];
        const remainingTraits = firstOptionTraits.filter((trait) => !topTraits.includes(trait));
        topTraits.push(...remainingTraits.slice(0, 3 - topTraits.length));
      }

      const petsWithScores = availablePets.map((pet) => {
        let score = 0;
        const matchedTraits = [];

        pet.personality.forEach((trait) => {
          if (topTraits.includes(trait)) {
            score += (traitCounts[trait] || 1) * 2;
            matchedTraits.push(trait);
          }
        });

        if (matchedTraits.length > 1) {
          score += matchedTraits.length * 5;
        }

        const percentage = traits.length
          ? Math.min(Math.round((score / (traits.length * 3)) * 100), 100)
          : 0;

        return {
          ...pet,
          matchPercentage: percentage > 25 ? percentage : 25 + Math.floor(Math.random() * 25),
          matchedTraits,
          rawScore: score,
        };
      });

      let topMatches = petsWithScores
        .filter((pet) => pet.matchedTraits.length > 0)
        .sort((a, b) => b.rawScore - a.rawScore)
        .slice(0, 3);

      if (topMatches.length === 0) {
        const shuffled = [...availablePets].sort(() => 0.5 - Math.random());
        topMatches = shuffled.slice(0, 3).map((pet) => ({
          ...pet,
          matchPercentage: 25 + Math.floor(Math.random() * 25),
          matchedTraits: pet.personality.slice(0, 2),
          rawScore: 25 + Math.floor(Math.random() * 25),
        }));
      }

      const scaledScores = topMatches.map((pet, index) => {
        const rankBoost = Math.pow(1.5, 2 - index);
        return {
          ...pet,
          scaledScore: pet.rawScore * rankBoost,
        };
      });

      const totalScaledScore = scaledScores.reduce((sum, pet) => sum + pet.scaledScore, 0);

      let normalizedMatches = scaledScores.map((pet) => ({
        ...pet,
        matchPercentage: totalScaledScore
          ? Math.round((pet.scaledScore / totalScaledScore) * 100)
          : 0,
      }));

      if (
        normalizedMatches.length > 1 &&
        normalizedMatches[0].matchPercentage - normalizedMatches[1].matchPercentage < 10
      ) {
        const gap = 10;
        const totalToRedistribute =
          gap - (normalizedMatches[0].matchPercentage - normalizedMatches[1].matchPercentage);

        normalizedMatches[0].matchPercentage += Math.ceil(totalToRedistribute * 0.7);
        normalizedMatches[1].matchPercentage -= Math.ceil(totalToRedistribute * 0.3);

        if (normalizedMatches.length > 2 && normalizedMatches[2].matchPercentage < 5) {
          normalizedMatches[2].matchPercentage = 5;
        }
      }

      const sum = normalizedMatches.reduce((currentSum, pet) => currentSum + pet.matchPercentage, 0);
      if (sum !== 100 && normalizedMatches.length > 0) {
        normalizedMatches[normalizedMatches.length - 1].matchPercentage += 100 - sum;
        if (normalizedMatches[normalizedMatches.length - 1].matchPercentage < 0) {
          normalizedMatches[normalizedMatches.length - 1].matchPercentage = 0;
          const remaining =
            100 - normalizedMatches.reduce((currentSum, pet) => currentSum + pet.matchPercentage, 0);
          normalizedMatches[0].matchPercentage += remaining;
        }
      }

      if (normalizedMatches.length > 1 && normalizedMatches[0].matchPercentage < 50) {
        const boost = 50 - normalizedMatches[0].matchPercentage;
        normalizedMatches[0].matchPercentage += boost;

        if (normalizedMatches[1]) {
          normalizedMatches[1].matchPercentage -= Math.ceil(boost * 0.5);
        }
        if (normalizedMatches[2]) {
          normalizedMatches[2].matchPercentage -= Math.ceil(boost * 0.5);
        }

        normalizedMatches = normalizedMatches.map((pet) => ({
          ...pet,
          matchPercentage: pet.matchPercentage < 5 ? 5 : pet.matchPercentage,
        }));

        const newSum = normalizedMatches.reduce(
          (currentSum, pet) => currentSum + pet.matchPercentage,
          0
        );
        if (newSum !== 100) {
          normalizedMatches[0].matchPercentage += 100 - newSum;
        }
      }

      setResult(normalizedMatches);
    } catch (calculationError) {
      console.error("Error calculating results:", calculationError);
      setError("Failed to calculate results. Please try again.");
    }
  };

  const handleLikePet = (petId, petName) => {
    if (likedPets.includes(petId)) {
      setLikedPets(likedPets.filter((id) => id !== petId));
      return;
    }

    setLikedPets([...likedPets, petId]);
    window.alert(`You liked ${petName}!`);
  };

  const handleAdoptClick = (petId) => {
    if (!user) {
      window.alert("Please log in to adopt pets");
      navigate("/login/user");
      return;
    }

    navigate(`/pet/${petId}`);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setAnsweredCurrent(false);
    setLikedPets([]);
  };

  const progressPercentage = ((currentQuestion + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-16 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!result && availablePets.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-16 text-center">
        <div className="text-gray-600 mb-4">
          No pets are available to match right now. Check back soon for new furry friends.
        </div>
        <button
          onClick={() => navigate("/pets")}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Browse Pets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-16">
      {!result ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-center text-orange-500">
              Pet Personality Quiz
            </h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div
                className="h-2.5 rounded-full bg-orange-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-right text-sm text-gray-500 mt-1">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>

          <div className="p-6 rounded-lg bg-orange-50">
            <h3 className="text-xl font-semibold mb-4 text-orange-700">
              {questions[currentQuestion]}
            </h3>
            <div className="space-y-3">
              {options[currentQuestion].map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full p-4 rounded-lg text-left transition-all
                    ${
                      answers[currentQuestion] === option
                        ? "border-2 border-orange-500 bg-orange-100 text-orange-800 font-medium"
                        : "border border-gray-200 bg-white hover:bg-orange-50"
                    }
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={goToPrev}
              disabled={currentQuestion === 0}
              className={`px-6 py-2 rounded-lg transition-colors
                ${
                  currentQuestion === 0
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }
              `}
            >
              Previous
            </button>

            <div className="text-sm text-gray-500 self-center">
              {currentQuestion + 1} of {questions.length}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-8">
          <h2 className="text-3xl font-bold text-orange-500">
            {result[0].matchPercentage >= 50 ? "Your Paw-tners in Crime!" : "Pets You Might Like"}
          </h2>

          {result[0].matchPercentage < 30 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800">
              We couldn&apos;t find strong matches based on your answers.
              Here are some pets you might like:
            </div>
          )}

          <div className="space-y-6">
            {result.map((pet) => (
              <div
                key={pet.id}
                className="p-6 rounded-xl border border-orange-200 bg-white shadow-sm"
              >
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-full md:w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
                    {pet.imageUrl ? (
                      <img
                        src={pet.imageUrl}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-orange-700">
                          {pet.name}
                        </h3>
                        <p className="text-gray-600">
                          {pet.breed} {"\u2022"} {pet.age}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLikePet(pet.id, pet.name)}
                        className="text-2xl focus:outline-none"
                        aria-label="Like this pet"
                      >
                        {likedPets.includes(pet.id) ? (
                          <span className="text-orange-500">{"\u2665"}</span>
                        ) : (
                          <span>{"\uD83E\uDD0D"}</span>
                        )}
                      </button>
                    </div>

                    <div className="my-3">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-orange-500"
                          style={{ width: `${pet.matchPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-sm font-medium mt-1">
                        {pet.matchPercentage}% match
                      </p>
                    </div>

                    {pet.matchedTraits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {pet.matchedTraits.slice(0, 4).map((trait, index) => (
                          <span
                            key={`${pet.id}-${trait}-${index}`}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleAdoptClick(pet.id)}
                      className="px-6 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors font-medium"
                    >
                      Adopt Me
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={restartQuiz}
            className="px-8 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors text-lg font-medium"
          >
            Take Quiz Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PetQuiz;
