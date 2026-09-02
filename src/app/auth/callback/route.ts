import { NextResponse } from 'next/server';

// Legacy callback route - redirects to new magic link verification endpoint
// Kept for backward compatibility with any in-transit emails
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const redirectTo = searchParams.get('redirectTo') || '/portal';

  if (token) {
    // Redirect to the new verify-magic-link endpoint
    return NextResponse.redirect(
      `${origin}/api/auth/verify-magic-link?token=${token}&redirectTo=${encodeURIComponent(redirectTo)}`
    );
  }

  // No token - redirect to login
  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
