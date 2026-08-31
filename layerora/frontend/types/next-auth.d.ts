import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
    };
    accessToken: string;
  }
  interface User {
    id: string;
    isAdmin: boolean;
    accessToken: string;
  }
}