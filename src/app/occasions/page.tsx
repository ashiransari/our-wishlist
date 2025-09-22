'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { auth, db } from '../../lib/firebase/config';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, getDoc, Timestamp, orderBy } from "firebase/firestore";
import Link from 'next/link';

type Occasion = {
  id: string;
  name: string;
  date: Timestamp;
  participantIds: string[];
};

export default function OccasionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [occasionName, setOccasionName] = useState('');
  const [occasionDate, setOccasionDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        const occasionsQuery = query(collection(db, "occasions"), where("participantIds", "array-contains", user.uid), orderBy("date", "asc"));
        const unsubscribeOccasions = onSnapshot(occasionsQuery, (snapshot) => {
          setOccasions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Occasion)));
        });
        return () => unsubscribeOccasions();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddOccasion = async () => {
    if (!user || !occasionName || !occasionDate) {
      return toast.error("Please provide a name and a date.");
    }
    setIsLoading(true);

    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const partnerId = userDocSnap.exists() ? userDocSnap.data().partnerId : null;
    
    if (!partnerId) {
      setIsLoading(false);
      return toast.error("You must have a linked partner to create a shared occasion.");
    }

    try {
      await addDoc(collection(db, "occasions"), {
        name: occasionName,
        date: Timestamp.fromDate(occasionDate),
        participantIds: [user.uid, partnerId]
      });
      toast.success(`Occasion "${occasionName}" created!`);
      setOccasionName('');
      setOccasionDate(new Date());
    } catch (error) {
      console.error("Error adding occasion:", error);
      toast.error("Failed to create occasion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOccasion = async (occasionId: string) => {
    if (confirm("Are you sure you want to delete this occasion?")) {
      await deleteDoc(doc(db, "occasions", occasionId));
      toast.success("Occasion deleted.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-950">
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Occasions</h1>
        <Button asChild variant="outline"><Link href="/dashboard">Back to Wishlist</Link></Button>
      </header>
      <main className="w-full max-w-2xl">
        <div className="mb-8 p-6 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Add a New Occasion</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input 
              value={occasionName} 
              onChange={(e) => setOccasionName(e.target.value)} 
              placeholder="e.g., Zoya's Birthday 2026"
              className="flex-grow"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full sm:w-auto sm:min-w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occasionDate ? format(occasionDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={occasionDate} onSelect={setOccasionDate} initialFocus/>
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddOccasion} disabled={isLoading}>{isLoading ? "Adding..." : "Add"}</Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Occasions</h2>
          <div className="space-y-4">
            {occasions.map(occ => (
              <div key={occ.id} className="flex justify-between items-center p-4 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                <div>
                  <p className="font-medium">{occ.name}</p>
                  <p className="text-sm text-gray-500">{format(occ.date.toDate(), "PPP")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteOccasion(occ.id)}>
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700"/>
                </Button>
              </div>
            ))}
             {occasions.length === 0 && !isLoading && <p className="text-gray-500 text-center py-4">No occasions created yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}