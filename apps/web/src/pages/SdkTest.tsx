import React, { useState } from 'react';
import { ServXProvider } from '@servx/react';

const FakeAppContent = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Fake Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <h1 className="text-xl font-bold tracking-tight">Orizons E-Commerce (Test App)</h1>
          <nav className="flex gap-4 text-sm font-medium opacity-90">
            <a href="#" className="hover:underline">Shop</a>
            <a href="#" className="hover:underline">Cart</a>
            <a href="#" className="hover:underline">Login</a>
          </nav>
        </div>

        {/* Fake Body */}
        <div className="p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Checkout Simulation</h2>
            <p className="text-slate-500 mt-1">This represents an active user session in an external repository.</p>
          </div>

          {/* Interactive Elements to test blocking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Card Number</label>
                <input 
                  type="text" 
                  placeholder="0000 0000 0000 0000" 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea 
                  rows={3} 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your address..."
                />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-4">
              <div className="text-4xl font-black text-slate-800">{count}</div>
              <p className="text-sm text-slate-500">Items in Cart</p>
              <button 
                onClick={() => setCount(c => c + 1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
              Complete Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SdkTest() {
  return (
    // We wrap this specific route in the ServXProvider pointing to our local API and the active PIN
    <ServXProvider 
      projectKey="svx_5e906d55c2fc2b7ee36b3037" 
      baseUrl="http://localhost:5000" 
      pollingIntervalMs={2000}
    >
      <FakeAppContent />
    </ServXProvider>
  );
}
