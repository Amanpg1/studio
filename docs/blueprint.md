# **App Name**: FoodWise AI

## Core Features:

- User Authentication and Profile Management: Secure user authentication via email/password and Google Sign-In. Manage user profiles including name, health conditions, and preferences.
- Health Profile Setup: Users can select and manage their health conditions (diabetes, high BP, allergies, etc.) and weight goals. This data drives personalized recommendations.
- Food Label Scanning via OCR: Utilize the device camera and OCR technology to extract ingredients and nutrition information from food labels.
- AI-Powered Food Safety Assessment: Leverage AI to evaluate food safety based on ingredients, nutritional values, and the user's health conditions, using configurable nutritional threshold rules.
- Personalized Food Recommendation Engine: The AI food safety engine will evaluate: Ingredients vs health conditions, nutritional thresholds, allergens, outputting categories as Safe to Eat / Consume in Moderation / Not Safe and provide tool to help explain the reasoning.
- Food Scan History: Maintain a history of scanned foods with their assessment results, allowing users to review past scans. Ability to delete items from history.
- Data Storage: All user data, including health profiles and scan history, is stored securely in Firestore.

## Style Guidelines:

- Primary color: Forest green (#228B22) to convey health, nature, and safety.
- Background color: Off-white (#F8F8FF) for a clean, modern, and easily readable interface.
- Accent color: Light orange (#FFA500) to highlight important elements and calls to action.
- Body and headline font: 'Roboto', a sans-serif font for a clear and accessible reading experience.
- Simple, intuitive icons to represent food categories, health conditions, and safety ratings.
- Clean and organized layout with a focus on ease of navigation and information hierarchy.
- Subtle animations and transitions to provide feedback and enhance user experience.