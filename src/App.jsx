import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/pages/AuthContext";
import { PetPouchProvider } from "./components/pages/PetPouchContext";
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Signup from "./components/pages/Signup";
import RehomerDashboard from "./components/pages/RehomerDashboard";
import AddPetForm from "./components/pages/AddPetForm";
import PetsList from "./components/pages/PetList";
import PetDetail from "./components/pages/PetDetail";
import PetQuiz from "./components/pages/PetQuiz";
import Navbar from "./components/Navbar";
import PetPouch from "./components/pages/PetPouch";
import Blog from "./components/pages/Blog";
import Footer from "./components/Footer";
import ContactUs from "./components/pages/ContactUs";
import MyListings from "./components/pages/MyListing";

// ProtectedRoute component remains outside App
const ProtectedRoute = ({ children, isRehomer = false }) => {
  const { user, userData } = useAuth();

  if (!user) {
    return <Navigate to={`/login/${isRehomer ? 'rehomer' : 'user'}`} replace />;
  }

  if (isRehomer && !userData?.isRehomer) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppWrapper() {
  // Get user from AuthContext
  const { user } = useAuth();

  return (
    <PetPouchProvider user={user}>
      <Router>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login/:type" element={<Login />} />
          <Route path="/signup/:type" element={<Signup />} />
          <Route path="/pets" element={<PetsList />} />
          <Route path="/pet/:id" element={<PetDetail />} />
          <Route path="/quiz" element={<PetQuiz />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/my-listing" element={<MyListings />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/pet-pouch" element={<PetPouch />} />

          {/* Protected rehomer routes */}
          <Route path="/rehomer-dashboard" element={
            <ProtectedRoute isRehomer={true}>
              <RehomerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/add-pet" element={
            <ProtectedRoute isRehomer={true}>
              <AddPetForm />
            </ProtectedRoute>
          } />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </Router>
    </PetPouchProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}

export default App;
