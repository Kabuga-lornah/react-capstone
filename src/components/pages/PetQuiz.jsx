import React, { useState, useEffect } from "react";
import { db } from "../pages/firebaseconfig";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../pages/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const [error, setError] = useState(null);

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
    "How do you make decisions?"
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
    ["Quickly based on instinct", "After careful research", "With input from others", "I struggle with decisions"]
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
    "I struggle with decisions": ["Gentle", "Cautious", "Indecisive"]
  };

  useEffect(() => {
    const fetchAvailablePets = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "pets"), where("adopted", "==", false));
        const querySnapshot = await getDocs(q);
        const petsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          personality: doc.data().personality || []
        }));

        // Add hardcoded pets from PetList.jsx with aligned personality traits
        const hardcodedPets = [
          {
            id: "dog1",
              name: "Buddy",
              breed: "Labrador",
              age: "2 years",
              personality: ["Friendly", "Playful"],
              imageUrl: "/Labrador.jpeg",
              type: "dog",
            },
            {
              id: "dog2",
              name: "Max",
              breed: "Beagle",
              age: "3 years",
              personality: ["Energetic", "Loyal"],
              imageUrl: "/beagle.jpg",
              type: "dog",
            },
            {
              id: "dog3",
              name: "Charlie",
              breed: "Golden Retriever",
              age: "4 years",
              personality: ["Affectionate", "Friendly"],
              imageUrl: "/golden retriver.jpg",
              type: "dog",
            },
            {
              id: "dog4",
              name: "Daisy",
              breed: "Poodle",
              age: "1 year",
              personality: ["Intelligent", "Shy"],
              imageUrl: "/poodle.jpeg",
              type: "dog",
            },
            {
              id: "dog5",
              name: "Bella",
              breed: "Bulldog",
              age: "2.5 years",
              personality: ["Calm", "Loyal"],
              imageUrl: "/bulldog.jpeg",
              type: "dog",
            },
            {
              id: "dog6",
              name: "Rocky",
              breed: "Rottweiler",
              age: "3.5 years",
              personality: ["Independent", "Friendly"],
              imageUrl: "/Rottweiler.jpeg",
              type: "dog",
            },
            {
              id: "dog7",
              name: "Lucy",
              breed: "Shih Tzu",
              age: "2 years",
              personality: ["Playful", "Shy"],
              imageUrl: "/shih tzu.jpeg",
              type: "dog",
            },
            {
              id: "dog8",
              name: "zeus",
              breed: "German Shepherd",
              age: "4 years",
              personality: ["Loyal", "Intelligent"],
              imageUrl: "/zeus.jpeg",
              type: "dog",
            },
            {
              id: "dog9",
              name: "Ruby",
              breed: "Boxer",
              age: "1.5 years",
              personality: ["Energetic", "Affectionate"],
              imageUrl: "/beagle.jpeg",
              type: "dog",
            },
            {
              id: "dog10",
              name: "Bailey",
              breed: "Chihuahua",
              age: "3 years",
              personality: ["Friendly", "Calm"],
              imageUrl: "/chihuahua.jpeg",
              type: "dog",
            },
            {
              id: "dog11",
              name: "Coco",
              breed: "Golden Retriver",
              age: "1 year",
              personality: ["Independent", "Playful"],
              imageUrl: "/3 yrs golden retriver.jpeg",
              type: "dog",
            },
            {
              id: "dog12",
              name: "Toby",
              breed: "Doberman",
              age: "2.5 years",
              personality: ["Energetic", "Loyal"],
              imageUrl: "/Dobermann.jpeg",
              type: "dog",
            },
  
            // Cats (8)
            {
              id: "cat1",
              name: "Whiskers",
              breed: "Persian",
              age: "3 years",
              personality: ["Calm", "Independent"],
              imageUrl: "/persian.jpeg",
              type: "cat",
            },
            {
              id: "cat2",
              name: "Luna",
              breed: "Siamese",
              age: "2 years",
              personality: ["Affectionate", "Intelligent"],
              imageUrl: "/siames 2.jpeg",
              type: "cat",
            },
            {
              id: "cat3",
              name: "Mittens",
              breed: "Maine Coon",
              age: "4 years",
              personality: ["Loyal", "Shy"],
              imageUrl: "/cat3.jpg",
              type: "cat",
            },
            {
              id: "cat4",
              name: "Shadow",
              breed: "Bengal",
              age: "1.5 years",
              personality: ["Playful", "Energetic"],
              imageUrl: "/bengal.jpeg",
              type: "cat",
            },
            {
              id: "cat5",
              name: "Simba",
              breed: "Abyssinian",
              age: "3 years",
              personality: ["Intelligent", "Friendly"],
              imageUrl: "/Abyssinian.jpeg",
              type: "cat",
            },
            {
              id: "cat6",
              name: "Zoe",
              breed: "Russian Blue",
              age: "2 years",
              personality: ["Shy", "Calm"],
              imageUrl: "/russian blue.jpeg",
              type: "cat",
            },
            {
              id: "cat7",
              name: "Nala",
              breed: "British Shorthair",
              age: "2.8 years",
              personality: ["Loyal", "Independent"],
              imageUrl: "/british shorthair.jpeg",
              type: "cat",
            },
            {
              id: "cat8",
              name: "Tiger",
              breed: "Tabby",
              age: "3.5 years",
              personality: ["Playful", "Affectionate"],
              imageUrl: "/cat8.jpg",
              type: "cat",
            },
  
            // Snakes (2)
            {
              id: "snake1",
              name: "Slither",
              breed: "Corn Snake",
              age: "2 years",
              personality: ["Calm", "Shy"],
              imageUrl: "/snake.jpg",
              type: "snake",
            },
            {
              id: "snake2",
              name: "Fang",
              breed: "Ball Python",
              age: "3 years",
              personality: ["Independent", "Calm"],
              imageUrl: "/snake2.jpg",
              type: "snake",
            },
  
            // Bunnies (5)
            {
              id: "bunny1",
              name: "Thumper",
              breed: "Mini Lop",
              age: "1 year",
              personality: ["Friendly", "Playful"],
              imageUrl: "/.jpg",
              type: "bunny",
            },
            {
              id: "bunny2",
              name: "Snowball",
              breed: "Angora",
              age: "1.5 years",
              personality: ["Shy", "Affectionate"],
              imageUrl: "/bunny2.jpg",
              type: "bunny",
            },
            {
              id: "bunny3",
              name: "Fluffy",
              breed: "Lionhead",
              age: "2 years",
              personality: ["Energetic", "Playful"],
              imageUrl: "/bunny3.jpg",
              type: "bunny",
            },
            {
              id: "bunny4",
              name: "Clover",
              breed: "Dutch",
              age: "2.2 years",
              personality: ["Independent", "Calm"],
              imageUrl: "/bunny4.jpg",
              type: "bunny",
            },
            {
              id: "bunny5",
              name: "Binky",
              breed: "Rex",
              age: "1.8 years",
              personality: ["Loyal", "Friendly"],
              imageUrl: "/bunny5.jpg",
              type: "bunny",
            },
  
            // Ducks (3)
            {
              id: "duck1",
              name: "Quackers",
              breed: "Parrot",
              age: "4 years",
              personality: ["Talkative and bright"],
              imageUrl: "/duck.jpeg",
              type: "duck",
            },
            {
              id: "duck2",
              name: "Feathers",
              breed: "Mallard",
              age: "2 years",
              personality: ["Friendly", "Playful"],
              imageUrl: "/duck2.jpg",
              type: "duck",
            },
            {
              id: "duck3",
              name: "Daffy",
              breed: "Pekin",
              age: "3 years",
              personality: ["Calm", "Affectionate"],
              imageUrl: "/duck3.jpg",
              type: "duck",
            },
  
            // Chicks (2)
            {
              id: "chick1",
              name: "Sunny",
              breed: "Silkie",
              age: "0.5 years",
              personality: ["Energetic", "Friendly"],
              imageUrl: "/chick1.jpg",
              type: "chick",
            },
            {
              id: "chick2",
              name: "Peep",
              breed: "Bantam",
              age: "0.4 years",
              personality: ["Shy", "Playful"],
              imageUrl: "/chick2.jpg",
              type: "chick",
            }
        ];

        setAvailablePets([...petsData, ...hardcodedPets]);
      } catch (err) {
        setError("Failed to load pets. Please try again later.");
        console.error("Error fetching pets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailablePets();
  }, []);

  useEffect(() => {
    if (answeredCurrent && currentQuestion < questions.length - 1) {
      const timer = setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setAnsweredCurrent(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [answeredCurrent, currentQuestion]);

  useEffect(() => {
    if (answeredCurrent && currentQuestion === questions.length - 1) {
      calculateResult();
    }
  }, [answeredCurrent, currentQuestion]);

  const handleAnswer = (option) => {
    setAnswers({
      ...answers,
      [currentQuestion]: option
    });
    setAnsweredCurrent(true);
  };

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResult = async () => {
    try {
      const allAnswers = Object.values(answers);
      const traits = allAnswers.flatMap(answer => personalityMatches[answer] || []);

      const traitCounts = traits.reduce((acc, trait) => {
        acc[trait] = (acc[trait] || 0) + 1;
        return acc;
      }, {});

      // Get top traits (minimum 3, maximum 5)
      let topTraits = Object.entries(traitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(item => item[0]);

      // Ensure we have at least 3 traits
      while (topTraits.length < 3) {
        const remainingTraits = personalityMatches[options[currentQuestion][0]].filter(t => !topTraits.includes(t));
        topTraits.push(...remainingTraits.slice(0, 3 - topTraits.length));
      }

      // More flexible matching
      const petsWithScores = availablePets.map(pet => {
        let score = 0;
        let matchedTraits = [];
        
        pet.personality.forEach(trait => {
          if (topTraits.includes(trait)) {
            score += (traitCounts[trait] || 1) * 2;
            matchedTraits.push(trait);
          }
        });

        // Bonus for multiple matches
        if (matchedTraits.length > 1) {
          score += matchedTraits.length * 5;
        }

        const percentage = Math.min(Math.round((score / (traits.length * 3)) * 100), 100);
        
        return { 
          ...pet, 
          matchPercentage: percentage > 25 ? percentage : 25 + Math.floor(Math.random() * 25),
          matchedTraits 
        };
      });

      // Get top 3 matches with at least one matching trait
      let topMatches = petsWithScores
        .filter(pet => pet.matchedTraits.length > 0)
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .slice(0, 3);

      // Fallback to random pets if no matches
      if (topMatches.length === 0) {
        const shuffled = [...availablePets].sort(() => 0.5 - Math.random());
        topMatches = shuffled.slice(0, 3).map(pet => ({
          ...pet,
          matchPercentage: 25 + Math.floor(Math.random() * 25),
          matchedTraits: pet.personality.slice(0, 2)
        }));
      }

      setResult(topMatches);

      if (user) {
        await addDoc(collection(db, "quizResults"), {
          userId: user.uid,
          answers: allAnswers,
          matchedPets: topMatches.map(pet => ({
            petId: pet.id,
            matchPercentage: pet.matchPercentage,
            matchedTraits: pet.matchedTraits
          })),
          createdAt: new Date()
        });
      }

      // Navigate to filtered pets list after showing results
      setTimeout(() => {
        const traitsToFilter = topTraits.slice(0, 3);
        navigate(`/pets?traits=${traitsToFilter.join(',')}&fromQuiz=true`);
      }, 5000000);

    } catch (error) {
      console.error("Error calculating results:", error);
      setError("Failed to calculate results. Please try again.");
    }
  };

  const handleLikePet = (petId, petName) => {
    if (likedPets.includes(petId)) {
      setLikedPets(likedPets.filter(id => id !== petId));
    } else {
      setLikedPets([...likedPets, petId]);
      alert(`You liked ${petName}!`);
    }
  };

  const handleAdoptClick = async (petId) => {
    try {
      if (!user) {
        alert("Please log in to adopt pets");
        navigate('/login');
        return;
      }

      const petToAdopt = availablePets.find(pet => pet.id === petId);
      if (!petToAdopt) {
        alert("Pet not found");
        return;
      }

      // Add to PetPouch collection
      await addDoc(collection(db, "petPouch"), {
        userId: user.uid,
        petId: petToAdopt.id,
        name: petToAdopt.name,
        breed: petToAdopt.breed,
        age: petToAdopt.age,
        imageUrl: petToAdopt.imageUrl,
        personality: petToAdopt.personality,
        type: petToAdopt.type,
        adoptedAt: new Date()
      });

      // Mark as adopted in main pets collection if it's not a hardcoded pet
      if (!petToAdopt.id.startsWith('dog') && !petToAdopt.id.startsWith('cat')) {
        await updateDoc(doc(db, "pets", petToAdopt.id), {
          adopted: true
        });
      }

      alert(`${petToAdopt.name} has been added to your Pet Pouch!`);
      navigate('/pet-pouch'); // Redirect to PetPouch page

    } catch (error) {
      console.error("Error adopting pet:", error);
      alert("Failed to adopt pet. Please try again.");
    }
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
                    ${answers[currentQuestion] === option 
                      ? 'border-2 border-orange-500 bg-orange-100 text-orange-800 font-medium' 
                      : 'border border-gray-200 bg-white hover:bg-orange-50'}
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
                ${currentQuestion === 0 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
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
            {result[0].matchPercentage >= 50 ? "Your Perfect Matches!" : "Pets You Might Like"}
          </h2>
          
          {result[0].matchPercentage < 30 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800">
              We couldn't find strong matches based on your answers. 
              Here are some pets you might like:
            </div>
          )}

          <p className="text-gray-600">
            We'll redirect you to matching pets in a moment...
          </p>
          
          <div className="space-y-6">
            {result.map((pet, index) => (
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
                        <p className="text-gray-600">{pet.breed} • {pet.age}</p>
                      </div>
                      <button
                        onClick={() => handleLikePet(pet.id, pet.name)}
                        className="text-2xl focus:outline-none"
                        aria-label="Like this pet"
                      >
                        {likedPets.includes(pet.id) ? (
                          <span className="text-orange-500">❤️</span>
                        ) : (
                          <span>🤍</span>
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
                        {pet.matchedTraits.slice(0, 4).map((trait, i) => (
                          <span 
                            key={i}
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