'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { Scan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';

const getAssessmentVariant = (assessment: Scan['result']['assessment']) => {
    switch (assessment) {
        case 'Safe to Eat': return 'default';
        case 'Consume in Moderation': return 'secondary';
        case 'Not Safe': return 'destructive';
        default: return 'outline';
    }
}

export default function HistoryPage() {
    const { user: firebaseUser, isUserLoading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const scansQuery = useMemoFirebase(() => {
        if (!firebaseUser || !firestore) return null;
        return query(
            collection(firestore, "users", firebaseUser.uid, "foodScans"),
            orderBy("createdAt", "desc")
        );
    }, [firebaseUser, firestore]);

    const { data: scans, isLoading: scansLoading } = useCollection<Scan>(scansQuery);

    const validScans = useMemo(() => scans?.filter(s => s && s.result) ?? [], [scans]);

    const handleDelete = (scanId: string) => {
        if (!firebaseUser || !firestore) return;
        setIsDeleting(scanId);
        const scanDocRef = doc(firestore, 'users', firebaseUser.uid, 'foodScans', scanId);
        
        deleteDoc(scanDocRef)
            .then(() => {
                toast({
                    title: "Scan deleted",
                    description: "The scan has been removed from your history.",
                });
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: scanDocRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({
                    variant: 'destructive',
                    title: "Deletion failed",
                    description: "Could not delete the scan. Please try again.",
                });
            })
            .finally(() => {
                setIsDeleting(null);
            });
    };

    const loading = authLoading || scansLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading history...</span>
            </div>
        )
    }

    if (!firebaseUser && !authLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Please Log In</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You need to be logged in to view your scan history.</p>
                     <Button asChild variant="link" className="p-0">
                        <Link href="/login">Login</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Scan History</h2>
                <p className="text-muted-foreground">
                    Review your previously scanned items and their assessments.
                </p>
            </div>
            <Card>
                <CardContent className="p-0">
                    {!loading && validScans.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <p>You haven't scanned any items yet.</p>
                            <Button asChild variant="link">
                                <Link href="/scan">Start your first scan</Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {validScans.map(scan => (
                                <li key={scan.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                                    <Link href={`/scan/${scan.id}`} className="flex-1 group">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                                            <h3 className="font-semibold group-hover:underline">{scan.productName}</h3>
                                            <Badge variant={getAssessmentVariant(scan.result.assessment)}>
                                                {scan.result.assessment}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {scan.createdAt && `Scanned on ${new Date((scan.createdAt as any).seconds * 1000).toLocaleDateString()}`}
                                        </p>
                                    </Link>
                                    <div className="ml-4">
                                       <Button variant="ghost" size="icon" onClick={() => handleDelete(scan.id)} disabled={!!isDeleting}>
                                            {isDeleting === scan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                            <span className="sr-only">Delete scan</span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
