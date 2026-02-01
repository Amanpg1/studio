'use client';

import { doc, Timestamp } from 'firebase/firestore';
import type { Scan } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info, ShieldAlert, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { FullScreenLoader } from '@/components/loader';

const assessmentDetails = {
    'Safe to Eat': {
        variant: 'default',
        icon: CheckCircle2,
        title: 'Safe to Eat',
        description: 'Our analysis indicates this food is safe for you based on your health profile.',
        className: 'bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200',
    },
    'Consume in Moderation': {
        variant: 'secondary',
        icon: ShieldAlert,
        title: 'Consume in Moderation',
        description: 'This food may have ingredients or nutritional values that you should be mindful of.',
        className: 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200',
    },
    'Not Safe': {
        variant: 'destructive',
        icon: AlertCircle,
        title: 'Not Safe',
        description: 'We advise against eating this food due to potential health risks based on your profile.',
        className: 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200',
    },
};

export default function ScanResultPage({ params }: { params: { id: string } }) {
    const firestore = useFirestore();
    const scanDocRef = useMemoFirebase(() => {
        if (!params.id || !firestore) return null;
        return doc(firestore, 'scans', params.id);
    }, [params.id, firestore]);

    const { data: scan, isLoading } = useDoc<Scan>(scanDocRef);

    if (isLoading) {
        return <FullScreenLoader />;
    }

    if (!scan) {
        notFound();
    }

    const details = assessmentDetails[scan.result.assessment];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Analysis Result</h2>
                <p className="text-muted-foreground">
                    Detailed assessment for <span className="font-semibold">{scan.productName}</span>.
                </p>
            </div>

            <Card className={details.className}>
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <details.icon className="h-10 w-10 flex-shrink-0" />
                    <div>
                        <CardTitle>{details.title}</CardTitle>
                        <CardDescription className="text-inherit/80">{details.description}</CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Zap className="h-5 w-5 text-primary" /> AI-Powered Explanation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{scan.result.explanation}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" /> Scanned Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold">Product Name</h4>
                            <p className="text-muted-foreground">{scan.input.productName}</p>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold">Ingredients</h4>
                            <p className="text-sm text-muted-foreground">{scan.input.ingredients}</p>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold">Key Nutrition Facts</h4>
                             <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <li><strong>Calories:</strong> {scan.input.nutrition.calories} kcal</li>
                                <li><strong>Fat:</strong> {scan.input.nutrition.fat} g</li>
                                <li><strong>Sugar:</strong> {scan.input.nutrition.sugar} g</li>
                                <li><strong>Sodium:</strong> {scan.input.nutrition.sodium} mg</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
