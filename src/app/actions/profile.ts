'use server';

import { doc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { ProfileFormSchema, type ProfileFormValues } from '@/lib/schemas';

export async function updateUserProfile(uid: string, data: ProfileFormValues) {
  const validatedData = ProfileFormSchema.parse(data);

  if (!uid) {
    throw new Error('User is not authenticated.');
  }

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, validatedData, { merge: true });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Could not update profile in database.');
  }
}
