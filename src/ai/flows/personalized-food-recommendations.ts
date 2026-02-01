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
- ingredients: The full list of ingredients as a single string.
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
  gender: z.enum(['male', 'female', 'prefer not to say']).optional().describe('The gender of the user.'),
  currentWeight: z.number().optional().describe('The current weight of the user in kilograms.'),
});

const NutritionInformationSchema = z.object({
  calories: z.number().describe('The amount of calories in the food item'),
  fat: z.number().describe('The amount of fat in the food item'),
  sugar: z.number().describe('The amount of sugar in the food item'),
  sodium: z.number().describe('The amount of sodium in the food item'),
  ingredients: z
    .string()
    .describe('The full string of ingredients in the food item.'),
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
  productSummary: z.string().describe('A brief, neutral summary of what the food product is.'),
  nutritionalAnalysis: z.string().describe("A detailed analysis of the product's nutritional content in relation to the user's weight goals, gender, and weight."),
  assessment: FoodSafetyAssessmentSchema.describe(
    'The overall safety assessment of the food, based on health conditions and allergies.'
  ),
  explanation: z
    .string()
    .describe('The explanation for the safety assessment, focusing on specific ingredients or health risks.'),
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
  prompt: `You are an AI assistant that provides personalized food recommendations based on a user's health profile and food scan data.

  **User Profile:**
  - Gender: {{userProfile.gender}}
  - Current Weight: {{userProfile.currentWeight}} kg
  - Weight Goals: {{userProfile.weightGoals}}
  - Health Conditions: {{#if userProfile.healthConditions}}{{#each userProfile.healthConditions}}- {{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified{{/if}}
  - Detailed Health Problems: {{userProfile.detailedHealthConditions}}

  **Food Scan Data:**
  - Raw OCR Text: {{foodScanData.foodLabelData}}
  - Structured Nutrition Information:
    - Calories: {{foodScanData.nutritionInformation.calories}}
    - Fat: {{foodScanData.nutritionInformation.fat}}g
    - Sugar: {{foodScanData.nutritionInformation.sugar}}g
    - Sodium: {{foodScanData.nutritionInformation.sodium}}mg
    - Ingredients: {{foodScanData.nutritionInformation.ingredients}}

  **Your Task (in 3 parts):**

  1.  **Product Summary:**
      - Briefly describe what the food product is in a neutral, objective tone. (e.g., "This is a sweetened, multi-grain breakfast cereal.")

  2.  **Nutritional Analysis:**
      - Analyze the nutritional information (calories, fat, sugar, sodium) in the context of the user's **weight goals, gender, and current weight**.
      - Provide insights on whether the food supports their goals. For example, if they want to lose weight, is it high in calories?

  3.  **Safety Assessment & Explanation:**
      - Based **only** on the user's **Health Conditions** and **Detailed Health Problems**, determine if the food is "Safe to Eat", "Consume in Moderation", or "Not Safe".
      - Pay close attention to specific ingredients in relation to allergies, diabetes (sugar content), high blood pressure (sodium), etc.
      - Provide a clear explanation for your assessment, pointing out the specific ingredients or nutritional factors that pose a risk.

  **CRITICAL:** The safety assessment must be based on health risks, not on whether it aligns with weight goals. A high-calorie food might be "Safe to Eat" for someone with no allergies, even if it's not good for weight loss.

  Strictly adhere to the output schema.
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
