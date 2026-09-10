'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export const Navbar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const publicLinks = [
    { href: '/', label: 'Home' },
    { href: '/watermark-remover', label: 'Watermark Remover' },
    { href: '/layer-split', label: 'Layer Split' },
  ];

  const privateLinks = [
    { href: '/', label: 'Home' },
    { href: '/watermark-remover', label: 'Watermark Remover' },
    { href: '/layer-split', label: 'Layer Split' },
    { href: '/designs', label: 'My Designs' },
    { href: '/credits', label: 'Credits' },
  ];

  const links = session ? privateLinks : publicLinks;

  const adminLink = session?.user?.isAdmin
    ? { href: '/admin', label: 'Admin' }
    : null;

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="text-2xl font-bold text-blue-600"
          onClick={() => setIsMenuOpen(false)}
        >
          Layerora
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition hover:text-blue-600 ${
                pathname === link.href
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {adminLink && (
            <Link
              href={adminLink.href}
              className={`transition hover:text-blue-600 ${
                pathname === adminLink.href
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              {adminLink.label}
            </Link>
          )}

          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {session.user?.email}
              </span>

              <button
                onClick={() => signOut()}
                className="rounded bg-red-500 px-3 py-1 text-white transition hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* <Link
                href="/login"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Sign In / Sign Up
              </Link> */}
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="space-y-2 border-t bg-white px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block transition hover:text-blue-600 ${
                pathname === link.href
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {adminLink && (
            <Link
              href={adminLink.href}
              className={`block transition hover:text-blue-600 ${
                pathname === adminLink.href
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {adminLink.label}
            </Link>
          )}

          {session ? (
            <>
              <div className="pt-2 text-sm text-gray-600">
                {session.user?.email}
              </div>

              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full rounded bg-red-500 px-2 py-1 text-left text-white transition hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              {/* <Link
                href="/login"
                className="block rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In / Sign Up
              </Link> */}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};