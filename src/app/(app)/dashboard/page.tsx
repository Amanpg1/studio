'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, PlusCircle, ScanLine, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Scan } from '@/lib/types';
import { InlineLoader } from '@/components/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';

function StatCard({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const { user: firebaseUser } = useUser();
  const firestore = useFirestore();

  const scansQuery = useMemoFirebase(() => {
    if (!firebaseUser || !firestore) return null;
    return query(
      collection(firestore, "users", firebaseUser.uid, "foodScans"), 
      orderBy("createdAt", "desc")
    );
  }, [firebaseUser, firestore]);
  
  const { data: scans, isLoading, error } = useCollection<Scan>(scansQuery);

  const stats = useMemo(() => {
    if (!scans) {
      return { totalScans: 0, safeItems: 0, unsafeItems: 0 };
    }
    const validScans = scans.filter(s => s && s.result);
    return {
      totalScans: scans.length,
      safeItems: validScans.filter(s => s.result.assessment === 'Safe to Eat').length,
      unsafeItems: validScans.filter(s => s.result.assessment === 'Consume in Moderation' || s.result.assessment === 'Not Safe').length,
    };
  }, [scans]);

  const recentScans = useMemo(() => scans?.filter(s => s && s.result).slice(0, 5) ?? [], [scans]);

  if (error) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-muted-foreground">Here's a summary of your scanning activity.</p>
                </div>
            </div>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard</AlertTitle>
                <AlertDescription>
                    We couldn't load your data. Please try refreshing the page.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <p className="text-muted-foreground">Here's a summary of your scanning activity.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
                <Link href="/scan">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Scan
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/history">
                    <History className="mr-2 h-4 w-4" />
                    View History
                </Link>
            </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader><CardTitle><InlineLoader text="Loading stats..."/></CardTitle></CardHeader></Card>
          <Card><CardHeader><CardTitle><InlineLoader text="Loading stats..."/></CardTitle></CardHeader></Card>
          <Card><CardHeader><CardTitle><InlineLoader text="Loading stats..."/></CardTitle></CardHeader></Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Scans" value={String(stats.totalScans)} icon={ScanLine} description="All items you've scanned." />
          <StatCard title="Safe Items" value={String(stats.safeItems)} icon={ScanLine} description="Items marked as safe to eat." />
          <StatCard title="Moderation / Not Safe" value={String(stats.unsafeItems)} icon={ScanLine} description="Items to be careful with." />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your last few scanned items.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoader text="Loading recent scans..." />
          ) : recentScans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {scans && scans.length > 0 
                ? "No recent scans with a valid assessment found." 
                : "No recent scans found. Start by scanning a new food item!"
              }
            </p>
          ) : (
            <ul className="divide-y">
              {recentScans.map(scan => (
                <li key={scan.id} className="py-2">
                  <Link href={`/scan/${scan.id}`} className="flex items-center justify-between group">
                    <div>
                      <p className="font-semibold group-hover:underline">{scan.productName}</p>
                      <p className="text-sm text-muted-foreground">{scan.result.assessment}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(scan.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
