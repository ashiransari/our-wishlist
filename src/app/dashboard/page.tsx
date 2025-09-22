'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { auth, db } from '../../lib/firebase/config';
import { signOut, User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, getDoc, updateDoc, Timestamp } from "firebase/firestore";

import Link from 'next/link';
import Image from 'next/image';
import { Plus, ChevronsUpDown, X } from 'lucide-react';

// Type Definitions
type WishlistItem = {
  id: string; name: string; price: number; link?: string; notes?: string; authorId: string;
  reservedBy?: string; reservedByName?: string; priority: 'P1' | 'P2' | 'P3';
  imageUrl?: string; createdAt: Timestamp; isPurchased?: boolean; occasionId?: string;
};
type Occasion = { id: string; name: string; };
type SortOption = 'newest' | 'oldest' | 'priceHigh' | 'priceLow' | 'priority';
type FilterOption = 'all' | 'P1' | 'P2' | 'P3';

export default function DashboardPage() {
  // State Hooks
  const [user, setUser] = useState<User | null>(null);
  const [myName, setMyName] = useState("Me");
  const [partnerName, setPartnerName] = useState("Partner");
  const [myItems, setMyItems] = useState<WishlistItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<WishlistItem[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemLink, setItemLink] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [priority, setPriority] = useState<'P1' | 'P2' | 'P3'>('P2');
  const [occasionId, setOccasionId] = useState<string>('none');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // UI State
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [filterByOccasion, setFilterByOccasion] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('my-wishlist');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // Data Fetching Effect
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      let unsubMyItems = () => {};
      let unsubPartnerItems = () => {};
      let unsubOccasions = () => {};
      const setupListeners = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) setMyName(userDocSnap.data().name || "Me");
        const partnerId = userDocSnap.exists() ? userDocSnap.data().partnerId : null;
        if (partnerId) {
          const partnerDocRef = doc(db, "users", partnerId);
          const partnerDocSnap = await getDoc(partnerDocRef);
          if (partnerDocSnap.exists()) setPartnerName(partnerDocSnap.data().name || "Partner");
        }
        
        const myQuery = query(collection(db, "wishlist"), where("authorId", "==", user.uid));
        unsubMyItems = onSnapshot(myQuery, (snap) => setMyItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem))));
        
        if (partnerId) {
          const partnerQuery = query(collection(db, "wishlist"), where("authorId", "==", partnerId));
          unsubPartnerItems = onSnapshot(partnerQuery, (snap) => setPartnerItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem))));
        }

        const occasionsQuery = query(collection(db, "occasions"), where("participantIds", "array-contains", user.uid));
        unsubOccasions = onSnapshot(occasionsQuery, (snap) => setOccasions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Occasion))));
        
        setLoading(false);
      };
      
      setupListeners();
      return () => { unsubMyItems(); unsubPartnerItems(); unsubOccasions(); };
    }
  }, [user]);

  // Derived State for Tabs (This is the corrected logic for the surprise)
  const { myCurrentItems, partnerCurrentItems, reservedByMeItems, giftHistoryItems, allCurrentItems } = useMemo(() => {
    const myUnpurchased = myItems.filter(item => !item.isPurchased);
    const partnerUnpurchased = partnerItems.filter(item => !item.isPurchased);
    
    // My list only shows items that are NOT reserved by my partner.
    const myVisibleItems = myUnpurchased.filter(item => !item.reservedBy);

    // My partner's list only shows items that are NOT reserved by me or anyone else.
    const partnerVisibleItems = partnerUnpurchased.filter(item => !item.reservedBy);

    // Items I have reserved from my partner's list.
    const reservedByMe = partnerUnpurchased.filter(item => item.reservedBy === user?.uid);

    const giftHistory = [...myItems, ...partnerItems].filter(item => item.isPurchased && (item.authorId === user?.uid || item.reservedBy === user?.uid));
    
    return { 
        myCurrentItems: myVisibleItems, 
        partnerCurrentItems: partnerVisibleItems, 
        reservedByMeItems: reservedByMe, 
        giftHistoryItems: giftHistory,
        allCurrentItems: [...myVisibleItems, ...partnerVisibleItems]
    };
  }, [myItems, partnerItems, user]);

  const reservedTotal = useMemo(() => reservedByMeItems.reduce((sum, item) => sum + (item.price || 0), 0), [reservedByMeItems]);

  const displayedItems = useMemo(() => {
    let itemsToProcess: WishlistItem[] = [];
    if (activeTab === 'my-wishlist') itemsToProcess = myCurrentItems;
    else if (activeTab === 'partner-wishlist') itemsToProcess = partnerCurrentItems;
    else if (activeTab === 'reserved') itemsToProcess = reservedByMeItems;
    else if (activeTab === 'history') itemsToProcess = giftHistoryItems;
    else if (activeTab === 'all') itemsToProcess = allCurrentItems;
    
    const occasionFiltered = filterByOccasion !== 'all' ? itemsToProcess.filter(item => item.occasionId === filterByOccasion) : itemsToProcess;
    const priorityFiltered = filterBy !== 'all' ? occasionFiltered.filter(item => item.priority === filterBy) : occasionFiltered;

    return [...priorityFiltered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
        case 'priceHigh': return (b.price || 0) - (a.price || 0);
        case 'priceLow': return (a.price || 0) - (b.price || 0);
        case 'priority': return (a.priority || 'P3').localeCompare(b.priority || 'P3');
        default: return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      }
    });
  }, [activeTab, myCurrentItems, partnerCurrentItems, reservedByMeItems, giftHistoryItems, filterBy, sortBy, filterByOccasion, allCurrentItems]);
  
  const resetForm = () => {
    setItemName(''); setItemPrice(''); setItemLink(''); setItemNotes(''); setPriority('P2'); 
    setImageFile(null); setEditingItem(null); setOccasionId('none');
  };

  const handleOpenDialog = (item: WishlistItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemPrice(item.price ? item.price.toString() : '');
      setItemLink(item.link || '');
      setItemNotes(item.notes || '');
      setPriority(item.priority);
      setOccasionId(item.occasionId || 'none');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleFormSubmit = async () => {
    if (!user || !itemName || !itemPrice || !priority) return toast.error("Please fill in Name, Price, and Priority.");
    setIsUploading(true);
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        let imageUrl = editingItem?.imageUrl || '';
        if (imageFile) {
          const formData = new FormData();
          formData.append('file', imageFile);
          formData.append('upload_preset', 'wishlist_uploads');
          const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
          const data = await response.json();
          if (data.secure_url) { imageUrl = data.secure_url; } 
          else { throw new Error("Cloudinary upload failed."); }
        }
        const itemData = { name: itemName, price: parseFloat(itemPrice), link: itemLink, notes: itemNotes, priority: priority, imageUrl: imageUrl, occasionId: occasionId === 'none' ? '' : occasionId };
        if (editingItem) {
          await updateDoc(doc(db, "wishlist", editingItem.id), itemData);
        } else {
          await addDoc(collection(db, "wishlist"), { ...itemData, authorId: user.uid, createdAt: new Date() });
        }
        resetForm();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        setIsUploading(false);
        setIsDialogOpen(false);
      }
    });
    toast.promise(promise, { loading: editingItem ? 'Updating...' : 'Adding...', success: editingItem ? 'Item updated!' : 'Item added!', error: 'Failed to save.' });
  };
  
  const handleSignOut = async () => await signOut(auth);
  const handleDeleteConfirmation = (itemId: string) => { setItemToDelete(itemId); setIsDeleteDialogOpen(true); };
  const handleDeleteItem = async () => { if (!itemToDelete) return; await deleteDoc(doc(db, "wishlist", itemToDelete)); toast.success("Item deleted."); setItemToDelete(null); setIsDeleteDialogOpen(false); };
  const handleReserveItem = async (itemId: string) => { if(!user) return; await updateDoc(doc(db, "wishlist", itemId), { reservedBy: user.uid, reservedByName: myName }); };
  const handleUnreserveItem = async (itemId: string) => { await updateDoc(doc(db, "wishlist", itemId), { reservedBy: "", reservedByName: "" }); };
  const handleMarkAsPurchased = async (itemId: string) => { await updateDoc(doc(db, "wishlist", itemId), { isPurchased: true }); };
  const handleUnmarkAsPurchased = async (itemId: string) => { await updateDoc(doc(db, "wishlist", itemId), { isPurchased: false }); };
  const getPriorityBadgeColor = (p?: string) => {
    switch (p) {
      case 'P1': return 'bg-red-600';
      case 'P2': return 'bg-yellow-500';
      case 'P3': return 'bg-sky-500';
      default: return 'bg-gray-400';
    }
  };

  const handleOpenImageModal = (url: string) => {
    setImageModalUrl(url);
  };
  const handleCloseImageModal = () => setImageModalUrl(null);

  const editItemTitle = "Edit Item";
  const addItemTitle = "Add to Your Wishlist";

  const renderWishlist = (items: WishlistItem[]) => (
     <div className="pt-4">
      {items.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isMyItem = item.authorId === user?.uid;
            const isReservedByMe = item.reservedBy === user?.uid;
            const formattedLink = item.link && !item.link.startsWith('http') ? `https://${item.link}` : item.link;
            return (
              <Card key={item.id} className={`flex flex-col justify-between transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg ${isReservedByMe ? 'border-green-500 border-2' : ''} ${item.isPurchased ? 'opacity-60' : ''}`}>
                <div>
                  {item.imageUrl && <Image src={item.imageUrl} alt={item.name} width={192} height={192} className="w-full h-48 object-cover rounded-t-lg cursor-pointer" onClick={() => handleOpenImageModal(item.imageUrl!)}/>}                   <CardHeader>
                    <div className="flex justify-between items-start"> <CardTitle>{item.name}</CardTitle> {item.priority && <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityBadgeColor(item.priority)}`}>{item.priority}</span>} </div>
                    {typeof item.price === 'number' && <p className="font-semibold text-lg">₹{item.price.toLocaleString()}</p>}
                  </CardHeader>
                  <CardContent>
                    {item.notes && <p className="text-sm text-gray-600 dark:text-gray-300">{item.notes}</p>}
                    {formattedLink && <a href={formattedLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs block mt-2">View Product</a>}
                    {item.isPurchased && <p className="text-xs text-green-600 mt-2 font-bold">Purchased!</p>}
                  </CardContent>
                </div>
                <CardFooter className="flex gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 mt-auto">
                  {isMyItem && !item.isPurchased && <>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirmation(item.id)}>Delete</Button>
                  </>}
                  {!isMyItem && isReservedByMe && !item.isPurchased && <>
                    <Button variant="secondary" size="sm" onClick={() => handleUnreserveItem(item.id)}>Unreserve</Button>
                    <Button size="sm" onClick={() => handleMarkAsPurchased(item.id)}>Purchased</Button>
                  </>}
                  {!isMyItem && !item.reservedBy && <Button size="sm" onClick={() => handleReserveItem(item.id)}>Reserve</Button>}
                  {activeTab === 'history' && (isMyItem || isReservedByMe) &&
                    <Button variant="ghost" size="sm" onClick={() => handleUnmarkAsPurchased(item.id)}>Revert Purchase</Button>
                  }
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (<p className="text-gray-500 pt-4 text-center">This wishlist is empty.</p>)}
    </div>
  );

  const renderActiveTabContent = () => {
    if (activeTab === 'all') {
      return (
        <>
          <div className="pt-4">
            <h2 className="text-2xl font-bold mb-4">My Wishlist</h2>
            {renderWishlist(myCurrentItems)}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 pt-4">{partnerName}&#39;s Wishlist</h2>
            {renderWishlist(partnerCurrentItems)}
          </div>
        </>
      );
    }
    if (activeTab === 'reserved') {
      return (
        <>
          <div className="pt-4 font-semibold text-lg">Total Reserved Budget: ₹{reservedTotal.toLocaleString()}</div>
          {renderWishlist(displayedItems)}
        </>
      );
    }
    return renderWishlist(displayedItems);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">
       <header className="w-full max-w-5xl flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800"><h1 className="text-3xl font-bold">Our Wishlist</h1><Button variant="outline" onClick={handleSignOut}>Sign Out</Button></header>
       
       <main className="w-full max-w-5xl">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>

          {/* Mobile Controls */}
          <div className="md:hidden mb-4">
            <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="w-full">
              <div className="flex items-center justify-between">
                <Button asChild variant="secondary"><Link href="/occasions">Manage Occasions</Link></Button>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-36">
                    <ChevronsUpDown className="h-4 w-4 mr-2" />
                    {isFilterOpen ? 'Hide' : 'Filter & Sort'}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-4">
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white dark:bg-slate-900">
                  <Select value={filterByOccasion} onValueChange={setFilterByOccasion}><SelectTrigger><SelectValue placeholder="Filter by Occasion" /></SelectTrigger><SelectContent><SelectItem value="all">All Occasions</SelectItem>{occasions.map(occ => <SelectItem key={occ.id} value={occ.id}>{occ.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}><SelectTrigger><SelectValue placeholder="Filter by Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priorities</SelectItem><SelectItem value="P1">P1 Only</SelectItem><SelectItem value="P2">P2 Only</SelectItem><SelectItem value="P3">P3 Only</SelectItem></SelectContent></Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}><SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="newest">Newest First</SelectItem><SelectItem value="oldest">Oldest First</SelectItem><SelectItem value="priceHigh">Price: High to Low</SelectItem><SelectItem value="priceLow">Price: Low to High</SelectItem><SelectItem value="priority">Priority</SelectItem></SelectContent></Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex flex-wrap justify-between items-center mb-4 gap-4">
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <Select value={filterByOccasion} onValueChange={setFilterByOccasion}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Occasion" /></SelectTrigger><SelectContent><SelectItem value="all">All Occasions</SelectItem>{occasions.map(occ => <SelectItem key={occ.id} value={occ.id}>{occ.name}</SelectItem>)}</SelectContent></Select>
              <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priorities</SelectItem><SelectItem value="P1">P1 Only</SelectItem><SelectItem value="P2">P2 Only</SelectItem><SelectItem value="P3">P3 Only</SelectItem></SelectContent></Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="newest">Newest First</SelectItem><SelectItem value="oldest">Oldest First</SelectItem><SelectItem value="priceHigh">Price: High to Low</SelectItem><SelectItem value="priceLow">Price: Low to High</SelectItem><SelectItem value="priority">Priority</SelectItem></SelectContent></Select>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="secondary"><Link href="/occasions">Manage Occasions</Link></Button>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>Add New Item</Button>
                </DialogTrigger>
            </div>
          </div>
          
          {loading ? <p>Loading...</p> : (
            <div>
              {/* Mobile View: Dropdown */}
              <div className="md:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="my-wishlist">My Wishlist</SelectItem>
                    <SelectItem value="partner-wishlist">{partnerName}&#39;s Wishlist</SelectItem>
                    <SelectItem value="reserved">Reserved By You</SelectItem>
                    <SelectItem value="history">Gift History</SelectItem>
                    <SelectItem value="all">All Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop View: Tabs */}
              <Tabs defaultValue="my-wishlist" className="hidden md:block w-full" onValueChange={setActiveTab} value={activeTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="my-wishlist">My Wishlist</TabsTrigger>
                  <TabsTrigger value="partner-wishlist">{partnerName}'s Wishlist</TabsTrigger>
                  <TabsTrigger value="reserved">Reserved By You</TabsTrigger>
                  <TabsTrigger value="history">Gift History</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>

              {renderActiveTabContent()}
            </div>
          )}

          {/* Mobile FAB */}
          <DialogTrigger asChild>
            <Button className="md:hidden fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg z-10" onClick={() => handleOpenDialog()}>
              <Plus className="h-8 w-8" />
            </Button>
          </DialogTrigger>
          
          <DialogContent>
              <DialogHeader><DialogTitle>{editingItem ? editItemTitle : addItemTitle}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>Name*</Label><Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item Name"/></div>
                <div><Label>Price (₹)*</Label><Input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} type="number" placeholder="e.g., 1500"/></div>
                <div><Label>Link (Optional)</Label><Input value={itemLink} onChange={(e) => setItemLink(e.target.value)} placeholder="https://..."/></div>
                <div><Label>Notes (Optional)</Label><Textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} placeholder="e.g., Size M, Blue color"/></div>
                <div><Label>Priority*</Label><Select value={priority} onValueChange={(value) => setPriority(value as 'P1'|'P2'|'P3')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="P1">P1 - Must Have</SelectItem><SelectItem value="P2">P2 - Would Be Nice</SelectItem><SelectItem value="P3">P3 - If You Can</SelectItem></SelectContent></Select></div>
                <div><Label>Occasion (Optional)</Label><Select value={occasionId} onValueChange={setOccasionId}><SelectTrigger><SelectValue placeholder="Assign to an occasion" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{occasions.map(occ => <SelectItem key={occ.id} value={occ.id}>{occ.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Image (Optional)</Label><Input type="file" accept="image/*" onChange={(e) => e.target.files && setImageFile(e.target.files[0])} className="pt-1.5"/></div>
              </div>
              <DialogFooter><Button onClick={handleFormSubmit} disabled={isUploading}>{isUploading ? 'Saving...' : 'Save changes'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item from your wishlist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {imageModalUrl && (
        <Dialog open={!!imageModalUrl} onOpenChange={(open) => !open && handleCloseImageModal()}>
          <DialogContent className="w-screen h-screen max-w-none max-h-none p-4 bg-transparent border-none flex items-center justify-center">
            <Image src={imageModalUrl} alt="Wishlist Item" fill className="object-contain rounded-lg" />
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 rounded-full bg-gray-900/50 text-white hover:bg-gray-900/75"
              >
                <X className="h-8 w-8" />
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}