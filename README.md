# Pet Adoption Platform

A full-stack pet adoption application with a Django REST API backend and an Expo React Native app. The mobile app opens on a talking AI companion that asks what you want to adopt, then shows matching pets one at a time.

## Project Structure

- Backend: Django REST Framework API
- Mobile: Expo + React Native

## Tech Stack

- Backend: Python, Django, Django REST Framework, JWT authentication
- Mobile: Expo, React Native, Expo Router

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- PostgreSQL (the backend is configured to use PostgreSQL by default)

## Backend Setup

1. Open the backend folder:
   ```bash
   cd Backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv my-env
   my-env\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a PostgreSQL database and update the database settings in `Backend/petproject/settings.py` if needed.

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the Django server:
   ```bash
   python manage.py runserver
   ```

The API will be available at:
- http://127.0.0.1:8000/

## Mobile App Setup

1. Open the mobile app folder:
   ```bash
   cd Mobile/expo-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Expo:
   ```bash
   npm start
   ```

Or run the web preview:

```bash
npm run web
```

## Notes

- The backend uses JWT authentication for protected API routes.
- CORS is enabled for local development.
- If you want to use the app in production, review the Django settings and environment variables before deployment.

## License

This project is for local development and educational purposes.
