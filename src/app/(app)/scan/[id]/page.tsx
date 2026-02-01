'use client';

import { doc } from 'firebase/firestore';
import type { Scan } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Info, ShieldAlert, Zap, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
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
    const { user: firebaseUser } = useUser();
    const firestore = useFirestore();
    const scanDocRef = useMemoFirebase(() => {
        if (!params.id || !firestore || !firebaseUser) return null;
        return doc(firestore, 'users', firebaseUser.uid, 'foodScans', params.id);
    }, [params.id, firestore, firebaseUser]);

    const { data: scan, isLoading, error } = useDoc<Scan>(scanDocRef);

    if (isLoading) {
        return <FullScreenLoader />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analysis Result</h2>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Error Loading Scan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            There was a problem retrieving this scan result. It might have been deleted or you may not have permission to view it.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!scan) {
        notFound();
    }

    if (!scan.result) {
        return (
            <div className="space-y-6">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analysis Result</h2>
                    <p className="text-muted-foreground">
                        Detailed assessment for <span className="font-semibold">{scan.productName}</span>.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Assessment Not Available
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            An AI assessment could not be generated or found for this item. This might be due to a processing error or incomplete data.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const details = assessmentDetails[scan.result.assessment];
    const { servingSizeGrams, calories, fat, sugar, sodium } = scan.input?.nutrition || {};
    const hasServingSize = typeof servingSizeGrams === 'number' && servingSizeGrams > 0;

    const per100g = (value?: number) => {
        if (!hasServingSize || typeof value !== 'number' || servingSizeGrams! <= 0) return 'N/A';
        return ((value / servingSizeGrams!) * 100).toFixed(1);
    };

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
                            <p className="text-muted-foreground">{scan.input?.productName || 'N/A'}</p>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold">Ingredients</h4>
                            <p className="text-sm text-muted-foreground">{scan.input?.ingredients || 'N/A'}</p>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold">Key Nutrition Facts</h4>
                             <p className="text-sm text-muted-foreground mt-1">Per Serving ({servingSizeGrams ? `${servingSizeGrams}g` : 'N/A'})</p>
                             <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <li><strong>Calories:</strong> {calories ?? 'N/A'} kcal</li>
                                <li><strong>Fat:</strong> {fat ?? 'N/A'} g</li>
                                <li><strong>Sugar:</strong> {sugar ?? 'N/A'} g</li>
                                <li><strong>Sodium:</strong> {sodium ?? 'N/A'} mg</li>
                            </ul>
                        </div>
                        {hasServingSize && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold">Per 100g</h4>
                                     <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                        <li><strong>Calories:</strong> {per100g(calories)} kcal</li>
                                        <li><strong>Fat:</strong> {per100g(fat)} g</li>
                                        <li><strong>Sugar:</strong> {per100g(sugar)} g</li>
                                        <li><strong>Sodium:</strong> {per100g(sodium)} mg</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
