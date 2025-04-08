import React from "react";
import { Routes, Route } from "react-router-dom"; 
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import Login from "./components/Login";
import Signup from "./Signup";  
import "./index.css";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/signup" element={<Signup />} />


      </Routes>
    </>
  );
}

export default App;
