import {
  type AuthResponse,
  SignInPage,
  type AuthProvider,
} from '@toolpad/core/SignInPage';

// preview-start
const providers = [
  { id: 'github', name: 'GitHub' },
  { id: 'google', name: 'Google' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'twitter', name: 'Twitter' },
  { id: 'linkedin', name: 'LinkedIn' },
];
// preview-end

const signIn: (provider: AuthProvider) => void | Promise<AuthResponse> = async (
  provider,
) => {
  // preview-start
  const promise = new Promise<AuthResponse>((resolve) => {
    setTimeout(() => {
      console.log(`Sign in with ${provider.id}`);
      resolve({ error: 'This is a fake error' });
    }, 500);
  });
  // preview-end
  return promise;
};

export function OAuthSignInPage() {
  //const theme = useTheme();
  return (
    // preview-start
      <SignInPage signIn={signIn} providers={providers} />
    // preview-end
  );
}
