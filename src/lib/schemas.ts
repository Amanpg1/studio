import { z } from 'zod';
import { ALL_HEALTH_CONDITIONS, ALL_WEIGHT_GOALS, ALL_GENDERS } from './types';

export const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const ProfileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  healthConditions: z.array(z.enum(ALL_HEALTH_CONDITIONS)).optional(),
  detailedHealthConditions: z.string().optional(),
  weightGoals: z.enum(ALL_WEIGHT_GOALS),
  gender: z.enum(ALL_GENDERS).optional(),
  currentWeight: z.coerce.number().positive('Weight must be a positive number.').optional().or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
