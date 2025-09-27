// Firebase Configuration Template
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
  apiKey: "AIzaSyAp8LOa6N8abYxQZpqpYqSKUzKNIGePF-s",
  authDomain: "he-ha-4a4d0.firebaseapp.com",
  databaseURL: "https://he-ha-4a4d0.firebaseio.com",
  projectId: "he-ha-4a4d0",
  storageBucket: "he-ha-4a4d0.firebasestorage.app",
  messagingSenderId: "728567998765",
  appId: "1:728567998765:web:1a96da025b65cc8469cba4",
};

// Instructions for setting up Firebase:
/*
1. Go to https://console.firebase.google.com/
2. Create a new project or select an existing one
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click "Add app" and select Web (</>) icon
6. Register your app with a nickname
7. Copy the configuration object
8. Replace the values above with your actual configuration
9. Enable Firestore Database:
   - Go to Firestore Database in the left sidebar
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select a location for your database
10. Update the firebaseConfig object in index.html with your values
*/

// Security Rules for Firestore (copy these to your Firestore Rules tab):
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for personal use
    // Note: This is for personal use only. For production, implement proper security rules.
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
*/

export default firebaseConfig;

