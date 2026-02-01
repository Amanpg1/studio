'use server';

/**
 * @fileOverview Provides personalized food recommendations and OCR for food labels.
 *
 * - extractFoodInfoFromImage - Extracts structured food information from an image of a food label.
 * - ExtractFoodInfoInput - The input type for the extractFoodInfoFromImage function.
 * - ExtractFoodInfoOutput - The return type for the extractFoodInfoFromImage function.
 * - getPersonalizedFoodRecommendations - A function that generates personalized food recommendations with explanations.
 * - PersonalizedFoodRecommendationsInput - The input type for the getPersonalizedFoodRecommendations function.
 * - PersonalizedFoodRecommendationsOutput - The return type for the getPersonalizedFoodRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractFoodInfoInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a food label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractFoodInfoInput = z.infer<typeof ExtractFoodInfoInputSchema>;

const ExtractFoodInfoOutputSchema = z.object({
  productName: z.string().describe('The name of the food product.'),
  ingredients: z.string().describe('The complete list of ingredients.'),
  calories: z.number().describe('The number of calories per serving.'),
  fat: z.number().describe('The amount of fat in grams (g) per serving.'),
  sugar: z.number().describe('The amount of sugar in grams (g) per serving.'),
  sodium: z
    .number()
    .describe('The amount of sodium in milligrams (mg) per serving.'),
});
export type ExtractFoodInfoOutput = z.infer<typeof ExtractFoodInfoOutputSchema>;

export async function extractFoodInfoFromImage(
  input: ExtractFoodInfoInput
): Promise<ExtractFoodInfoOutput> {
  return extractFoodInfoFlow(input);
}

const extractFoodInfoPrompt = ai.definePrompt({
  name: 'extractFoodInfoPrompt',
  input: {schema: ExtractFoodInfoInputSchema},
  output: {schema: ExtractFoodInfoOutputSchema},
  prompt: `You are an expert at reading food labels. Analyze the provided image of a food nutrition label and extract the following information in the specified JSON format. Be as accurate as possible. If a value is not present, use a sensible default like 0 for numerical values or an empty string for text.

- productName: The name of the product.
- ingredients: The full list of ingredients.
- calories: The number of calories per serving.
- fat: The total fat in grams.
- sugar: The total sugars in grams.
- sodium: The sodium in milligrams.

Image: {{media url=imageDataUri}}`,
});

const extractFoodInfoFlow = ai.defineFlow(
  {
    name: 'extractFoodInfoFlow',
    inputSchema: ExtractFoodInfoInputSchema,
    outputSchema: ExtractFoodInfoOutputSchema,
  },
  async input => {
    const {output} = await extractFoodInfoPrompt(input);
    return output!;
  }
);

const HealthConditionSchema = z.enum([
  'diabetes',
  'high BP',
  'allergies',
  'celiac disease',
  'lactose intolerance',
]);

const UserProfileSchema = z.object({
  healthConditions: z
    .array(HealthConditionSchema)
    .describe('The user selected health conditions'),
  weightGoals: z.string().describe('The user selected weight goals'),
});

const NutritionInformationSchema = z.object({
  calories: z.number().describe('The amount of calories in the food item'),
  fat: z.number().describe('The amount of fat in the food item'),
  sugar: z.number().describe('The amount of sugar in the food item'),
  sodium: z.number().describe('The amount of sodium in the food item'),
  ingredients: z
    .array(z.string())
    .describe('A list of ingredients in the food item'),
});

const FoodScanDataSchema = z.object({
  foodLabelData: z
    .string()
    .describe('The extracted text from the food label via OCR.'),
  nutritionInformation: NutritionInformationSchema.describe(
    'The nutrition information extracted from the food label.'
  ),
});

const PersonalizedFoodRecommendationsInputSchema = z.object({
  userProfile: UserProfileSchema.describe(
    'The user profile including health conditions and weight goals.'
  ),
  foodScanData: FoodScanDataSchema.describe(
    'The food scan data including food label data and nutrition information.'
  ),
});
export type PersonalizedFoodRecommendationsInput = z.infer<
  typeof PersonalizedFoodRecommendationsInputSchema
>;

const FoodSafetyAssessmentSchema = z.enum([
  'Safe to Eat',
  'Consume in Moderation',
  'Not Safe',
]);

const PersonalizedFoodRecommendationsOutputSchema = z.object({
  assessment: FoodSafetyAssessmentSchema.describe(
    'The overall safety assessment of the food.'
  ),
  explanation: z
    .string()
    .describe('The explanation for the safety assessment.'),
});

export type PersonalizedFoodRecommendationsOutput = z.infer<
  typeof PersonalizedFoodRecommendationsOutputSchema
>;

export async function getPersonalizedFoodRecommendations(
  input: PersonalizedFoodRecommendationsInput
): Promise<PersonalizedFoodRecommendationsOutput> {
  return personalizedFoodRecommendationsFlow(input);
}

const personalizedFoodRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedFoodRecommendationsPrompt',
  input: {schema: PersonalizedFoodRecommendationsInputSchema},
  output: {schema: PersonalizedFoodRecommendationsOutputSchema},
  prompt: `You are an AI assistant that provides personalized food recommendations based on a user's health conditions and food scan data.

  User Profile:
  Health Conditions: {{userProfile.healthConditions}}
  Weight Goals: {{userProfile.weightGoals}}

  Food Scan Data:
  Food Label Data: {{foodScanData.foodLabelData}}
  Nutrition Information: {{foodScanData.nutritionInformation}}

  Based on the user's health conditions and the food scan data, assess the food's safety and provide an explanation for the assessment.
  The assessment should be one of the following: "Safe to Eat", "Consume in Moderation", or "Not Safe".
  The explanation should outline the specific ingredients or nutritional values that triggered the assessment.

  Example 1:
  User Profile:
  Health Conditions: ["diabetes"]
  Weight Goals: "lose weight"
  Food Scan Data:
  Food Label Data: "Ingredients: High Fructose Corn Syrup, Enriched Flour, Sugar, ..."
  Nutrition Information: {calories: 200, fat: 5, sugar: 20, sodium: 100}
  Output:
  {assessment: "Consume in Moderation", explanation: "This food is high in sugar, which may not be suitable for people with diabetes.  It is also high in calories and may hinder your weight loss goals."}

  Example 2:
  User Profile:
  Health Conditions: ["allergies"]
  Weight Goals: "maintain weight"
  Food Scan Data:
  Food Label Data: "Ingredients: Milk, Eggs, Wheat, ..."
  Nutrition Information: {calories: 150, fat: 3, sugar: 10, sodium: 50}
  Output:
  {assessment: "Not Safe", explanation: "This food contains milk, eggs, and wheat, which are common allergens. It is not safe for people with allergies."}

  Example 3:
  User Profile:
  Health Conditions: []
  Weight Goals: "gain weight"
  Food Scan Data:
  Food Label Data: "Ingredients: Chicken, Rice, Vegetables, ..."
  Nutrition Information: {calories: 300, fat: 10, sugar: 5, sodium: 150}
  Output:
  {assessment: "Safe to Eat", explanation: "This food appears to be safe to eat. It contains a balanced combination of nutrients and is not high in sugar or sodium."}

  Output:
  `,
});

const personalizedFoodRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedFoodRecommendationsFlow',
    inputSchema: PersonalizedFoodRecommendationsInputSchema,
    outputSchema: PersonalizedFoodRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedFoodRecommendationsPrompt(input);
    return output!;
  }
);
