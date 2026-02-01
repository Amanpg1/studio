import { cn } from "@/lib/utils";

export function GoogleIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <title>Google</title>
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.54-.88 2.48-1.76 3.36-.92.88-2.36 1.76-4.08 1.76-3.4 0-6.16-2.84-6.16-6.36s2.76-6.36 6.16-6.36c1.8 0 3.04.72 3.96 1.64L21.28 4.4c-1.8-1.68-4.2-2.76-7.2-2.76-5.96 0-10.8 4.84-10.8 10.8s4.84 10.8 10.8 10.8c6.48 0 10.32-4.48 10.32-10.44 0-.76-.08-1.24-.16-1.72l-10.24.04z"
        fill="currentColor"
      />
    </svg>
  );
}
