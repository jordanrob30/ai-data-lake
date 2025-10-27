import { useState } from 'react';
import { LockKeyhole, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DevUser {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface DevCredentialsWidgetProps {
  onSelectUser: (email: string, password: string) => void;
}

const DEV_USERS: DevUser[] = [
  {
    name: 'Landlord',
    email: 'landlord@example.com',
    password: 'password',
    role: 'landlord',
  },
  {
    name: 'Tenant1 Admin',
    email: 't1admin@example.com',
    password: 'password',
    role: 'tenant-admin',
  },
  {
    name: 'Tenant1 Viewer',
    email: 't1viewer@example.com',
    password: 'password',
    role: 'tenant-viewer',
  },
  {
    name: 'Tenant2 Admin',
    email: 't2admin@example.com',
    password: 'password',
    role: 'tenant-admin',
  },
  {
    name: 'Tenant2 Viewer',
    email: 't2viewer@example.com',
    password: 'password',
    role: 'tenant-viewer',
  },
];

export default function DevCredentialsWidget({ onSelectUser }: DevCredentialsWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleUserSelect = (email: string, password: string) => {
    setIsOpen(false);
    onSelectUser(email, password);
  };

  return (
    <div className="mt-4 relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <LockKeyhole size={14} />
        <span>Dev Login</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
          <div className="space-y-1">
            {DEV_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleUserSelect(user.email, user.password)}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-gray-900">{user.name}</span>
                  <div className="flex gap-2 items-center mt-0.5">
                    <span className="text-xs text-gray-600">{user.email}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                      {user.role}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
