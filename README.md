Of course. Here is a highly detailed `README.md` file designed to be fully understood by another AI or a new developer joining the project. It explains the architecture, data flow, and the logic behind each feature.

-----

### Updated `README.md` File

Replace the entire content of your `README.md` file with this version.

```markdown
# Our Wishlist: A Shared Gifting Application

## Project Overview

"Our Wishlist" is a full-stack, real-time web application built with Next.js, Firebase, and Cloudinary. The core concept is to provide a dedicated platform for a couple to manage and share personal wishlists, streamlining the gift-giving process for special occasions while preserving the element of surprise.

The application allows two users to be linked as "partners." Each user can manage their own wishlist, but they can also view their partner's wishlist. The key feature is a "surprise" mechanism that allows a user to secretly reserve an item from their partner's list. Once reserved, the item is removed from the original owner's view, ensuring they are unaware of which gift has been chosen for them.

The project is architected using a modern, serverless stack, ensuring high performance, real-time data synchronization, and scalability with a cost-effective (free for this scale) infrastructure.

---

## Features in Detail

The application implements a complete end-to-end user journey with the following features:

#### 1. User Authentication
* **System:** A traditional email and password-based system.
* **Implementation:** Utilizes Firebase Authentication for secure user creation and session management. The login page features a toggleable form that handles both sign-up for new users and sign-in for existing users. Upon successful sign-up, a corresponding user document is created in the Firestore `users` collection.

#### 2. Partner Linking
* **System:** A manual, database-level linking of two user accounts.
* **Implementation:** The relationship is defined in the Firestore `users` collection. Each user document contains a `partnerId` field, which stores the UID of their linked partner. This relationship is bidirectional.

#### 3. Dashboard and Wishlist Management
* **UI:** A multi-tabbed dashboard built with `shadcn/ui` Tabs.
* **My Wishlist Tab:** Displays only the items created by the currently logged-in user that have not been reserved by their partner.
* **Partner's Wishlist Tab:** Displays the partner's items that are available to be reserved (i.e., not already reserved by anyone).
* **Reserved By You Tab:** A private view showing only the items the current user has reserved from their partner's list.
* **Gift History Tab:** A view of all items (both the user's and their partner's) that have been marked as "purchased."
* **CRUD Operations:** Users can Create, Read, Update (Edit), and Delete their own wishlist items.

#### 4. The "Surprise" & Gifting Lifecycle
* **Core Logic:** The surprise is maintained through client-side data filtering. A user **never** sees the `reservedBy` or `isPurchased` status of their own items. An item reserved by their partner is filtered out of their main list entirely.
* **Reservation:** A "Reserve" button appears on partner's items. Clicking it updates the item document in Firestore, setting the `reservedBy` field to the current user's UID and `reservedByName` to their name.
* **Marking as Purchased:** A "Purchased" button on reserved items sets the `isPurchased` boolean to `true` in Firestore, moving the item to the "Gift History" tab for both users.
* **Reverting:** A "Revert Purchase" button in the Gift History allows users to undo a mistaken "Purchased" action by setting `isPurchased` back to `false`.

#### 5. Item Details and Organization
* **Rich Items:** Wishlist items are stored as documents in Firestore and can contain a name, price, link, notes, priority, image URL, and occasion link.
* **Priority System:** Users must assign a priority (P1, P2, P3), which is displayed as a color-coded badge.
* **Occasions System:** A separate `/occasions` page allows users to create and manage shared events (e.g., birthdays). Wishlist items can be linked to an occasion via an `occasionId`.

#### 6. UI Controls
* **Filtering:** Users can filter the currently active tab's content by Priority and by Occasion.
* **Sorting:** Users can sort the active list by date (newest/oldest), price (high/low), or priority.
* **Implementation:** Filtering and sorting are performed client-side on the already-fetched data using a `useMemo` hook for high performance without requiring new database reads.

---

## Tech Stack & Architecture

* **Framework:** **Next.js 15.5.3** (using App Router) - Provides a hybrid static & server rendering, file-based routing, and a robust React foundation.
* **Language:** **TypeScript** - For static typing and improved code quality.
* **UI Library:** **shadcn/ui** - A collection of reusable, accessible, and unstyled components built on Radix UI and Tailwind CSS.
* **Styling:** **Tailwind CSS** - A utility-first CSS framework for rapid UI development.
* **Backend-as-a-Service (BaaS):** **Google Firebase**
    * **Database:** **Firestore** - A NoSQL, document-based database used to store all application data (`users`, `wishlist`, `occasions`). Real-time data synchronization is achieved using `onSnapshot` listeners.
    * **Authentication:** **Firebase Authentication** - Manages user sign-up, sign-in, and sessions.
* **Image Hosting:** **Cloudinary** - A third-party service used for all image uploads. The application uploads images via their API and stores the returned public URL in Firestore.
* **Notifications:** **Sonner** - A modern toast notification library integrated via `shadcn/ui` for non-intrusive user feedback.
* **Deployment:** **Vercel** - The planned platform for hosting the live application.

---

## Project Setup & Installation

#### 1. Environment Variables
Create a file named `.env.local` in the project root. This file is ignored by Git and stores all secret keys.

```

