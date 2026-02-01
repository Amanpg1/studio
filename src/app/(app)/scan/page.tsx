'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { getPersonalizedFoodRecommendations, extractFoodInfoFromImage } from '@/ai/flows/personalized-food-recommendations';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Video } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UserProfile, Scan, ScanInput } from '@/lib/types';


export default function ScanPage() {
  const router = useRouter();
  const { user: firebaseUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [scanState, setScanState] = useState<'camera' | 'analyzing'>('camera');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // This effect manages the camera stream based on the scanState.
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
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
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      // Cleanup when component unmounts
      stopCamera();
    };
  }, [scanState, toast]);


  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({ variant: 'destructive', title: 'Camera not ready', description: 'Please wait a moment and try again.' });
      return;
    }
     if (!firebaseUser || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in to perform a scan.' });
      return;
    }
    setScanState('analyzing');

    setAnalysisMessage('Capturing image...');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not get canvas context.' });
        setScanState('camera');
        return;
    }
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const imageDataUri = canvas.toDataURL('image/jpeg');

    const scansCollectionRef = collection(firestore, 'users', firebaseUser.uid, 'foodScans');

    try {
      setAnalysisMessage('Captured! Reading food label with AI...');
      const extractedData = await extractFoodInfoFromImage({ imageDataUri });

      if (!extractedData.productName || !extractedData.ingredients) {
        throw new Error('Could not read the product name or ingredients from the label. Please try again with a clearer image.');
      }

      setAnalysisMessage('Analyzing against your health profile...');
      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please complete your profile first.');
      }
      const userProfile = userDoc.data() as UserProfile;

      const scanInput: ScanInput = {
        productName: extractedData.productName,
        ingredients: extractedData.ingredients,
        nutrition: {
          servingSizeGrams: extractedData.servingSizeGrams,
          calories: extractedData.calories,
          fat: extractedData.fat,
          sugar: extractedData.sugar,
          sodium: extractedData.sodium,
        },
      };

      const nutritionString = `Calories: ${extractedData.calories}, Fat: ${extractedData.fat}g, Sugar: ${extractedData.sugar}g, Sodium: ${extractedData.sodium}mg`;
      const foodLabelData = `Product Name: ${extractedData.productName}. Ingredients: ${extractedData.ingredients}. Nutrition: ${nutritionString}`;

      const aiInput = {
        userProfile: {
          healthConditions: userProfile.healthConditions || [],
          detailedHealthConditions: userProfile.detailedHealthConditions || '',
          weightGoals: userProfile.weightGoals,
        },
        foodScanData: {
          foodLabelData: foodLabelData, // Pass a comprehensive string
          nutritionInformation: {
            calories: extractedData.calories,
            fat: extractedData.fat,
            sugar: extractedData.sugar,
            sodium: extractedData.sodium,
            ingredients: extractedData.ingredients, // Pass the raw string
          },
        },
      };

      const aiResult = await getPersonalizedFoodRecommendations(aiInput);

      setAnalysisMessage('Finalizing and saving your scan...');
      const scanData: Omit<Scan, 'id'> = {
        userId: firebaseUser.uid,
        productName: extractedData.productName,
        input: scanInput,
        result: {
          assessment: aiResult.assessment,
          explanation: aiResult.explanation,
        },
        createdAt: new Date(),
      };


      const docRef = await addDoc(scansCollectionRef, scanData);
      
      toast({ title: 'Analysis Complete!', description: 'Redirecting to results...' });
      router.push(`/scan/${docRef.id}`);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        let userMessage = error.message || 'Could not analyze the food item. Please try again.';

        if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
            userMessage = 'You do not have permission to save scans. Please try again or contact support.';
        } else if (error.message.includes('Could not read the product name or ingredients')) {
            userMessage = 'Could not read the label clearly. Please try again with a clearer, well-lit image.';
        }
        
        toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: userMessage,
        });
        setScanState('camera');
    }
  };

  const renderContent = () => {
    switch (scanState) {
      case 'camera':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Scan Food Label</CardTitle>
              <CardDescription>Position the product's nutrition label and ingredients list clearly inside the frame.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full max-w-md aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                 {/* Scanner Overlay */}
                 <div className="absolute inset-2 pointer-events-none">
                    <div className="w-full h-full border-2 border-dashed border-primary/70 rounded-md" />
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-md"></div>
                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-md"></div>
                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-md"></div>
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-md"></div>
                </div>

                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/70">
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
              <Button size="lg" onClick={handleCaptureAndAnalyze} disabled={!hasCameraPermission || hasCameraPermission === null}>
                <Camera className="mr-2 h-5 w-5" />
                Scan & Analyze
              </Button>
            </CardContent>
          </Card>
        );

      case 'analyzing':
        return (
          <Card className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Analyzing...</p>
            <p className="text-sm text-muted-foreground">{analysisMessage}</p>
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
          Use your camera to get an automatic, personalized assessment of a food product.
        </p>
      </div>

      {renderContent()}

    </div>
  );
}
