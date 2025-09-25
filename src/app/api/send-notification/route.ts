
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Ensure you have your service account credentials set up in your environment variables.
// The service account key JSON file should be base64 encoded and stored in an environment variable.
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("ascii")
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(request: Request) {
  const { partnerId, message, title } = await request.json();

  if (!partnerId || !message || !title) {
    return NextResponse.json(
      { success: false, error: "Missing partnerId or message or title" },
      { status: 400 }
    );
  }

  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(partnerId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      return NextResponse.json(
        { success: false, error: "FCM token not found for user" },
        { status: 404 }
      );
    }

    const payload = {
      notification: {
        title: title,
        body: message,
        icon: "/logo.png",
      },
    };

    await admin.messaging().send({ token: fcmToken, ...payload });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
