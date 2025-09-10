# Watchly

Watchly is a React Native mobile application built with Expo that helps users track and discover TV shows and movies. The app provides a modern, dark-themed interface for managing your watchlist and exploring trending content.

## Tech Stack

### Core Technologies

- **React Native**: The foundation of the mobile application
- **Expo**: Development platform and build system
- **TypeScript**: For type-safe development
- **PNPM**: Package manager

### Key Libraries

#### Expo and Expo Router

The project uses Expo's latest features and Expo Router for file-based routing. The app is configured with a dark theme and optimized for both iOS and Android platforms.

```typescript
// app/_layout.tsx
export default function RootLayoutNav() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ClerkProvider tokenCache={tokenCache} publishableKey={CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <SignedIn>
            <Stack screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#000" },
            }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="show-detail/[id]" />
            </Stack>
          </SignedIn>
          <SignedOut>
            <Stack screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#000" },
              animation: "none",
            }}>
              <Stack.Screen name="sign-in" />
            </Stack>
          </SignedOut>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
```

#### Clerk Authentication

Clerk is used for authentication, providing secure user management with social login options (Google and Apple). The implementation includes:

- Secure token management
- Social authentication
- Protected routes
- User session management

```typescript
// app/sign-in.tsx
export default function Page() {
  const { startSSOFlow } = useSSO();
  const { isSignedIn } = useAuth();

  const handleSSO = useCallback(
    (strategy: "oauth_google" | "oauth_apple") => async () => {
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (err) {
        console.error("SSO Error:", err);
        Alert.alert("Sign In Error", "There was a problem signing in. Please try again.");
      }
    },
    [startSSOFlow],
  );
}
```

#### TanStack React Query

React Query is used for efficient data fetching, caching, and state management. The implementation includes:

- Automatic background refetching
- Cache invalidation
- Optimistic updates
- Error handling

```typescript
// Example of React Query implementation
const { data: myShows, isLoading } = useQuery({
  queryKey: ["my-shows"],
  queryFn: async () => {
    const token = await getToken();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/tv/saved`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data.tvShows.map((t) => t.overview);
  },
  retry: 2,
  enabled: isAuthReady && isSignedIn,
});
```

## Project Structure

```
watchly-rn/
├── app/                    # Main application code
│   ├── _layout.tsx        # Root layout with providers
│   ├── (tabs)/            # Tab-based navigation
│   ├── sign-in.tsx        # Authentication screen
│   └── show-detail/       # Show details screen
├── components/            # Reusable components
├── types/                # TypeScript type definitions
├── assets/              # Static assets
└── config/              # Configuration files
```

## Features

- User authentication with social login
- Browse trending TV shows and movies
- Search functionality with fuzzy matching
- Save shows to watchlist
- Mark shows as watched
- Dark theme UI
- Responsive design
- Offline support with React Query caching

## Development

### Prerequisites

- Node.js
- PNPM
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file with required environment variables:
   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   EXPO_PUBLIC_BACKEND_BASE_URL=your_backend_url
   ```
4. Start the development server:
   ```bash
   pnpm start
   ```

### Available Scripts

- `pnpm start`: Start the Expo development server
- `pnpm android`: Start the app on Android
- `pnpm ios`: Start the app on iOS
- `pnpm lint`: Run ESLint
- `pnpm format`: Format code with Prettier
- `pnpm build`: Build for production
- `pnpm build:preview`: Build preview version

## Building for Production

The app uses EAS Build for production builds:

```bash
# For iOS production build
pnpm build

# For iOS preview build
pnpm build:preview
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary. 