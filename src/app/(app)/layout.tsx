'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { FullScreenLoader } from '@/components/loader';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import {
  Bell,
  History,
  LayoutDashboard,
  LogOut,
  ScanLine,
  User,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'New Scan', icon: ScanLine },
  { href: '/history', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user: firebaseUser, isUserLoading: authLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = useMemoFirebase(() => {
    if (!firebaseUser?.uid || !firestore) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firebaseUser, firestore]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // This effect handles all redirection logic.
    if (authLoading) return; // Wait until auth state is known

    if (!firebaseUser) {
      // If no user, redirect to login.
      router.replace(`/login?redirectedFrom=${pathname}`);
      return;
    }

    if (profileLoading) return; // Wait for profile to load

    if (!userProfile && pathname !== '/profile') {
      // If user exists but profile doesn't, redirect to create one.
      router.replace('/profile?new=true');
    }
  }, [authLoading, firebaseUser, profileLoading, userProfile, pathname, router]);

  // Determine if we should show the main app UI or a loader.
  // We show a loader if:
  // 1. Auth is still loading.
  // 2. We have a user, but their profile is still loading.
  // 3. We have a user but no profile, and we are not on the profile page (a redirect is pending).
  const showLoader = authLoading || (firebaseUser && profileLoading) || (!userProfile && pathname !== '/profile');

  if (showLoader) {
    return <FullScreenLoader />;
  }
  
  const handleSignOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    router.push('/');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="flex flex-col">
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Log Out">
                  <LogOut />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
            <h1 className="text-xl font-semibold">
              {navItems.find((item) => item.href === pathname)?.label || 'NutriScan AI'}
            </h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              {/* Only render UserNav if we have a user profile */}
              {userProfile && <UserNav user={userProfile} onSignOut={handleSignOut} />}
            </div>
          </header>
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
