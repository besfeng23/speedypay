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

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Icons.logo className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">
            Authentication Disabled
          </CardTitle>
          <CardDescription className="text-center">
            This application does not require a login.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-sm text-muted-foreground">
                You can proceed directly to the application dashboard.
            </div>
          <Button asChild className="w-full mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
