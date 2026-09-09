# EarnByApps

A clean, minimalist React Native application featuring a streamlined **Continue with Google** authentication flow.

---

## 📱 Features

- **Continue with Google**: Official Google-styled sign-in button with vector branding, active touch feedback, and responsive loading indicators.
- **Expo AuthSession**: Google OAuth 2.0 flow using `expo-auth-session/providers/google`.
- **Session Persistence**: Stored securely via `@react-native-async-storage/async-storage`.
- **User Profile Display**: Shows name, email, avatar, and sign-out functionality upon successful authentication.
- **Demo Mode**: Instant preview & testable sign-in flow right out of the box before configuring Google Cloud credentials.

---

## 🚀 Getting Started

### 1. Start the Development Server

```bash
npm start
```

Or run directly on your target platform:
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

---

## 🔑 Setting Up Google OAuth (Optional)

To connect your own Google Cloud Console credentials:

1. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Open [Google Cloud Console](https://console.cloud.google.com/).
3. Create an **OAuth 2.0 Client ID**:
   - **Web Application** (for Expo Go & Web testing)
   - **Android** / **iOS** (for standalone builds)
4. Add your Client IDs to `.env`:
   ```env
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="your-ios-client-id.apps.googleusercontent.com"
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
   ```
5. Restart the Expo server (`npx expo start -c`) to load the environment variables.

---

## 📂 Project Structure

```
.
├── App.tsx                     # Root app entry point
├── app.json                    # Expo app configuration
├── package.json
├── src
│   ├── components
│   │   ├── GoogleIcon.tsx         # Official Google vector logo
│   │   ├── GoogleSignInButton.tsx # "Continue with Google" button
│   │   └── UserProfileCard.tsx    # User avatar, details & sign-out card
│   ├── config
│   │   └── authConfig.ts          # Google OAuth Client IDs & scopes
│   ├── screens
│   │   └── AuthScreen.tsx         # Main auth screen
│   ├── services
│   │   └── authService.ts         # Session storage & Google API integration
│   └── types
│       └── auth.ts                # TypeScript interfaces
└── .env.example
```
