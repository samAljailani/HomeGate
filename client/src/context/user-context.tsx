import { createContext, useContext, useState, useEffect, JSX } from 'react';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  login: () => void;
  logout: () => void;
}

export interface UserContextValue {
  user: User | null;
  loading: boolean;
  signIn: (provider: string) => void;
  signOut: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: ({ children }: { children: React.ReactNode }) => JSX.Element = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user data from an API or authentication service
    const fetchUser = async () => {
        const response = await fetch('/api/auth/user');
        if (response.ok){
            const userData: User = await response.json();
            setUser(userData);
            setLoading(false);
        }
    }

    fetchUser();
  }, []);

  const signIn = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  }

  const signOut = async () => {
    //perform logout logic here, for example, revoke authentication token.
    await fetch('api/auth/logout')
    setUser(null);
  }

  return (
    <UserContext value={{ user, loading, signIn, signOut }}>
      {children}
    </UserContext>
  );
};


export const useUser = () => useContext(UserContext);
