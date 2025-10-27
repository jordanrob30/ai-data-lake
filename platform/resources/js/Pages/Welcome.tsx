import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

const Welcome = () => {
  const { auth } = usePage().props as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to AI Data Lake
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Seamlessly ingest, map, and transform your data with AI-powered intelligence. 
            Our platform enables automated data processing with human-in-the-loop validation.
          </p>
          
          {auth.user ? (
            <div className="space-x-4">
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
              <Link href="/confirmations">
                <Button variant="outline" size="lg">View Confirmations</Button>
              </Link>
            </div>
          ) : (
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg">Sign In</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Intelligent Ingestion</h3>
            <p className="text-gray-600">
              Automatically detect and process data from multiple sources with AI-powered schema recognition.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Human-in-the-Loop</h3>
            <p className="text-gray-600">
              Review and confirm AI-suggested mappings to ensure data quality and accuracy.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Multi-Tenant</h3>
            <p className="text-gray-600">
              Secure data isolation with role-based access controls for different tenant organizations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
