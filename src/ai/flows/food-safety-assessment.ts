'use server';

/**
 * @fileOverview Analyzes food labels and determines safety based on user health conditions.
 *
 * - assessFoodSafety - Analyzes food safety based on ingredients, nutritional values, and user's health conditions.
 * - FoodSafetyInput - The input type for the assessFoodSafety function.
 * - FoodSafetyOutput - The return type for the assessFoodSafety function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthConditionSchema = z.enum([
  'diabetes',
  'high BP',
  'allergies',
  'none',
]);

const FoodSafetyInputSchema = z.object({
  ingredients: z
    .string()
    .describe('List of ingredients extracted from the food label.'),
  nutritionFacts: z
    .string()
    .describe('Nutritional information from the food label.'),
  healthConditions: z
    .array(HealthConditionSchema)
    .describe('User-specified health conditions.'),
});
export type FoodSafetyInput = z.infer<typeof FoodSafetyInputSchema>;

const FoodSafetyOutputSchema = z.object({
  safetyAssessment: z
    .enum(['Safe to Eat', 'Consume in Moderation', 'Not Safe'])
    .describe('Overall safety assessment of the food.'),
  reasoning: z
    .string()
    .describe('Explanation of why the food received the given assessment.'),
});
export type FoodSafetyOutput = z.infer<typeof FoodSafetyOutputSchema>;

export async function assessFoodSafety(
  input: FoodSafetyInput
): Promise<FoodSafetyOutput> {
  return foodSafetyAssessmentFlow(input);
}

const foodSafetyAssessmentPrompt = ai.definePrompt({
  name: 'foodSafetyAssessmentPrompt',
  input: {schema: FoodSafetyInputSchema},
  output: {schema: FoodSafetyOutputSchema},
  prompt: `You are an AI assistant that analyzes food labels and assesses their safety for users with specific health conditions.

  Analyze the following food label information and ingredients in the context of the user's health conditions:

  Ingredients: {{{ingredients}}}
  Nutrition Facts: {{{nutritionFacts}}}
  Health Conditions: {{#each healthConditions}}- {{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Based on this information, determine if the food is:

  - Safe to Eat: No significant risks identified.
  - Consume in Moderation: Potential risks exist; limit consumption.
  - Not Safe: Significant risks identified; avoid consumption.

  Explain your reasoning for the assessment.
  Strictly adhere to the output schema.
  `,
});

const foodSafetyAssessmentFlow = ai.defineFlow(
  {
    name: 'foodSafetyAssessmentFlow',
    inputSchema: FoodSafetyInputSchema,
    outputSchema: FoodSafetyOutputSchema,
  },
  async input => {
    const {output} = await foodSafetyAssessmentPrompt(input);
    return output!;
  }
);
