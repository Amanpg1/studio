import type { Timestamp } from 'firebase/firestore';

export type HealthCondition =
  | 'diabetes'
  | 'high BP'
  | 'allergies'
  | 'celiac disease'
  | 'lactose intolerance';

export const ALL_HEALTH_CONDITIONS: HealthCondition[] = [
  'diabetes',
  'high BP',
  'allergies',
  'celiac disease',
  'lactose intolerance',
];

export type WeightGoal = 'lose weight' | 'maintain weight' | 'gain weight';
export const ALL_WEIGHT_GOALS: WeightGoal[] = [
  'lose weight',
  'maintain weight',
  'gain weight',
];

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  healthConditions: HealthCondition[];
  weightGoals: WeightGoal;
  createdAt: Date | Timestamp;
};

export type ScanResult = {
  assessment: 'Safe to Eat' | 'Consume in Moderation' | 'Not Safe';
  explanation: string;
};

export type ScanInput = {
  productName: string;
  ingredients: string;
  nutrition: {
    calories: number;
    fat: number;
    sugar: number;
    sodium: number;
  };
};

export type Scan = {
  id: string;
  userId: string;
  productName: string;
  imageUrl?: string;
  input: ScanInput;
  result: ScanResult;
  createdAt: Date | Timestamp;
};
