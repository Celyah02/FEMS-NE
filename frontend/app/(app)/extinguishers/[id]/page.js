'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { StatusBadge, Spinner, Alert } from '@/components/ui';

export default function ExtinguisherDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/extinguishers/${id}`);
        setData(res.extinguisher);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="btn-ghost px-2 py-1 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Extinguisher Details</h1>
        </div>
        <StatusBadge value={data.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2 text-slate-700">Core Information</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-slate-500">Serial Number</div>
            <div className="font-medium">{data.serialNumber}</div>
            
            <div className="text-slate-500">Location</div>
            <div className="font-medium">{data.location}</div>
            
            <div className="text-slate-500">Type</div>
            <div className="font-medium capitalize">{data.type.replace('_', ' ')}</div>
            
            <div className="text-slate-500">Size</div>
            <div className="font-medium">{data.size}</div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2 text-slate-700">Lifecycle & Compliance</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-slate-500">Installation Date</div>
            <div className="font-medium">{data.installationDate?.slice(0, 10)}</div>
            
            <div className="text-slate-500">Expiry Date</div>
            <div className="font-medium text-red-600">{data.expiryDate?.slice(0, 10)}</div>
            
            <div className="text-slate-500">Last Inspected</div>
            <div className="font-medium">{data.lastInspectedAt ? new Date(data.lastInspectedAt).toLocaleString() : 'Never'}</div>
            
            <div className="text-slate-500">Created At</div>
            <div className="font-medium text-slate-400">{new Date(data.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
