import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Redirect to the dashboard immediately, bypassing the login form.
  redirect('/dashboard');
}
