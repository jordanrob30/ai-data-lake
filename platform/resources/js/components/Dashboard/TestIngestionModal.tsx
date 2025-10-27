import { useState, useEffect } from 'react';
import { X, Send, Wifi } from 'lucide-react';

interface TestIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: any;
}

const TestIngestionModal: React.FC<TestIngestionModalProps> = ({ isOpen, onClose, auth }) => {
  // Use the auth.user.tenant_id or fall back to default for landlord
  const currentTenantId = auth.user?.tenant_id || 'dc5fac73-7fa8-415c-8071-52cc2275b56d'; // Default to Tenant 1 for landlord
  const displayTenantName = auth.user?.tenant_id ? 'Current Tenant' : 'Tenant 1 (Default for Landlord)';

  // Predefined data examples
  const dataExamples = {
    'basic': {
      name: 'Basic Event',
      data: {
        timestamp: new Date().toISOString(),
        source: 'test-interface',
        user_id: auth.user?.id,
        event_type: 'user_action',
        data: {
          key: 'value',
          sample_field: 'sample_data',
          action: 'button_click'
        }
      }
    },
    'stripe_customer': {
      name: 'Stripe Customer',
      data: {
        id: 'cus_OqKbhqp1In5TxG',
        object: 'customer',
        address: {
          city: 'San Francisco',
          country: 'US',
          line1: '123 Market St',
          line2: 'Suite 100',
          postal_code: '94105',
          state: 'CA'
        },
        balance: 0,
        created: 1680123456,
        currency: 'usd',
        default_source: null,
        delinquent: false,
        description: 'Customer for jenny.rosen@example.com',
        discount: null,
        email: 'jenny.rosen@example.com',
        invoice_prefix: 'A1B2C3D',
        invoice_settings: {
          custom_fields: null,
          default_payment_method: null,
          footer: null,
          rendering_options: null
        },
        livemode: false,
        metadata: {
          order_id: '6735',
          source: 'website'
        },
        name: 'Jenny Rosen',
        next_invoice_sequence: 1,
        phone: '+14155551234',
        preferred_locales: ['en'],
        shipping: {
          address: {
            city: 'San Francisco',
            country: 'US',
            line1: '123 Market St',
            line2: 'Suite 100',
            postal_code: '94105',
            state: 'CA'
          },
          name: 'Jenny Rosen',
          phone: '+14155551234'
        },
        tax_exempt: 'none',
        test_clock: null
      }
    },
    'hubspot_contact': {
      name: 'HubSpot Contact',
      data: {
        id: '12345678901',
        properties: {
          createdate: '2023-04-01T12:00:00.000Z',
          email: 'john.doe@example.com',
          firstname: 'John',
          lastname: 'Doe',
          phone: '+1-555-123-4567',
          company: 'Acme Corporation',
          jobtitle: 'Senior Developer',
          website: 'https://johndoe.dev',
          city: 'New York',
          state: 'NY',
          country: 'United States',
          zip: '10001',
          lifecyclestage: 'customer',
          lead_status: 'QUALIFIED',
          hs_analytics_source: 'ORGANIC_SEARCH',
          hs_analytics_source_data_1: 'google',
          hs_analytics_source_data_2: 'react developer jobs',
          hubspot_owner_id: '98765432',
          lastmodifieddate: '2023-04-15T14:30:00.000Z',
          hs_object_id: '12345678901',
          annual_revenue: '75000',
          industry: 'Technology',
          number_of_employees: '50',
          recent_deal_amount: '25000',
          total_revenue: '125000'
        },
        createdAt: '2023-04-01T12:00:00.000Z',
        updatedAt: '2023-04-15T14:30:00.000Z',
        archived: false
      }
    },
    'ecommerce_order': {
      name: 'E-commerce Order',
      data: {
        order_id: 'ORD-2023-001234',
        customer_id: 'CUST-789456',
        order_date: '2023-04-15T10:30:00Z',
        status: 'completed',
        total_amount: 299.97,
        currency: 'USD',
        customer: {
          email: 'sarah.johnson@email.com',
          first_name: 'Sarah',
          last_name: 'Johnson',
          phone: '+1-555-987-6543'
        },
        billing_address: {
          street: '456 Oak Avenue',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60601',
          country: 'US'
        },
        shipping_address: {
          street: '456 Oak Avenue',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60601',
          country: 'US'
        },
        items: [
          {
            product_id: 'PROD-001',
            name: 'Wireless Headphones',
            quantity: 1,
            unit_price: 199.99,
            total_price: 199.99,
            category: 'Electronics'
          },
          {
            product_id: 'PROD-002',
            name: 'Phone Case',
            quantity: 2,
            unit_price: 49.99,
            total_price: 99.98,
            category: 'Accessories'
          }
        ],
        payment: {
          method: 'credit_card',
          card_last_four: '4242',
          transaction_id: 'TXN-ABC123DEF456'
        },
        shipping: {
          method: 'standard',
          cost: 9.99,
          tracking_number: '1Z999AA1234567890'
        }
      }
    },
    'user_analytics': {
      name: 'User Analytics Event',
      data: {
        event_id: 'evt_1234567890abcdef',
        timestamp: '2023-04-15T15:45:30.123Z',
        event_type: 'page_view',
        user_id: 'user_789456123',
        session_id: 'sess_abc123def456',
        page: {
          url: 'https://example.com/products/wireless-headphones',
          title: 'Wireless Headphones - Premium Audio',
          referrer: 'https://google.com/search',
          path: '/products/wireless-headphones'
        },
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        device: {
          type: 'desktop',
          os: 'macOS',
          browser: 'Chrome',
          screen_resolution: '1920x1080'
        },
        location: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco',
          timezone: 'America/Los_Angeles'
        },
        utm_params: {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'spring_sale_2023',
          utm_term: 'wireless headphones',
          utm_content: 'ad_variant_a'
        },
        custom_properties: {
          product_category: 'electronics',
          price_range: '100-300',
          user_segment: 'premium'
        }
      }
    },
    'support_ticket': {
      name: 'Support Ticket',
      data: {
        ticket_id: 'TICK-2023-5678',
        created_at: '2023-04-15T09:15:00Z',
        updated_at: '2023-04-15T11:30:00Z',
        status: 'open',
        priority: 'high',
        category: 'technical_issue',
        subject: 'Unable to process payment',
        customer: {
          id: 'CUST-123456',
          name: 'Michael Chen',
          email: 'michael.chen@company.com',
          phone: '+1-555-246-8135',
          tier: 'enterprise'
        },
        assigned_agent: {
          id: 'AGENT-789',
          name: 'Lisa Rodriguez',
          department: 'technical_support',
          email: 'lisa.rodriguez@support.com'
        },
        description: 'Customer reports payment processing errors when trying to upgrade subscription',
        tags: ['payment', 'subscription', 'urgent'],
        resolution_time_sla: 240,
        first_response_time: 15,
        interactions: [
          {
            type: 'customer_message',
            timestamp: '2023-04-15T09:15:00Z',
            message: 'I keep getting an error when trying to upgrade my plan'
          },
          {
            type: 'agent_response',
            timestamp: '2023-04-15T09:30:00Z',
            agent_id: 'AGENT-789',
            message: 'Thank you for contacting us. Let me investigate this issue for you.'
          }
        ]
      }
    }
  };

  const [selectedExample, setSelectedExample] = useState('basic');
  const [data, setData] = useState(JSON.stringify(dataExamples.basic.data, null, 2));
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Handle example selection
  const handleExampleChange = (exampleKey: string) => {
    setSelectedExample(exampleKey);
    const selectedData = { ...dataExamples[exampleKey as keyof typeof dataExamples].data };
    // Update timestamp for fresh data if it exists
    if ('timestamp' in selectedData) {
      (selectedData as any).timestamp = new Date().toISOString();
    }
    setData(JSON.stringify(selectedData, null, 2));
    setResponse(null);
  };

  const sendPost = async () => {
    setSending(true);
    setResponse(null);
    try {
      const tenantId = currentTenantId;
      const payload = JSON.parse(data);
      payload.timestamp = new Date().toISOString();

      const response = await fetch(`http://localhost:8080/tenant/${tenantId}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setResponse({ type: 'success', message: `Success! Schema hash: ${result.schema_hash}` });
      } else {
        setResponse({ type: 'error', message: `Error: ${response.statusText}` });
      }
    } catch (error) {
      console.error('POST error:', error);
      setResponse({ type: 'error', message: `Error sending POST: ${error}` });
    } finally {
      setSending(false);
    }
  };

  const sendWs = () => {
    setSending(true);
    setResponse(null);
    try {
      const tenantId = currentTenantId;
      const payload = JSON.parse(data);
      payload.timestamp = new Date().toISOString();

      const ws = new WebSocket(`ws://localhost:8080/tenant/${tenantId}/ws`);
      ws.onopen = () => {
        ws.send(JSON.stringify(payload));
        setResponse({ type: 'success', message: 'WebSocket message sent!' });
        setSending(false);
      };
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setResponse({ type: 'error', message: `WebSocket error: ${error}` });
        setSending(false);
      };
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } catch (error) {
      console.error('WebSocket error:', error);
      setResponse({ type: 'error', message: `Error sending WebSocket: ${error}` });
      setSending(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-3/4 lg:w-2/3 xl:w-3/5 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Test Data Ingestion</h2>
              <p className="text-sm text-gray-600 mt-0.5">Send test data to your ingestion endpoints</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tenant Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tenant:</strong> {currentTenantId} ({displayTenantName}) |
                <strong> User:</strong> {auth.user?.name}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Timestamp will be updated automatically on send
              </p>
              <div className="text-xs text-blue-500 mt-2 space-y-1">
                <p><strong>POST:</strong> <code className="bg-white/70 px-1.5 py-0.5 rounded">http://localhost:8080/tenant/{currentTenantId}/ingest</code></p>
                <p><strong>WebSocket:</strong> <code className="bg-white/70 px-1.5 py-0.5 rounded">ws://localhost:8080/tenant/{currentTenantId}/ws</code></p>
              </div>
            </div>

            {/* Response Message */}
            {response && (
              <div className={`mb-6 p-4 rounded-lg border ${
                response.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm font-medium">{response.message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Data Examples Selector */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Examples</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose from realistic data shapes
                </p>

                <div className="space-y-2">
                  {Object.entries(dataExamples).map(([key, example]) => (
                    <button
                      key={key}
                      onClick={() => handleExampleChange(key)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedExample === key
                          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm">{example.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {key === 'stripe_customer' && 'Customer with address, metadata'}
                        {key === 'hubspot_contact' && 'Contact with properties, analytics'}
                        {key === 'ecommerce_order' && 'Order with items, payment info'}
                        {key === 'user_analytics' && 'Page view with UTM, device data'}
                        {key === 'support_ticket' && 'Ticket with interactions, SLA'}
                        {key === 'basic' && 'Simple event with nested data'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* JSON Editor */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">JSON Data</h3>
                  <div className="text-sm text-gray-500">
                    {Object.keys(JSON.parse(data) || {}).length} fields
                  </div>
                </div>

                <textarea
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    setResponse(null);
                  }}
                  placeholder="Enter JSON data to send..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={sendPost}
                disabled={sending}
              >
                <Send className="w-4 h-4" />
                Send POST Request
              </button>
              <button
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={sendWs}
                disabled={sending}
              >
                <Wifi className="w-4 h-4" />
                Send WebSocket
              </button>
            </div>

            {/* Tips Section */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="text-base font-semibold text-yellow-800 mb-3">Testing Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-yellow-700">
                <div>
                  <strong>Stripe Customer:</strong> Test nested address objects
                </div>
                <div>
                  <strong>HubSpot Contact:</strong> Test complex properties
                </div>
                <div>
                  <strong>E-commerce Order:</strong> Test arrays and nested objects
                </div>
                <div>
                  <strong>User Analytics:</strong> Test UTM and device info
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestIngestionModal;