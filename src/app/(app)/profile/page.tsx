'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { ProfileFormSchema, type ProfileFormValues } from '@/lib/schemas';
import { ALL_HEALTH_CONDITIONS, ALL_WEIGHT_GOALS, HealthCondition } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { updateUserProfile } from '@/app/actions/profile';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: '',
      healthConditions: [],
      weightGoals: 'maintain weight',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        healthConditions: user.healthConditions || [],
        weightGoals: user.weightGoals || 'maintain weight',
      });
    }
  }, [user, form]);
  
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
        toast({
            title: 'Welcome to FoodWise AI!',
            description: 'Please complete your profile to get personalized recommendations.',
        });
    }
  }, [searchParams, toast]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, data);
      toast({
        title: 'Profile Updated',
        description: 'Your health profile has been saved successfully.',
      });
      if (searchParams.get('new') === 'true') {
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update your profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Profile</h2>
        <p className="text-muted-foreground">
          Manage your health information for personalized assessments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Profile</CardTitle>
          <CardDescription>
            This information helps us tailor food assessments to your needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="healthConditions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Health Conditions</FormLabel>
                      <FormDescription>
                        Select any conditions that apply to you.
                      </FormDescription>
                    </div>
                    <div className="space-y-2">
                    {ALL_HEALTH_CONDITIONS.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="healthConditions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== item
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
                                {item.replace('BP', 'Blood Pressure')}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weightGoals"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Weight Goals</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        {ALL_WEIGHT_GOALS.map((goal) => (
                            <FormItem key={goal} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value={goal} />
                                </FormControl>
                                <FormLabel className="font-normal capitalize">{goal}</FormLabel>
                            </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {searchParams.get('new') === 'true' ? 'Save & Continue' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
