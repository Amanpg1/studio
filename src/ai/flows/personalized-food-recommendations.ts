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
  productName: z.string().describe('The name of the food product, usually the most prominent text on the packaging.'),
  ingredients: z.string().describe("The complete list of ingredients, often labeled as 'Ingredients:'."),
  servingSizeGrams: z.number().optional().describe('The serving size in grams (g), if available.'),
  calories: z.number().describe('The number of calories per serving, found in the nutrition facts table.'),
  fat: z.number().describe('The amount of fat in grams (g) per serving, found in the nutrition facts table.'),
  sugar: z.number().describe('The amount of sugar in grams (g) per serving, found in the nutrition facts table.'),
  sodium: z
    .number()
    .describe('The amount of sodium in milligrams (mg) per serving, found in the nutrition facts table.'),
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
  prompt: `You are an expert at reading food packaging and labels. Your task is to analyze the provided image and extract key information with the highest accuracy possible. The image might contain a nutrition facts panel, an ingredients list, or both.

Extract the following details:
- productName: The name of the product.
- ingredients: The full list of ingredients.
- servingSizeGrams: The serving size in grams (g). If it's in another unit like 'ml' or 'pieces', try to find a gram equivalent if listed (e.g., "1 cup (227g)"). If not available, leave it out.
- calories: The number of calories per serving.
- fat: The total fat in grams (g) per serving.
- sugar: The total sugars in grams (g) per serving.
- sodium: The sodium in milligrams (mg) per serving.

If a value is not present, use a sensible default like 0 for numerical values or an empty string for text. Carefully examine the entire image to find all the required pieces of information.

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
  detailedHealthConditions: z
    .string()
    .optional()
    .describe("A detailed description of the user's personal health problems."),
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
  Detailed Health Problems: {{userProfile.detailedHealthConditions}}
  Weight Goals: {{userProfile.weightGoals}}

  Carefully consider the user's "Detailed Health Problems" when making your assessment. This provides critical context beyond the standard health conditions.

  Food Scan Data:
  Food Label Data: {{foodScanData.foodLabelData}}
  Nutrition Information: {{foodScanData.nutritionInformation}}

  Based on the user's health conditions and the food scan data, assess the food's safety and provide an explanation for the assessment.
  The assessment should be one of the following: "Safe to Eat", "Consume in Moderation", or "Not Safe".
  The explanation should outline the specific ingredients or nutritional values that triggered the assessment, paying close attention to the detailed health problems.

  Example 1:
  User Profile:
  Health Conditions: ["diabetes"]
  Detailed Health Problems: "I am trying to avoid all forms of added sugar and I am sensitive to gluten."
  Weight Goals: "lose weight"
  Food Scan Data:
  Food Label Data: "Ingredients: High Fructose Corn Syrup, Enriched Flour, Sugar, ..."
  Nutrition Information: {calories: 200, fat: 5, sugar: 20, sodium: 100}
  Output:
  {assessment: "Not Safe", explanation: "This food is high in sugar, which is not suitable for people with diabetes. It also contains High Fructose Corn Syrup and Enriched Flour (gluten), which you are trying to avoid based on your detailed health problems."}

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
