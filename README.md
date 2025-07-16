# My FurryFriends: Pet Adoption Platform 🐾

Welcome to **My FurryFriends**, a React-based web application designed to connect lovable pets with their forever homes. This platform facilitates pet adoption by allowing rehomers to list available pets and users to browse, express interest, and adopt furry (and scaly\!) companions.

## ✨ Features

  * **User Authentication**: Secure sign-up and login for both regular users and rehomers using **Firebase Authentication**.
  * **Pet Listings**: Browse a diverse list of available pets (dogs, cats, bunnies, snakes, ducks, chicks) with detailed profiles.
  * **Personality Quiz**: A fun quiz to help users find their ideal pet match based on their personality traits.
  * **Pet Pouch**: Users can add pets to a "pouch" to manage their adoption interests.
  * **Adoption Requests**: Users can submit adoption requests for pets, including scheduling home visits.
  * **Rehomer Dashboard**: Dedicated dashboard for rehomers to manage their pet listings, view, and approve adoption requests.
  * **SMS Notifications**: Rehomers receive SMS notifications for new adoption requests (powered by **Twilio** and Firebase Cloud Functions).
  * **Image Uploads**: Rehomers can upload pet images, which are handled via **Cloudinary** for efficient storage and delivery.
  * **Real-time Updates**: Utilizes **Firebase Firestore** for real-time database functionality, ensuring up-to-date pet and request information.
  * **Responsive Design**: Built with **Tailwind CSS** for a modern and mobile-friendly user experience.
  * **Blog**: A section featuring heartwarming pet adoption stories to inspire users.
  * **Contact Us**: A dedicated page for users to get in touch with the platform administrators.
  * **My Listings**: Users can view notifications and their submitted adoption requests.

-----

## 🚀 Technologies Used

  * **Frontend**:

      * **React** (v19) - A JavaScript library for building user interfaces.
      * **Vite** (v6) - A fast build tool for modern web projects.
      * **React Router DOM** (v7) - For declarative routing in React applications.
      * **Tailwind CSS** - A utility-first CSS framework for rapid UI development.
      * **MUI (Material UI)** - React components for faster and easier web development.
      * **React Calendar** - For date selection in adoption forms.
      * **React Firebase Hooks** - Simplifies Firebase integration with React.

  * **Backend/Cloud Services**:

      * **Firebase** - Backend as a Service (BaaS) for authentication, database (Firestore), and storage.
      * **Firebase Cloud Functions** - Serverless functions for handling backend logic (e.g., sending SMS).
      * **Twilio** - SMS API for sending notifications.
      * **Cloudinary** - Cloud-based image and video management.

  * **Development Tools**:

      * `ESLint` - For code linting and maintaining code quality.
      * `Autoprefixer`, `PostCSS` - For processing CSS.

-----

## 📦 Project Structure

```
.
├── public/                       # Static assets (images, favicon)
├── functions/                    # Firebase Cloud Functions code
│   ├── .gitignore
│   ├── index.js                  # Twilio SMS function
│   ├── package.json
│   └── package-lock.json
├── src/
│   ├── App.css
│   ├── App.jsx                   # Main application component, routes setup
│   ├── index.css
│   ├── main.jsx                  # React entry point
│   ├── Signup.jsx                # Old signup component (might be deprecated)
│   └── components/
│       ├── Footer.jsx            # Footer component
│       ├── Navbar.jsx            # Navigation bar component
│       └── pages/
│           ├── AddPetForm.jsx    # Form for rehomers to add new pets
│           ├── AuthContext.jsx   # React Context for Firebase Authentication
│           ├── Blog.jsx          # Blog section with adoption stories
│           ├── ContactUs.jsx     # Contact form page
│           ├── firebaseconfig.js # Firebase initialization and exports
│           ├── Home.jsx          # Home page with featured pets and quiz link
│           ├── Login.jsx         # Login page for users and rehomers
│           ├── MyListing.jsx     # User's listings (notifications/requests)
│           ├── PetDetail.jsx     # Individual pet detail page
│           ├── PetList.jsx       # List of all available pets with filters
│           ├── PetPouch.jsx      # User's saved pets (for adoption)
│           ├── PetPouchContext.jsx # React Context for pet pouch count
│           └── PetQuiz.jsx       # Personality quiz for pet matching
├── .gitignore
├── .eslintrc.js                  # ESLint configuration
├── firebase.json                 # Firebase project configuration
├── index.html                    # Main HTML file
├── package.json                  # Project dependencies and scripts
├── package-lock.json
├── postcss.config.js             # PostCSS configuration
├── README.md                     # This file
├── tailwind.config.js            # Tailwind CSS configuration
└── vite.config.js                # Vite build tool configuration
```

-----

## 🛠️ Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd react-capstone
    ```

2.  **Install dependencies for the main React app:**

    ```bash
    npm install
    ```

3.  **Install dependencies for Firebase Functions:**

    ```bash
    cd functions
    npm install
    cd ..
    ```

4.  **Firebase Project Setup:**

      * Create a Firebase project on the [Firebase Console](https://console.firebase.google.com/).
      * Enable **Authentication** (Email/Password provider).
      * Enable **Firestore Database**.
      * Enable **Cloud Storage**.
      * Enable **Cloud Functions**.
      * **Firebase Config**: Update `src/components/pages/firebaseconfig.js` with your Firebase project's configuration (apiKey, authDomain, projectId, etc.).
      * **Twilio Integration**:
          * Sign up for a [Twilio account](https://www.twilio.com/).
          * Get your Account SID and Auth Token.
          * Set these as environment variables for your Firebase Functions using the Firebase CLI:
            ```bash
            firebase functions:config:set twilio.accountsid="YOUR_TWILIO_ACCOUNT_SID" twilio.authtoken="YOUR_TWILIO_AUTH_TOKEN"
            ```
          * Ensure you have a Twilio phone number and update `index.js` in the `functions` directory with it: `from: '+18666394834'` (replace with your Twilio number).
      * **Cloudinary Integration**:
          * Sign up for a [Cloudinary account](https://cloudinary.com/).
          * Note your Cloud Name.
          * In `src/components/pages/AddPetForm.jsx`, ensure the `upload_preset` and `cloud_name` are correctly configured for your Cloudinary setup.

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server, usually at `http://localhost:5173`.

-----

## 📖 Usage

### For Adopters (Regular Users):

1.  **Sign Up/Login**: Create a new account or log in as a regular user.
2.  **Browse Pets**: Navigate to the "Browse Pets" section to see all available animals. You can filter by personality traits and search by name.
3.  **Take the Quiz**: Use the "Quiz" feature to find pets that match your personality.
4.  **Pet Pouch**: Add pets you're interested in to your "Pet Pouch" and then submit adoption requests.
5.  **My Listings**: Check your notifications for adoption updates and view the status of your submitted adoption requests.

### For Rehomers:

1.  **Sign Up/Login**: Register or log in as a rehomer.
2.  **Rehomer Dashboard**: Access your dashboard to manage your pet listings and view incoming adoption requests.
3.  **Add New Pet**: Use the "Add New Pet" form to create detailed profiles for animals available for adoption, including images and personality traits.
4.  **Manage Requests**: Approve adoption requests and handle notifications.
