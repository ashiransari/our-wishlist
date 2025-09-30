console.log('Firebase messaging service worker loaded!');

// Import the Firebase app and messaging modules.
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsh0Zulju4OHP_mws_4LqilWXQIKgDbhs",
  authDomain: "our-wishlist-a3c6a.firebaseapp.com",
  projectId: "our-wishlist-a3c6a",
  storageBucket: "our-wishlist-a3c6a.firebasestorage.app",
  messagingSenderId: "723816178644",
  appId: "1:723816178644:web:c54dd8ff0844032d372c41"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// This empty fetch handler is required to ensure the service worker is considered
// "active" by some browsers, which can prevent registration failures.
self.addEventListener('fetch', () => {});

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
