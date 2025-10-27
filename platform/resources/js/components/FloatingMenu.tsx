import { useState, useRef, useEffect } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

export default function FloatingMenu() {
  const { auth } = usePage().props as any;
  const [showSchemasDropdown, setShowSchemasDropdown] = useState(false);
  const [showPagesDropdown, setShowPagesDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const schemasRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    router.post('/logout');
  };

  // Get user initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (schemasRef.current && !schemasRef.current.contains(event.target as Node)) {
        setShowSchemasDropdown(false);
      }
      if (pagesRef.current && !pagesRef.current.contains(event.target as Node)) {
        setShowPagesDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!auth.user) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-full px-4 py-2 flex items-center space-x-3 border border-gray-200">
        {/* Schemas Dropdown */}
        <div className="relative" ref={schemasRef}>
          <button
            onMouseEnter={() => setShowSchemasDropdown(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span>Schemas</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showSchemasDropdown && (
            <div
              onMouseLeave={() => setShowSchemasDropdown(false)}
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            >
              <Link
                href="/schemas"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Manage Schemas
              </Link>
              <Link
                href="/confirmations"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Pending Confirmations
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Pages Dropdown */}
        <div className="relative" ref={pagesRef}>
          <button
            onMouseEnter={() => setShowPagesDropdown(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span>Pages</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPagesDropdown && (
            <div
              onMouseLeave={() => setShowPagesDropdown(false)}
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            >
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </Link>
              {auth.user.roles.includes('landlord') && (
                <Link
                  href="/tenant-management"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Tenant Management
                </Link>
              )}
              <Link
                href="/test-ingestion"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Test Ingestion
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onMouseEnter={() => setShowProfileDropdown(true)}
            className="flex items-center space-x-2 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(auth.user.name)}
            </div>
            <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {auth.user.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {showProfileDropdown && (
            <div
              onMouseLeave={() => setShowProfileDropdown(false)}
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 truncate">{auth.user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
