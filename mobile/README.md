# Echo Mobile

Mobile app for Echo Music Server built with React Native and Expo.

## Prerequisites

- Node.js >= 20
- Yarn or npm
- Expo Go app (for development)
- EAS CLI (for builds)

## Getting Started

```bash
# Install dependencies
yarn install

# Start development server
yarn start

# Or with tunnel (for physical devices)
yarn start:tunnel
```

## Building

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --profile development --platform android

# Build for iOS
eas build --profile development --platform ios
```

## Project Structure

```
├── app/                 # Expo Router screens
│   ├── (tabs)/          # Tab navigation screens
│   ├── _layout.tsx      # Root layout
│   ├── login.tsx        # Login screen
│   └── player.tsx       # Player modal
├── src/
│   ├── assets/          # Images and icons
│   ├── services/        # API services
│   ├── stores/          # Zustand stores
│   └── types/           # TypeScript types
└── app.json             # Expo configuration
```

## API Configuration

Update the API URL in `src/services/api.ts` to point to your Echo server.
