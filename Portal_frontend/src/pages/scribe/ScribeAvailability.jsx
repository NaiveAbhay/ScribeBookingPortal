import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, X, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

const ScribeAvailability = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('PERSONAL');

  // Load existing unavailability
  const { data, isLoading } = useQuery({
    queryKey: ['scribe-unavailability'],
    queryFn: async () => (await api.get('/scribe/get-unavailability')).data
  });

  // Mutation to add unavailability
  const mutation = useMutation({
    mutationFn: async (newData) => await api.post('/scribe/set-unavailability', newData),
    onSuccess: () => {
      queryClient.invalidateQueries(['scribe-unavailability']);
      setSelectedDate('');
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    mutation.mutate({ date: selectedDate, reason });
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">My Availability</h2>
      <p className="text-slate-500 mb-8">Mark days when you are unavailable to scribe. You won't receive requests for these dates.</p>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-primary" /> Mark Busy
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Select Date</label>
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Reason (Optional)</label>
                <select 
  value={reason}
  onChange={(e) => setReason(e.target.value)}
  className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
>
  {/* The schema ONLY supports 'PERSONAL' for manual entry */}
  <option value="PERSONAL">Personal / Private Reason</option>
  {/* If you want to support others, you must ALTER TABLE first. For now, we map all manual reasons to PERSONAL */}
</select>
              </div>
              <button 
                type="submit" 
                disabled={mutation.isLoading}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors flex justify-center items-center gap-2"
              >
                {mutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Save Date'}
              </button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Upcoming Unavailable Dates</h3>
            </div>
            
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : data?.unavailability.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CalendarIcon className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-sm font-medium">You are currently available for all dates.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.unavailability.map((item, index) => (
                  <div key={index} className="p-4 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs flex-col">
                        <span>{new Date(item.date).getDate()}</span>
                        <span className="text-[8px] uppercase">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{new Date(item.date).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{item.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScribeAvailability;