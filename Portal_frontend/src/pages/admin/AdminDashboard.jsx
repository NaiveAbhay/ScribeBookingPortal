import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, FileText, UserCheck, UserX, Loader2, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import api from '../../api/axios';

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  // Fetch pending scribes
  const { data: scribes = [], isLoading, isError } = useQuery({
    queryKey: ['pending-scribes'],
    queryFn: async () => {
      const res = await api.get('/admin/scribes?verified=false');
      return res.data.scribes || []; 
    }
  });

  // Mutation to verify (Approve) scribe
  const verifyMutation = useMutation({
    mutationFn: async ({ scribeId, status }) => {
      if (!scribeId) throw new Error("Invalid Scribe ID");
      return await api.post(`/admin/verify-scribe`, { 
        scribe_id: scribeId,
        is_verified: status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-scribes']);
    },
    onError: (err) => {
      alert("Approval failed: " + (err.response?.data?.message || err.message));
    }
  });

  // Mutation to DELETE (Reject) scribe
  const deleteMutation = useMutation({
    mutationFn: async (scribeId) => {
      if (!scribeId) throw new Error("Invalid Scribe ID");
      
      // Confirm before deleting
      if (!window.confirm("Are you sure you want to PERMANENTLY delete this applicant? This cannot be undone.")) {
        return Promise.reject(new Error("Cancelled"));
      }

      // Calls the new DELETE endpoint
      return await api.delete(`/admin/scribe/${scribeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-scribes']);
    },
    onError: (err) => {
      if (err.message !== "Cancelled") {
        alert("Delete failed: " + (err.response?.data?.message || err.message));
      }
    }
  });

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldCheck className="text-primary" size={32} /> Admin Verification Portal
        </h2>
        <p className="text-slate-500 mt-2">Review and verify new volunteer scribe applications.</p>
      </div>

      {isError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle /> <span>Failed to load pending applications.</span>
        </div>
      )}

      <div className="grid gap-6">
        {scribes.length === 0 ? (
          <div className="text-center bg-white py-20 rounded-2xl border border-dashed border-slate-300">
            <UserCheck size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No pending verifications</h3>
            <p className="text-slate-500">All volunteer applications have been processed.</p>
          </div>
        ) : (
          scribes.map((scribe) => (
            <div key={scribe.scribe_id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <img 
                  src={scribe.profile_image_url || 'https://via.placeholder.com/150'} 
                  alt={scribe.first_name} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
                />
                <div>
                  <h4 className="font-bold text-lg text-slate-900">{scribe.first_name} {scribe.last_name}</h4>
                  <p className="text-sm text-slate-500">{scribe.email} • {scribe.phone}</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                     {scribe.city}, {scribe.state}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {/* Aadhaar Button with Link Check */}
                {scribe.aadhaar_card_url && scribe.aadhaar_card_url.startsWith('http') ? (
                  <a 
                    href={scribe.aadhaar_card_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    <FileText size={16} /> Aadhaar <ExternalLink size={14} />
                  </a>
                ) : (
                   <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-bold border border-slate-200 cursor-not-allowed">
                     No Aadhaar
                   </span>
                )}

                {/* Degree Button with Link Check */}
                {scribe.qualification_doc_url && scribe.qualification_doc_url.startsWith('http') ? (
                  <a 
                    href={scribe.qualification_doc_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    <FileText size={16} /> Degree <ExternalLink size={14} />
                  </a>
                ) : (
                   <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-bold border border-slate-200 cursor-not-allowed">
                     No Degree
                   </span>
                )}
                
                <div className="flex gap-2 w-full md:w-auto md:ml-4">
                  <button 
                    onClick={() => verifyMutation.mutate({ scribeId: scribe.scribe_id, status: true })}
                    className="flex-1 md:flex-none bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck size={16} /> Approve
                  </button>
                  
                  {/* REJECT & DELETE BUTTON */}
                  <button 
                    onClick={() => deleteMutation.mutate(scribe.scribe_id)}
                    className="flex-1 md:flex-none bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;