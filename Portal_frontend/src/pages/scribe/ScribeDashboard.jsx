import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, User, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const ScribeDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Accepted Bookings
  const { data: requests = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['scribe-bookings'],
    queryFn: async () => (await api.get('/scribe/get-request?status=ACCEPTED')).data.requests || []
  });

  // 2. Fetch Pending Invites (NEW)
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['scribe-invites'],
    queryFn: async () => (await api.get('/scribe/invites')).data.invites || []
  });

  // Action: Accept
  const acceptMutation = useMutation({
    mutationFn: async (token) => await api.post('/scribe/acceptRequest', { token }),
    onSuccess: () => {
      alert("Request Accepted!");
      queryClient.invalidateQueries(['scribe-bookings']);
      queryClient.invalidateQueries(['scribe-invites']);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to accept")
  });

  // Action: Reject
  const rejectMutation = useMutation({
    mutationFn: async (token) => await api.post('/scribe/reject-invite', { token }),
    onSuccess: () => queryClient.invalidateQueries(['scribe-invites'])
  });

  if (loadingBookings || loadingInvites) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      
      {/* --- NEW SECTION: PENDING INVITES --- */}
      {invites.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="text-orange-500" /> Pending Requests
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {invites.map((invite) => (
              <div key={invite.token} className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                <h3 className="font-bold text-lg text-slate-900">Request from {invite.student_name}</h3>
                <div className="mt-2 text-sm text-slate-700 space-y-1">
                   <p className="flex items-center gap-2"><Calendar size={14}/> {new Date(invite.exam_date).toLocaleDateString()}</p>
                   <p className="flex items-center gap-2"><Clock size={14}/> {invite.exam_time || 'Time TBD'}</p>
                   <p className="flex items-center gap-2"><MapPin size={14}/> {invite.city}, {invite.district}</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => acceptMutation.mutate(invite.token)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-green-700 flex justify-center items-center gap-2"
                  >
                    <CheckCircle size={16}/> Accept
                  </button>
                  <button 
                    onClick={() => rejectMutation.mutate(invite.token)}
                    className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl font-bold text-sm hover:bg-red-200 flex justify-center items-center gap-2"
                  >
                    <XCircle size={16}/> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- EXISTING SECTION: UPCOMING EXAMS --- */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">My Upcoming Exams</h2>
        <p className="text-slate-500 mt-2">Manage your accepted scribe duties.</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center bg-white py-20 rounded-2xl border border-dashed border-slate-300">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No upcoming exams</h3>
          <p className="text-slate-500">You haven't accepted any requests yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{req.student_name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                     <User size={14} /> 
                     <span>{req.student_phone || 'No Phone'}</span>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                  CONFIRMED
                </span>
              </div>

              <div className="space-y-3 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <Calendar size={18} className="text-primary" />
                  <span className="font-semibold">{new Date(req.exam_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Clock size={18} className="text-primary" />
                  <span className="font-semibold">{req.exam_time}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin size={18} className="text-primary" />
                  <span className="capitalize">{req.city}, {req.district}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  onClick={() => navigate(`/chat/${req.id}`)}
                  className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                >
                  Chat with Student
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScribeDashboard;