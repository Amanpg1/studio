'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser, useFirestore } from '@/firebase';
import { ScanFormSchema, type ScanFormValues } from '@/lib/schemas';
import { getPersonalizedFoodRecommendations } from '@/ai/flows/personalized-food-recommendations';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import type { UserProfile, Scan, ScanInput } from '@/lib/types';


// Dummy data to simulate OCR result
const DUMMY_OCR_DATA: ScanFormValues = {
  productName: 'Crunchy Oats Cereal',
  ingredients: 'Whole Grain Oats, Sugar, Corn Starch, Honey, Brown Sugar Syrup, Salt, Tripotassium Phosphate, Canola Oil, Natural Almond Flavor. Vitamin E (mixed tocopherols) Added to Preserve Freshness.',
  calories: 140,
  fat: 2.5,
  sugar: 12,
  sodium: 180,
};

export default function ScanPage() {
  const router = useRouter();
  const { user: firebaseUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'form' | 'submitting'>('idle');

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(ScanFormSchema),
    defaultValues: {
      productName: '',
      ingredients: '',
      calories: 0,
      fat: 0,
      sugar: 0,
      sodium: 0,
    },
  });

  const handleStartScan = () => {
    setScanState('scanning');
    // Simulate camera/OCR processing time
    setTimeout(() => {
      form.reset(DUMMY_OCR_DATA);
      setScanState('form');
    }, 1500);
  };
  
  const onSubmit = async (data: ScanFormValues) => {
    if (!firebaseUser || !firestore) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    setScanState('submitting');
    try {
      const validatedValues = ScanFormSchema.parse(data);

      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found.');
      }
      const userProfile = userDoc.data() as UserProfile;

      const scanInput: ScanInput = {
        productName: validatedValues.productName,
        ingredients: validatedValues.ingredients,
        nutrition: {
          calories: validatedValues.calories,
          fat: validatedValues.fat,
          sugar: validatedValues.sugar,
          sodium: validatedValues.sodium,
        },
      };

      const aiInput = {
        userProfile: {
          healthConditions: userProfile.healthConditions,
          weightGoals: userProfile.weightGoals,
        },
        foodScanData: {
          foodLabelData: `Product: ${validatedValues.productName}. Ingredients: ${validatedValues.ingredients}`,
          nutritionInformation: {
            calories: validatedValues.calories,
            fat: validatedValues.fat,
            sugar: validatedValues.sugar,
            sodium: validatedValues.sodium,
            ingredients: validatedValues.ingredients.split(',').map(s => s.trim()),
          },
        },
      };

      const aiResult = await getPersonalizedFoodRecommendations(aiInput);

      const scanData: Omit<Scan, 'id'> = {
        userId: firebaseUser.uid,
        productName: validatedValues.productName,
        input: scanInput,
        result: {
          assessment: aiResult.assessment,
          explanation: aiResult.explanation,
        },
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(firestore, 'scans'), scanData);
      
      const newScanId = docRef.id;
      toast({ title: 'Analysis Complete!', description: 'Redirecting to results...' });
      router.push(`/scan/${newScanId}`);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the food item. Please try again.',
      });
      setScanState('form');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scan a Food Label</h2>
        <p className="text-muted-foreground">
          Upload an image of a food label to get your personalized assessment.
        </p>
      </div>

      {scanState === 'idle' && (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Ready to Scan?</CardTitle>
                <CardDescription>Click the button below to start.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button size="lg" onClick={handleStartScan}>
                    <Camera className="mr-2 h-5 w-5" />
                    Scan Food Label
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">
                    (This will simulate a scan with dummy data)
                </p>
            </CardContent>
        </Card>
      )}

      {scanState === 'scanning' && (
        <Card className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Analyzing food label...</p>
        </Card>
      )}

      {scanState === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Information</CardTitle>
            <CardDescription>
              Our AI has extracted the following details. Please review and correct if necessary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ingredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingredients</FormLabel>
                      <FormControl>
                        <Textarea rows={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {(['calories', 'fat', 'sugar', 'sodium'] as const).map((nutrient) => (
                    <FormField
                      key={nutrient}
                      control={form.control}
                      name={nutrient}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{nutrient} {nutrient === 'calories' ? '(kcal)' : '(g)'}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setScanState('idle')}>Cancel</Button>
                    <Button type="submit">Analyze Food</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {scanState === 'submitting' && (
        <Card className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Running AI analysis... this may take a moment.</p>
        </Card>
      )}

    </div>
  );
}
