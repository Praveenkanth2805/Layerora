'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useUIStore } from '@/lib/stores/ui';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  active: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  active: boolean;
}

interface Payment {
  id: string;
  userEmail: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface AIUsage {
  totalJobs: number;
  avgTime: number;
  failures: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'users' | 'credits' | 'payments' | 'ai-usage' | 'config'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aiUsage, setAIUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    // Assume user.isAdmin is stored in session
    if (!session.user.isAdmin) {
      router.push('/');
      return;
    }
    setIsAdmin(true);
  }, [session, status, router]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'users') {
          const data = await api.get('/admin/users');
          setUsers(data);
        } else if (activeTab === 'credits') {
          const data = await api.get('/admin/credit-packages');
          setPackages(data);
        } else if (activeTab === 'payments') {
          const data = await api.get('/admin/payments');
          setPayments(data);
        } else if (activeTab === 'ai-usage') {
          const data = await api.get('/admin/ai-usage');
          setAIUsage(data);
        }
      } catch (error) {
        showToast('Failed to fetch data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, isAdmin, showToast]);

  // Handlers
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, active: !currentStatus } : u));
      showToast('User status updated', 'success');
    } catch {
      showToast('Failed to update user', 'error');
    }
  };

  const createPackage = async (pkg: Omit<CreditPackage, 'id'>) => {
    try {
      const newPkg = await api.post('/admin/credit-packages', pkg);
      setPackages([...packages, newPkg]);
      showToast('Package created', 'success');
    } catch {
      showToast('Failed to create package', 'error');
    }
  };

  const togglePackageStatus = async (pkgId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/credit-packages/${pkgId}`, { active: !currentStatus });
      setPackages(packages.map(p => p.id === pkgId ? { ...p, active: !currentStatus } : p));
      showToast('Package updated', 'success');
    } catch {
      showToast('Failed to update package', 'error');
    }
  };

  const updateConfig = async (config: any) => {
    try {
      await api.patch('/admin/config', config);
      showToast('Configuration updated', 'success');
    } catch {
      showToast('Failed to update config', 'error');
    }
  };

  if (!isAdmin) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - sticky on desktop, drawer on mobile */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block sticky top-0 h-screen">
        <div className="p-4">
          <h1 className="text-xl font-bold text-blue-600">Layerora Admin</h1>
        </div>
        <nav className="mt-4">
          {[
            { key: 'users', label: 'Users', icon: '👥' },
            { key: 'credits', label: 'Credits', icon: '💳' },
            { key: 'payments', label: 'Payments', icon: '💰' },
            { key: 'ai-usage', label: 'AI Usage', icon: '🤖' },
            { key: 'config', label: 'Config', icon: '⚙️' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`w-full text-left px-4 py-2 flex items-center space-x-2 hover:bg-gray-100 transition ${
                activeTab === tab.key ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t">
          <button onClick={() => router.push('/')} className="w-full text-left text-gray-600 hover:text-gray-900">
            ← Back to App
          </button>
          <button onClick={() => signOut()} className="w-full text-left text-red-500 hover:text-red-700 mt-2">
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 capitalize">{activeTab.replace('-', ' ')}</h2>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="bg-white rounded shadow">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{user.name || '—'}</td>
                          <td className="px-4 py-2">{user.email}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.active)}
                              className={`px-3 py-1 rounded text-white text-sm ${user.active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                            >
                              {user.active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Credits Tab */}
              {activeTab === 'credits' && (
                <div>
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const name = prompt('Package name:');
                        if (!name) return;
                        const credits = parseInt(prompt('Credits:') || '0');
                        if (isNaN(credits)) return;
                        const price = parseFloat(prompt('Price (USD):') || '0');
                        if (isNaN(price)) return;
                        createPackage({ name, credits, price, currency: 'usd', active: true });
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      + New Package
                    </button>
                  </div>
                  <div className="bg-white rounded shadow">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Credits</th>
                          <th className="px-4 py-2 text-left">Price</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packages.map(pkg => (
                          <tr key={pkg.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{pkg.name}</td>
                            <td className="px-4 py-2">{pkg.credits}</td>
                            <td className="px-4 py-2">${pkg.price}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${pkg.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {pkg.active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => togglePackageStatus(pkg.id, pkg.active)}
                                className={`px-3 py-1 rounded text-white text-sm ${pkg.active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}
                              >
                                {pkg.active ? 'Disable' : 'Enable'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="bg-white rounded shadow">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">User</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-500">No payments yet</td></tr>
                      ) : (
                        payments.map(p => (
                          <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{p.userEmail}</td>
                            <td className="px-4 py-2">${p.amount}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                p.status === 'completed' ? 'bg-green-100 text-green-800' :
                                p.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-2">{new Date(p.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Usage Tab */}
              {activeTab === 'ai-usage' && aiUsage && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded shadow text-center">
                    <div className="text-3xl font-bold text-blue-600">{aiUsage.totalJobs}</div>
                    <div className="text-gray-500">Total AI Jobs</div>
                  </div>
                  <div className="bg-white p-6 rounded shadow text-center">
                    <div className="text-3xl font-bold text-green-600">{aiUsage.avgTime}s</div>
                    <div className="text-gray-500">Avg Processing Time</div>
                  </div>
                  <div className="bg-white p-6 rounded shadow text-center">
                    <div className="text-3xl font-bold text-red-600">{aiUsage.failures}</div>
                    <div className="text-gray-500">Failures</div>
                  </div>
                </div>
              )}

              {/* Config Tab */}
              {activeTab === 'config' && (
                <div className="bg-white p-6 rounded shadow max-w-lg">
                  <h3 className="text-lg font-semibold mb-4">General Configuration</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const data = {
                      guest_free_image_limit: parseInt((form.elements.namedItem('guestFree') as HTMLInputElement).value),
                      daily_free_extractions: parseInt((form.elements.namedItem('dailyExtract') as HTMLInputElement).value),
                      daily_free_ask_ai: parseInt((form.elements.namedItem('dailyAskAI') as HTMLInputElement).value),
                      max_designs_free: parseInt((form.elements.namedItem('maxDesigns') as HTMLInputElement).value),
                      upload_max_size_mb: parseInt((form.elements.namedItem('maxSize') as HTMLInputElement).value),
                    };
                    updateConfig(data);
                  }}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Guest Free Image Limit</label>
                      <input type="number" name="guestFree" defaultValue="1" className="w-full border rounded p-2" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Daily Free Extractions</label>
                      <input type="number" name="dailyExtract" defaultValue="2" className="w-full border rounded p-2" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Daily Free Ask AI (if enabled)</label>
                      <input type="number" name="dailyAskAI" defaultValue="0" className="w-full border rounded p-2" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Max Designs (free users)</label>
                      <input type="number" name="maxDesigns" defaultValue="10" className="w-full border rounded p-2" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Max Upload Size (MB)</label>
                      <input type="number" name="maxSize" defaultValue="5" className="w-full border rounded p-2" />
                    </div>
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                      Save Configuration
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}