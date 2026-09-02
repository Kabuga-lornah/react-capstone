# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Setting up "Continue with Google"

The web client ID already in `.env` only works for the web build. On a real
phone, Google refuses to redirect back into the app for a "Web" client type,
so you need a separate **Android** and **iOS** OAuth client tied to this
app's package name (`com.myfurryfriends.app`, set in `app.json`). You also
can't test this in the plain Expo Go app — Expo Go's own package name isn't
yours, so Google will reject it. Use an EAS **development build** instead
(same live-reload workflow as Expo Go, just your own installed app).

1. **Build a development client** (one-time per device, only needs redoing
   if you change native config like `app.json`'s `android.package`):
   ```bash
   cd Mobile/expo-app
   eas build --profile development --platform android   # or --platform ios
   ```
   Install the resulting build on your phone, then run `npx expo start` and
   open the app from there instead of Expo Go.

2. **Get your Android signing certificate's SHA-1** (EAS manages this for
   you since it holds the keystore):
   ```bash
   eas credentials -p android
   ```
   Choose "Keystore" → "View keystore" and copy the SHA-1 fingerprint shown.

3. **In Google Cloud Console** (the same project the existing web client
   lives in) → APIs & Services → Credentials → Create Credentials → OAuth
   client ID:
   - **Android**: package name `com.myfurryfriends.app`, paste the SHA-1
     from step 2.
   - **iOS**: bundle ID `com.myfurryfriends.app`. No SHA needed.

4. **Add the new client IDs**:
   - In `Mobile/expo-app/.env`, fill in `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
     and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` with the values from step 3.
   - On the Django backend (wherever it runs), set the matching
     `GOOGLE_ANDROID_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID` environment
     variables to the same values — `GoogleAuthView` checks the token's
     audience against these, so sign-in will fail with "issued for a
     different app" until they're set there too.

5. Restart `expo start` (env vars are read at bundle time) and try
   "Continue with Google" again from the development build.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