# Firebase Keys (found in Project settings \> General \> Your apps)

NEXT\_PUBLIC\_FIREBASE\_API\_KEY=...
NEXT\_PUBLIC\_FIREBASE\_AUTH\_DOMAIN=...
NEXT\_PUBLIC\_FIREBASE\_PROJECT\_ID=...
NEXT\_PUBLIC\_FIREBASE\_STORAGE\_BUCKET=...
NEXT\_PUBLIC\_FIREBASE\_MESSAGING\_SENDER\_ID=...
NEXT\_PUBLIC\_FIREBASE\_APP\_ID=...

# Cloudinary Keys (found on your Cloudinary Dashboard)

NEXT\_PUBLIC\_CLOUDINARY\_CLOUD\_NAME=...

```

You will also need to create an **unsigned upload preset** in your Cloudinary account settings (Settings > Upload > Upload presets) and paste its name into the `handleAddItem` function in `src/app/dashboard/page.tsx`.

#### 2. Firestore Data Schema
You will need to create the following collections and documents manually for the initial setup.

* **`users` collection:**
    * **Document ID:** User's UID from Firebase Authentication.
    * **Fields:**
        * `name` (string): e.g., "Ashir"
        * `email` (string): e.g., "ashir@example.com"
        * `partnerId` (string): The UID of the linked partner.

* **`occasions` collection:**
    * **Document ID:** Auto-generated.
    * **Fields:**
        * `name` (string): e.g., "Zoya's Birthday 2026"
        * `date` (timestamp): The date of the event.
        * `participantIds` (array of strings): Contains the UIDs of both partners.

* **`wishlist` collection:**
    * Documents are created automatically by the app.

#### 3. Firestore Security Rules
To ensure data security, set the following rules in your Firestore Rules tab:

```

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /users/{userId} {
allow read: if true;
allow write: if request.auth != null && request.auth.uid == userId;
}
match /wishlist/{document=**} {
allow read, write: if request.auth != null;
}
match /occasions/{occasionId} {
      allow read, update, delete: if request.auth != null && request.auth.uid in resource.data.participantIds;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.participantIds;
}
}
}

````

#### 4. Running Locally
Install dependencies and run the development server:

```bash
npm install
npm run dev
````

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser.

-----

## Core Application Logic

The application's primary logic is contained within `src/app/dashboard/page.tsx`.

  * **State Management:** The component uses React's `useState` hook to manage all local state, including form inputs, UI settings (active tab, sorting), and the lists of items.
  * **Data Fetching:** A `useEffect` hook listens to `onAuthStateChanged` to get the current user. Once the user is confirmed, a subsequent `useEffect` sets up real-time `onSnapshot` listeners for the `wishlist` and `occasions` collections. This ensures the UI updates instantly when data changes in the database.
  * **Derived State:** React's `useMemo` hook is used extensively to calculate the lists for each tab (`myCurrentItems`, `partnerCurrentItems`, etc.) and the filtered/sorted `displayedItems`. This is highly performant as it only re-calculates when its dependencies (the raw data from Firestore or UI settings) change, without needing to re-fetch from the database.

<!-- end list -->

```
```