
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, db, auth } from "./config";
import { doc, updateDoc } from "firebase/firestore";

export const requestPermission = async () => {
    const supported = await isSupported();
    if (!supported) {
        console.log("Firebase Messaging is not supported in this browser.");
        return;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        console.log("Notification permission granted.");
        try {
            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            if (token) {
                console.log("FCM Token:", token);
                const user = auth.currentUser;
                if (user) {
                    const userDocRef = doc(db, "users", user.uid);
                    await updateDoc(userDocRef, { fcmToken: token });
                    console.log("FCM Token saved to Firestore.");
                } else {
                    console.log("No user is signed in to save the FCM token.");
                }
            } else {
                console.log("No registration token available. Request permission to generate one.");
            }
        } catch (error) {
            console.error("An error occurred while retrieving token. ", error);
        }
    } else {
        console.log("Unable to get permission to notify.");
    }
};
