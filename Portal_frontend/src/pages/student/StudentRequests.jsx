import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useQuery } from '@tanstack/react-query';
import { ListFilter, Calendar, MapPin, Clock, AlertCircle, Loader2, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import api from '../../api/axios';

const StudentRequests = () => {
  const [statusFilter, setStatusFilter] = useState(''); // Empty means 'All'
  const [page, setPage] = useState(1);
  const navigate = useNavigate(); 

  // Matches student.controller.js -> getRequests
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-requests', statusFilter, page],
    queryFn: async () => {
      const res = await api.get('/student/get-requests', {
        params: { status: statusFilter, page }
      });
      return res.data;
    },
    keepPreviousData: true
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ACCEPTED': return 'bg-green-100 text-green-700 border-green-200';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'TIMED_OUT': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Exam Requests</h2>
          <p className="text-slate-500">Track and manage your scribe bookings</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* --- NEW BUTTON LOCATION: Always visible --- */}
          <button 
            onClick={() => navigate('/student/create-request')}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} /> New Request
          </button>

          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
            <ListFilter size={18} className="text-slate-400 ml-2" />
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none focus:ring-0 text-sm font-semibold pr-8 cursor-pointer outline-none"
            >
              <option value="">All Requests</option>
              <option value="OPEN">Open</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
              <option value="TIMED_OUT">Timed Out</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
      ) : isError ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 flex items-center gap-3">
          <AlertCircle /> <span>Failed to load requests. Please try again.</span>
        </div>
      ) : data?.requests.length === 0 ? (
        <div className="text-center bg-white py-20 rounded-2xl border border-dashed border-slate-300">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
          <p className="text-slate-500 mb-6">You haven't created any exam requests in this category yet.</p>
          {/* Duplicate button here is fine for empty states, or you can remove it since it's in the header now */}
        </div>
      ) : (
        <div className="space-y-4">
          {data.requests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(req.status)}`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Created on {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={16} className="text-primary" />
                      <span className="font-semibold">{new Date(req.exam_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock size={16} className="text-primary" />
                      <span className="font-semibold">{req.exam_time || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-sm md:col-span-2">
                      <MapPin size={16} />
                      <span className="capitalize">{req.city}, {req.district}, {req.state}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:justify-center md:items-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8 gap-4">
                  {req.status === 'ACCEPTED' ? (
                    <div className="flex flex-col items-end gap-3 w-full">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Assigned Scribe</p>
                        <p className="font-bold text-slate-900">{req.scribe_name}</p>
                      </div>
                      
                      {/* Chat Button for Accepted Requests */}
                      <button 
                        onClick={() => navigate(`/chat/${req.id}`)}
                        className="w-full md:w-auto bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} />
                        Start Chat
                      </button>
                    </div>
                  ) : req.status === 'OPEN' ? (
                    <p className="text-sm text-blue-600 font-medium italic">Awaiting acceptance...</p>
                  ) : req.status === 'COMPLETED' ? (
                    <button 
                      onClick={() => navigate(`/student/feedback/${req.id}`)}
                      className="text-primary text-sm font-bold hover:underline"
                    >
                      Leave Feedback
                    </button>
                  ) : null}
                  
                  <button className="p-2 hover:bg-slate-50 rounded-full transition-colors hidden md:block">
                    <ChevronRight className="text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex justify-center gap-4 mt-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white border rounded-lg font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={!data?.has_more}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white border rounded-lg font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRequests;