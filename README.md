# Puyo Puyo Firebase

This is a simple Puyo Puyo game built with React. It is ready to be deployed as a Firebase project. Game state is handled on the client and you can connect Firebase to store scores or other data.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Firebase project and copy the configuration into `src/firebaseConfig.js`.
3. Start the development server:
   ```bash
   npm start
   ```
   The game automatically starts when you access the root URL (`/`).

## Testing
Run the React test suite with:
```bash
npm test
```

## Build for production
Use the standard build command to create a production bundle:
```bash
npm run build
```
