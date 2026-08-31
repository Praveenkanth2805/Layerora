'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export const Navbar = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Navigation links (public)
  const publicLinks = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Sign In' },
    { href: '/register', label: 'Sign Up' },
  ];

  // Authenticated links
  const privateLinks = [
    { href: '/', label: 'Home' },
    { href: '/designs', label: 'My Designs' },
    { href: '/credits', label: 'Credits' },
  ];

  const links = session ? privateLinks : publicLinks;

  // Admin link if admin
  const adminLink = session?.user?.isAdmin ? { href: '/admin', label: 'Admin' } : null;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo / Brand */}
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Layerora
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-blue-600 transition ${
                pathname === link.href ? 'text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {adminLink && (
            <Link
              href={adminLink.href}
              className={`hover:text-blue-600 transition ${
                pathname === adminLink.href ? 'text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              {adminLink.label}
            </Link>
          )}

          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block hover:text-blue-600 transition ${
                pathname === link.href ? 'text-blue-600 font-semibold' : 'text-gray-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {adminLink && (
            <Link
              href={adminLink.href}
              className={`block hover:text-blue-600 transition ${
                pathname === adminLink.href ? 'text-blue-600 font-semibold' : 'text-gray-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {adminLink.label}
            </Link>
          )}

          {session ? (
            <>
              <div className="text-sm text-gray-600">{session.user?.email}</div>
              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              <Link
                href="/login"
                className="block text-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="block text-center px-3 py-1 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};