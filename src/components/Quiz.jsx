import React, { useState } from 'react';

const Quiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const questions = [
    {
        question: "How do you usually spend your free time?",
        options: [
          "Outdoors, exploring the world and going on adventures!",
          "Chilling at home, reading or watching something cozy.",
          "Hanging out with friends, socializing and having fun.",
          "Relaxing with some peace and quiet, maybe with a good hobby."
        ]
      },
      {
        question: "How do you feel about emotional support?",
        options: [
          "I definitely need emotional support sometimes, and I’m open to it.",
          "I manage okay on my own, but it’s nice to have support now and then.",
          "I’m emotionally independent, but I appreciate comfort from time to time.",
          "I rarely need emotional support, I like to handle things on my own."
        ]
      },
      {
        question: "What’s your perfect weekend plan?",
        options: [
          "Adventuring into the wild, hiking, or going to a new place!",
          "Cozying up with a good book, or binge-watching my favorite shows.",
          "Going out with friends to events or trying something new and fun.",
          "Enjoying a quiet weekend with some hobbies and relaxation."
        ]
      },
      {
        question: "How do you handle stress?",
        options: [
          "I talk it out with others and seek support from those around me.",
          "I need some alone time to recharge and clear my mind.",
          "I try to keep busy and focus on something distracting.",
          "I seek comfort in my routines or favorite activities."
        ]
      },
      {
        question: "Which of these sounds more like you?",
        options: [
          "I’m always on the move, love being active and spontaneous!",
          "I like having a balanced life, mixing work and relaxation.",
          "I’m more of a laid-back person, who enjoys calm days.",
          "I enjoy being social, but I also cherish my quiet time."
        ]
      },
      {
        question: "How do you feel about pets?",
        options: [
          "I love having an active pet, like a dog, to keep me company!",
          "I like independent pets, maybe a cat that’s relaxed but affectionate.",
          "I’d prefer a small, easy-going pet that doesn’t need too much attention.",
          "I want something unique and exotic, a pet that stands out!"
        ]
      },
      {
        question: "What’s your ideal pet's personality?",
        options: [
          "Active, loyal, and always ready for adventure.",
          "Independent, low-maintenance, and content with their own space.",
          "Gentle, comforting, and always there when you need them.",
          "Unique, fascinating, and something out of the ordinary."
        ]
      },
      {
        question: "How do you feel about long-term commitments?",
        options: [
          "I’m all in, I love making big plans and sticking to them.",
          "I’m open to commitment, but I like having some flexibility.",
          "I’m not really into long-term commitments, I prefer freedom.",
          "I enjoy having stable routines, but with room for change."
        ]
      },
      {
        question: "Which environment do you feel most comfortable in?",
        options: [
          "An exciting, ever-changing environment with lots of new things to explore.",
          "A calm, peaceful environment where I can relax and recharge.",
          "A lively social atmosphere with lots of people and events.",
          "A serene, quiet place where I can enjoy some solitude."
        ]
      },
      {
        question: "What kind of relationship do you want with your pet?",
        options: [
          "An active, outdoorsy relationship where we do everything together!",
          "A peaceful, low-maintenance bond where we enjoy each other's company.",
          "A fun, playful relationship where we can be best friends.",
          "A unique bond with a pet that has its own quirks and personality."
        ]
      }
    ];

  const handleAnswer = (answer, index) => {
    setAnswers([...answers, answer]);
    setSelectedOption(index);
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null); 
      }, 500);
    } else {
      setShowResults(true);
    }
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestion(currentQuestion - 1);
    setSelectedOption(null);
  };

  const goToNextQuestion = () => {
    setCurrentQuestion(currentQuestion + 1);
    setSelectedOption(null);
  };

  const getPetResult = () => {
    const answerCount = {
      dog: 0,
      cat: 0,
      bunny: 0,
      exotic: 0,
    };

    answers.forEach(answer => {
      if (answer.includes('adventure') || answer.includes('active')) {
        answerCount.dog++;
      } else if (answer.includes('independent') || answer.includes('low-maintenance')) {
        answerCount.cat++;
      } else if (answer.includes('comforting') || answer.includes('gentle')) {
        answerCount.bunny++;
      } else {
        answerCount.exotic++;
      }
    });

    const max = Math.max(...Object.values(answerCount));
    const result = Object.keys(answerCount).find(key => answerCount[key] === max);

    switch (result) {
      case "dog":
        return "A loyal dog that loves adventures!";
      case "cat":
        return "A calm and independent cat!";
      case "bunny":
        return "A soft, comforting bunny!";
      case "exotic":
        return "A unique and fascinating exotic pet!";
      default:
        return "A furry friend that's just right for you!";
    }
  };

  const getMatchPercentage = () => {
    const answerCount = {
      dog: 0,
      cat: 0,
      bunny: 0,
      exotic: 0,
    };

    answers.forEach(answer => {
      if (answer.includes('adventure') || answer.includes('active')) {
        answerCount.dog++;
      } else if (answer.includes('independent') || answer.includes('low-maintenance')) {
        answerCount.cat++;
      } else if (answer.includes('comforting') || answer.includes('gentle')) {
        answerCount.bunny++;
      } else {
        answerCount.exotic++;
      }
    });

    const max = Math.max(...Object.values(answerCount));
    const maxCount = answerCount[max === 0 ? "dog" : Object.keys(answerCount).find(key => answerCount[key] === max)];

    const percentage = (maxCount / answers.length) * 100;
    return `${percentage.toFixed(0)}%`;
  };

  return (
    <div style={styles.quizContainer}>
      <h1 style={styles.title}>Discover your pet partner in crime!</h1>
      {!showResults ? (
        <div style={styles.quizContent}>
          <h3 style={styles.questionText}>{questions[currentQuestion].question}</h3>
          <div style={styles.optionsContainer}>
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option, index)}
                style={{
                  ...styles.optionButton,
                  backgroundColor: selectedOption === index ? '#FFA500' : '#fff',
                  color: selectedOption === index ? '#fff' : '#000',
                }}
              >
                <span style={styles.circle}></span>
                {option}
              </button>
            ))}
          </div>

          <div style={styles.navigationButtons}>
            <button 
              onClick={goToPreviousQuestion} 
              disabled={currentQuestion === 0}
              style={styles.navButton}
            >
              Previous
            </button>
            <button 
              onClick={goToNextQuestion} 
              disabled={currentQuestion === questions.length - 1}
              style={styles.navButton}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.resultContainer}>
          <h3 style={styles.resultText}>Your Ideal Pet is:</h3>
          <p>{getPetResult()}</p>
          <p>You have a {getMatchPercentage()} match with this animal!</p>
          <button style={styles.restartButton} onClick={() => window.location.reload()}>
            Take the Quiz Again!
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  quizContainer: {
    padding: '70px',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '2.5rem',
    color: '#FFA500',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '20px',
  },
  quizContent: {
    marginBottom: '20px',
  },
  questionText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  optionsContainer: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#fff',
    color: '#000',
    padding: '15px',
    border: '2px solid #ddd',
    borderRadius: '30px',
    cursor: 'pointer',
    margin: '10px 0',
    width: '100%',
    textAlign: 'left',
    fontSize: '16px',
    transition: 'background-color 0.3s, color 0.3s',
    display: 'flex',
    alignItems: 'center',
  },
  circle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFA500',
    marginRight: '10px',
  },
  resultContainer: {
    marginTop: '30px',
  },
  resultText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  restartButton: {
    backgroundColor: '#FFA500',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
    transition: 'background-color 0.3s',
  },
  navigationButtons: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: '10px 20px',
    backgroundColor: '#FFA500',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
    width: '48%',
  },
};

export default Quiz;
