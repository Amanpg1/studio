import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Scan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { deleteScan } from '@/app/actions/scan';
import { Trash2 } from 'lucide-react';
import { headers } from 'next/headers';

// This is a server component that fetches data.
// In a real app with proper session management, we would get the UID from the server session.
// For this example, we'll assume we can get the current user, but this part is tricky without a full backend.
// A client component fetching data after mount is an alternative.
// We'll proceed with a server-side fetch assuming we can get the user.

async function getScans(userId: string): Promise<Scan[]> {
    const q = query(
      collection(db, "scans"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
    })) as Scan[];
}

function DeleteButton({ scanId }: { scanId: string }) {
    const deleteScanWithId = deleteScan.bind(null, scanId);
    return (
        <form action={deleteScanWithId}>
            <Button variant="ghost" size="icon" type="submit">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete scan</span>
            </Button>
        </form>
    );
}

const getAssessmentVariant = (assessment: Scan['result']['assessment']) => {
    switch (assessment) {
        case 'Safe to Eat': return 'default';
        case 'Consume in Moderation': return 'secondary';
        case 'Not Safe': return 'destructive';
        default: return 'outline';
    }
}

export default async function HistoryPage() {
    // This is not a secure way to get the user ID on the server.
    // In a production app, use server-side sessions.
    const uid = auth.currentUser?.uid;
    const scans = uid ? await getScans(uid) : [];

    if (!uid) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Could not verify user. Please try logging in again.</p>
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
                    {scans.length === 0 ? (
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
                                    <Link href={`/scan/${scan.id}`} className="flex-1">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                                            <h3 className="font-semibold">{scan.productName}</h3>
                                            <Badge variant={getAssessmentVariant(scan.result.assessment)}>
                                                {scan.result.assessment}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Scanned on {new Date(scan.createdAt).toLocaleDateString()}
                                        </p>
                                    </Link>
                                    <div className="ml-4">
                                       <DeleteButton scanId={scan.id} />
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
