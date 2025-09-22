'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth, db } from '../lib/firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For new user sign-up
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up

  const handleAuthAction = async () => {
    if (!email || !password) return toast.error("Please enter both email and password.");
    
    if (isSignUp) {
      // Handle Sign Up
      if (!name) return toast.error("Please enter your name for sign up.");
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Create a user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: user.email
        });
        toast.success("Account created successfully! Welcome.");
      } catch (error: any) {
        console.error("Error creating user:", error);
        toast.error("Error creating account.", { description: error.message });
      }
    } else {
      // Handle Sign In
      try {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
      } catch (error: any) {
        console.error("Error signing in:", error);
        if (error.code === 'auth/invalid-credential') {
          toast.error("Login Failed", {
            description: "The email or password you entered is incorrect. Please double-check your credentials and try again.",
          });
        } else {
          toast.error("Login Failed", {
            description: "An unexpected error occurred. Please try again later.",
          });
        }
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <Card className="w-full max-w-sm shadow-xl dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-bold mb-2">Our Wishlist</h1>
          <CardTitle className="text-2xl">{isSignUp ? 'Create an Account' : 'Login'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Enter your details to get started.' : 'Enter your email to access your wishlist.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isSignUp && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" placeholder="e.g., Ashir" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAuthAction(); }} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleAuthAction}>{isSignUp ? 'Sign Up' : 'Sign In'}</Button>
          <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}