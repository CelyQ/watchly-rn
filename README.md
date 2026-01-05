# Watchly

A React Native mobile application built with Expo.

## Running the Project

### Prerequisites

- Node.js installed
- Bun package manager
- For iOS: Xcode and iOS Simulator
- For Android: Android Studio and Android emulator or physical device

### Installation

1. Install dependencies:

   ```bash
   bun install
   ```

2. Set up environment variables:

   Create a `.env` file in the root directory and add the required environment variables. You can check the required variables in `.env.example` file.

3. Start the development server:

   ```bash
   bun run ios    # For iOS
   bun run android    # For Android
   ```

The Expo development server will start and launch the app on your simulator/emulator or connected device.

## Development Tools

### Biome

This project uses [Biome](https://biomejs.dev/) for code formatting and linting. Biome is a fast, all-in-one tool that replaces ESLint and Prettier.

- **Format code**: Run `bun run format` to automatically format all files according to the Biome configuration
- **Configuration**: Biome settings are defined in `biome.json`
- Biome provides fast formatting and linting with zero configuration needed for most projects

### Generate API Types

The `generate-api-types` script generates TypeScript types from your backend API's OpenAPI specification.

**Usage:**

```bash
bun run generate-api-types
```

**Requirements:**

- Your backend server must be running on `localhost:3000`
- The backend must expose an OpenAPI JSON endpoint at `/api/openapi/json`

The script uses `openapi-typescript` to fetch the OpenAPI schema and generate TypeScript types, which are saved to `./types/api.ts`. This ensures your frontend types stay in sync with your backend API.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
