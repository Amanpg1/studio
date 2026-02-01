'use server';

import { z } from 'zod';
import { getPersonalizedFoodRecommendations } from '@/ai/flows/personalized-food-recommendations';
import { ScanFormSchema } from '@/lib/schemas';
import { addDoc, collection, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { UserProfile, Scan, ScanInput } from '@/lib/types';

export async function analyzeAndSaveScan(
  uid: string,
  values: z.infer<typeof ScanFormSchema>
): Promise<string> {
  if (!uid) {
    throw new Error('User not authenticated.');
  }
  const validatedValues = ScanFormSchema.parse(values);

  const userDoc = await getDoc(doc(db, 'users', uid));
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

  try {
    const aiResult = await getPersonalizedFoodRecommendations(aiInput);

    const scanData: Omit<Scan, 'id'> = {
      userId: uid,
      productName: validatedValues.productName,
      input: scanInput,
      result: {
        assessment: aiResult.assessment,
        explanation: aiResult.explanation,
      },
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'scans'), scanData);
    
    revalidatePath('/history');
    revalidatePath('/dashboard');
    
    return docRef.id;

  } catch (error) {
    console.error('Error in AI analysis or saving scan:', error);
    throw new Error('Failed to process food scan.');
  }
}

export async function deleteScan(scanId: string, uid: string) {
    if (!scanId) {
        throw new Error('Scan ID is required.');
    }
    if (!uid) {
        throw new Error("User not authenticated.");
    }
    
    const scanDocRef = doc(db, 'scans', scanId);
    const scanDoc = await getDoc(scanDocRef);

    if (!scanDoc.exists() || scanDoc.data().userId !== uid) {
        throw new Error("Scan not found or you don't have permission to delete it.");
    }

    try {
        await deleteDoc(scanDocRef);
        revalidatePath('/history');
        revalidatePath('/dashboard');
    } catch (error) {
        console.error('Error deleting scan:', error);
        throw new Error('Could not delete scan history item.');
    }
}
