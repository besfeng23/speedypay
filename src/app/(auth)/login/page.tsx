"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Icons.logo className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">
            Authentication Required
          </CardTitle>
          <CardDescription className="text-center">
            This is a protected application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Demo Mode Active</AlertTitle>
              <AlertDescription>
                This application is running in a demo mode with a mock user. No login is required.
              </AlertDescription>
            </Alert>
          <Button asChild className="w-full">
            <Link href="/dashboard">Proceed to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
