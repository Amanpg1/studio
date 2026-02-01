import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, PlusCircle, ScanLine } from 'lucide-react';
import Link from 'next/link';

// This is a server component, but we will fetch data on the client side for now
// to ensure we have the logged in user's ID.
// A more advanced implementation might use server-side data fetching with session management.

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
  // In a real app, you would fetch these values from your database
  const stats = {
    totalScans: '12',
    safeItems: '8',
    unsafeItems: '2'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Scans" value={stats.totalScans} icon={ScanLine} description="All items you've scanned." />
        <StatCard title="Safe Items" value={stats.safeItems} icon={ScanLine} description="Items marked as safe to eat." />
        <StatCard title="Moderation / Not Safe" value={stats.unsafeItems} icon={ScanLine} description="Items to be careful with." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your last few scanned items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent scans found. Start by scanning a new food item!
          </p>
          {/* In a real app, a list of recent scans would be rendered here */}
        </CardContent>
      </Card>
    </div>
  );
}
