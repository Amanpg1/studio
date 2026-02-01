'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Camera, HeartPulse, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Autoplay from 'embla-carousel-autoplay';

export default function LandingPage() {
  const plugin = React.useRef(Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: true }));
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-1');
  const carouselImages = PlaceHolderImages.filter((img) => img.id.startsWith('carousel-'));

  const features = [
    {
      icon: <Camera className="h-10 w-10 text-primary" />,
      title: 'Scan with Ease',
      description: 'Use your phone’s camera to instantly scan food labels. Our OCR technology extracts ingredients and nutritional facts in seconds.',
    },
    {
      icon: <HeartPulse className="h-10 w-10 text-primary" />,
      title: 'Personalized Insights',
      description: 'Create your health profile with conditions like diabetes or allergies. Get food assessments tailored just for you.',
    },
    {
      icon: <History className="h-10 w-10 text-primary" />,
      title: 'Track Your History',
      description: 'Keep a log of all your scanned items. Easily review past assessments and make informed choices every day.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Eat Smarter. Live Healthier.
              </h1>
              <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
                NutriScan AI helps you understand what's in your food. Scan labels, get AI-powered safety assessments, and make choices that fit your health goals.
              </p>
              <div className="flex gap-4">
                <Button asChild size="lg">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-2xl md:h-96">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
              )}
            </div>
          </div>
        </section>

        {/* Carousel Section */}
        <section className="container pb-8 md:pb-12 lg:pb-16">
          <Carousel
            className="w-full max-w-4xl mx-auto"
            plugins={[plugin.current]}
            opts={{
              align: 'start',
              loop: true,
            }}
          >
            <CarouselContent>
              {carouselImages.map((image) => (
                <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card>
                      <CardContent className="relative flex aspect-video items-center justify-center p-0 overflow-hidden rounded-lg">
                        <Image
                          src={image.imageUrl}
                          alt={image.description}
                          fill
                          style={{ objectFit: 'cover' }}
                          data-ai-hint={image.imageHint}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                          <p className="text-white text-sm">{image.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* Features Section */}
        <section id="features" className="container space-y-6 bg-secondary py-8 md:py-12 lg:py-16">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-headline text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-4xl">
              Features
            </h2>
            <p className="max-w-[85%] text-muted-foreground md:text-xl">
              Everything you need to make informed decisions about your food.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-col items-center text-center">
                  {feature.icon}
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by NutriScan AI. Your guide to healthier eating.
          </p>
        </div>
      </footer>
    </div>
  );
}
