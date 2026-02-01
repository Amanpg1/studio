'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Scan } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { deleteScan } from '@/app/actions/scan';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getAssessmentVariant = (assessment: Scan['result']['assessment']) => {
    switch (assessment) {
        case 'Safe to Eat': return 'default';
        case 'Consume in Moderation': return 'secondary';
        case 'Not Safe': return 'destructive';
        default: return 'outline';
    }
}

export default function HistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchScans = async () => {
                setLoading(true);
                const q = query(
                    collection(db, "scans"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                const querySnapshot = await getDocs(q);
                const fetchedScans = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: (doc.data().createdAt as Timestamp).toDate(),
                })) as Scan[];
                setScans(fetchedScans);
                setLoading(false);
            };
            fetchScans();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const handleDelete = async (scanId: string) => {
        if (!user) return;
        
        const originalScans = [...scans];
        // Optimistically update the UI
        setScans(scans.filter(s => s.id !== scanId));

        try {
            await deleteScan(scanId, user.uid);
            toast({
                title: "Scan deleted",
                description: "The scan has been removed from your history.",
            });
        } catch (error) {
            // Revert on error
            setScans(originalScans);
            toast({
                variant: 'destructive',
                title: "Deletion failed",
                description: "Could not delete the scan. Please try again.",
            });
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading history...</span>
            </div>
        )
    }

    if (!user && !authLoading) {
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
                    {!loading && scans.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <p>You haven't scanned any items yet.</p>
                            <Button asChild variant="link">
                                <Link href="/scan">Start your first scan</Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {scans.map(scan => (
                                <li key={scan.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                                    <Link href={`/scan/${scan.id}`} className="flex-1 group">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                                            <h3 className="font-semibold group-hover:underline">{scan.productName}</h3>
                                            <Badge variant={getAssessmentVariant(scan.result.assessment)}>
                                                {scan.result.assessment}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Scanned on {new Date(scan.createdAt).toLocaleDateString()}
                                        </p>
                                    </Link>
                                    <div className="ml-4">
                                       <Button variant="ghost" size="icon" onClick={() => handleDelete(scan.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
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
