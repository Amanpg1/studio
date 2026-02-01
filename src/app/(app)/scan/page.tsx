'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ScanFormSchema, type ScanFormValues } from '@/lib/schemas';
import { getPersonalizedFoodRecommendations, extractFoodInfoFromImage } from '@/ai/flows/personalized-food-recommendations';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Video, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UserProfile, Scan, ScanInput } from '@/lib/types';


export default function ScanPage() {
  const router = useRouter();
  const { user: firebaseUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [scanState, setScanState] = useState<'camera' | 'scanning' | 'form' | 'submitting'>('camera');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    // This effect manages the camera stream based on the scanState.
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };

    if (scanState === 'camera') {
      setHasCameraPermission(null); // Reset permission state on re-entering camera view
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      // Cleanup when component unmounts
      stopCamera();
    };
  }, [scanState, toast]);


  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({ variant: 'destructive', title: 'Camera not ready', description: 'Please wait a moment and try again.' });
      return;
    }
    setScanState('scanning');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imageDataUri = canvas.toDataURL('image/jpeg');

        try {
            const extractedData = await extractFoodInfoFromImage({ imageDataUri });
            form.reset(extractedData);
            setScanState('form');
        } catch(error) {
            console.error('OCR Failed:', error);
            toast({
                variant: 'destructive',
                title: 'Scan Failed',
                description: 'Could not extract information from the label. Please try again with a clearer image.',
            });
            setScanState('camera'); // Go back to camera view
        }
    }
  };
  
  const onSubmit = async (data: ScanFormValues) => {
    if (!firebaseUser || !firestore) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    setScanState('submitting');

    const scansCollectionRef = collection(firestore, 'users', firebaseUser.uid, 'foodScans');
    let scanDataForError: any;

    try {
      const validatedValues = ScanFormSchema.parse(data);

      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please complete your profile.');
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
      scanDataForError = scanData;


      const docRef = await addDoc(scansCollectionRef, scanData);
      
      const newScanId = docRef.id;
      toast({ title: 'Analysis Complete!', description: 'Redirecting to results...' });
      router.push(`/scan/${newScanId}`);
    } catch (error: any) {
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: scansCollectionRef.path,
          operation: 'create',
          requestResourceData: scanDataForError,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error.message || 'Could not analyze the food item. Please try again.',
      });
      setScanState('form');
    }
  };

  const renderContent = () => {
    switch (scanState) {
      case 'camera':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Scan Food Label</CardTitle>
              <CardDescription>Position the food label within the frame and capture.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full max-w-md aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <Video className="h-12 w-12 text-destructive mb-4" />
                        <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>
                            Please allow camera access in your browser to use this feature.
                          </AlertDescription>
                        </Alert>
                    </div>
                )}
                 {hasCameraPermission === null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-white">Starting camera...</p>
                    </div>
                )}
              </div>
              <Button size="lg" onClick={handleCapture} disabled={!hasCameraPermission}>
                <Camera className="mr-2 h-5 w-5" />
                Capture Label
              </Button>
            </CardContent>
          </Card>
        );

      case 'scanning':
        return (
          <Card className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Reading label information...</p>
          </Card>
        );

      case 'form':
        return (
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
                            <FormLabel className="capitalize">{nutrient} {nutrient === 'calories' ? '(kcal)' : (nutrient === 'sodium' ? '(mg)' : '(g)')}</FormLabel>
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
                      <Button variant="outline" type="button" onClick={() => setScanState('camera')}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Scan Again
                      </Button>
                      <Button type="submit">Analyze Food</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        );

      case 'submitting':
        return (
          <Card className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Running AI analysis... this may take a moment.</p>
          </Card>
        );
      
      default:
        return null;
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scan a Food Label</h2>
        <p className="text-muted-foreground">
          Use your camera to get a personalized assessment of a food product.
        </p>
      </div>

      {renderContent()}

    </div>
  );
}
