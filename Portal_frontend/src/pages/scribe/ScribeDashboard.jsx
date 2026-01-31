import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, Clock, MapPin, User, Loader2, 
  CheckCircle, XCircle, CalendarOff, History, Inbox 
} from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAccessibility } from '../../context/AccessibilityContext'; // 1. Import Context

const ScribeDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('upcoming'); 
  
  // 2. Consume Context
  const { highContrast } = useAccessibility(); 

  // --- DATA FETCHING (Unchanged) ---
  const { data: upcoming = [], isLoading: loadUpcoming } = useQuery({
    queryKey: ['scribe-upcoming'],
    queryFn: async () => (await api.get('/scribe/get-request?status=ACCEPTED')).data.requests || []
  });

  const { data: pending = [], isLoading: loadPending } = useQuery({
    queryKey: ['scribe-invites'],
    queryFn: async () => (await api.get('/scribe/invites')).data.invites || []
  });

  const { data: history = [], isLoading: loadHistory } = useQuery({
    queryKey: ['scribe-history'],
    queryFn: async () => (await api.get('/scribe/get-request?status=COMPLETED')).data.requests || []
  });

  // --- MUTATIONS (Unchanged) ---
  const acceptMutation = useMutation({
    mutationFn: async (token) => await api.post('/scribe/acceptRequest', { token }),
    onSuccess: () => {
      alert("Request Accepted!");
      queryClient.invalidateQueries(['scribe-upcoming']);
      queryClient.invalidateQueries(['scribe-invites']);
      setActiveTab('upcoming');
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to accept")
  });

  const rejectMutation = useMutation({
    mutationFn: async (token) => await api.post('/scribe/reject-invite', { token }),
    onSuccess: () => queryClient.invalidateQueries(['scribe-invites'])
  });

  // --- 3. DYNAMIC STYLES ---
  const theme = {
    pageBg: highContrast ? 'bg-black min-h-screen' : 'bg-transparent',
    textMain: highContrast ? 'text-yellow-400' : 'text-slate-900',
    textSub: highContrast ? 'text-yellow-200' : 'text-slate-500',
    card: highContrast ? 'bg-black border-2 border-yellow-400 text-yellow-400' : 'bg-white shadow-sm border border-slate-100',
    btnPrimary: highContrast ? 'bg-yellow-400 text-black font-bold border-2 border-yellow-400 hover:bg-yellow-500' : 'bg-slate-800 text-white hover:bg-slate-900',
    tabContainer: highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-slate-100',
    tabActive: highContrast ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-primary shadow-sm',
    tabInactive: highContrast ? 'text-yellow-400 hover:bg-gray-800' : 'text-slate-500 hover:text-slate-700',
  };

  if (loadUpcoming || loadPending || loadHistory) {
    return <div className={`flex justify-center p-20 ${highContrast ? 'bg-black h-screen' : ''}`}><Loader2 className={`animate-spin ${highContrast ? 'text-yellow-400' : 'text-primary'}`} size={40} /></div>;
  }

  return (
    <div className={`max-w-6xl mx-auto py-8 px-4 transition-colors duration-300 ${theme.pageBg}`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${theme.textMain}`}>Scribe Dashboard</h2>
          <p className={theme.textSub}>Manage your exams and requests.</p>
        </div>
        <button 
          onClick={() => navigate('/scribe/availability')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg ${theme.btnPrimary}`}
        >
          <CalendarOff size={18} /> Set Unavailability
        </button>
      </div>

      {/* TABS */}
      <div className={`flex gap-2 mb-8 p-1.5 rounded-xl w-full md:w-fit ${theme.tabContainer}`}>
        {['upcoming', 'pending', 'history'].map((tab) => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all capitalize flex items-center justify-center gap-2 
                ${activeTab === tab ? theme.tabActive : theme.tabInactive}`}
            >
                {tab}
                {tab === 'pending' && pending.length > 0 && (
                    <span className={`${highContrast ? 'bg-black text-yellow-400 border border-yellow-400' : 'bg-orange-500 text-white'} text-[10px] px-1.5 py-0.5 rounded-full`}>
                        {pending.length}
                    </span>
                )}
            </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        
        {/* 1. UPCOMING TAB */}
        {activeTab === 'upcoming' && (
          upcoming.length === 0 ? (
            <EmptyState icon={Calendar} title="No upcoming exams" desc="Accepted requests will appear here." highContrast={highContrast} />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {upcoming.map((req) => (
                <RequestCard key={req.id} req={req} type="accepted" highContrast={highContrast} onChat={() => navigate(`/chat/${req.id}`)} />
              ))}
            </div>
          )
        )}

        {/* 2. PENDING TAB */}
        {activeTab === 'pending' && (
          pending.length === 0 ? (
            <EmptyState icon={Inbox} title="No pending invites" desc="You're all caught up!" highContrast={highContrast} />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {pending.map((invite) => (
                <div key={invite.token} className={`p-6 rounded-2xl ${highContrast ? 'bg-black border-2 border-orange-500 text-yellow-400' : 'bg-white border-l-4 border-orange-500 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`font-bold text-lg ${theme.textMain}`}>{invite.student_name}</h3>
                    <span className={`${highContrast ? 'bg-orange-900 text-orange-200 border border-orange-500' : 'bg-orange-100 text-orange-700'} px-3 py-1 rounded-full text-xs font-bold`}>INVITE</span>
                  </div>
                  <RequestDetails date={invite.exam_date} time={invite.exam_time} location={`${invite.city}, ${invite.district}`} highContrast={highContrast} />
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => acceptMutation.mutate(invite.token)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 flex justify-center items-center gap-2 border-2 border-transparent focus:border-white"
                    >
                      <CheckCircle size={16}/> Accept
                    </button>
                    <button 
                      onClick={() => rejectMutation.mutate(invite.token)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 ${highContrast ? 'bg-red-900 text-red-200 border border-red-500' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                      <XCircle size={16}/> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 3. HISTORY TAB */}
        {activeTab === 'history' && (
          history.length === 0 ? (
            <EmptyState icon={History} title="No past exams" desc="Completed exams will show up here." highContrast={highContrast} />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {history.map((req) => (
                <RequestCard key={req.id} req={req} type="completed" highContrast={highContrast} />
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
};

// --- Helper Components (Updated for High Contrast) ---

const RequestCard = ({ req, type, onChat, highContrast }) => {
    // Styles
    const baseClass = highContrast ? "bg-black border-2 border-yellow-400" : "bg-white border border-slate-100 shadow-sm";
    const textMain = highContrast ? "text-yellow-400" : "text-slate-900";
    const textSub = highContrast ? "text-yellow-200" : "text-slate-500";
    const badgeClass = type === 'completed' 
        ? (highContrast ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-slate-100 text-slate-600 border-slate-200')
        : (highContrast ? 'bg-green-900 text-green-300 border border-green-500' : 'bg-green-100 text-green-700 border-green-200');

    return (
        <div className={`p-6 rounded-2xl ${baseClass} ${type === 'completed' && !highContrast ? 'opacity-75' : ''}`}>
            <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className={`font-bold text-lg ${textMain}`}>{req.student_name}</h3>
                <div className={`flex items-center gap-2 text-sm mt-1 ${textSub}`}>
                    <User size={14} /> 
                    <span>{req.student_phone || 'No Phone'}</span>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                {type === 'completed' ? 'COMPLETED' : 'CONFIRMED'}
            </span>
            </div>

            <RequestDetails date={req.exam_date} time={req.exam_time} location={`${req.city}, ${req.district}`} highContrast={highContrast} />

            {type === 'accepted' && (
            <div className="mt-6">
                <button 
                onClick={onChat}
                className={`w-full py-3 rounded-xl font-bold transition-colors shadow-md active:scale-95 ${highContrast ? 'bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-500' : 'bg-primary text-white hover:bg-primary-dark'}`}
                >
                Chat & Video Call
                </button>
            </div>
            )}
        </div>
    );
};

const RequestDetails = ({ date, time, location, highContrast }) => {
    const iconColor = highContrast ? "text-yellow-400" : "text-primary";
    const textColor = highContrast ? "text-yellow-200" : "text-slate-700";
    const borderColor = highContrast ? "border-yellow-400/30" : "border-slate-50";

    return (
        <div className={`space-y-3 border-t pt-4 ${borderColor}`}>
            <div className={`flex items-center gap-3 ${textColor}`}>
            <Calendar size={18} className={iconColor} />
            <span className="font-semibold">{new Date(date).toLocaleDateString()}</span>
            </div>
            <div className={`flex items-center gap-3 ${textColor}`}>
            <Clock size={18} className={iconColor} />
            <span className="font-semibold">{time || 'TBD'}</span>
            </div>
            <div className={`flex items-center gap-3 ${textColor}`}>
            <MapPin size={18} className={iconColor} />
            <span className="capitalize">{location}</span>
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, desc, highContrast }) => {
    const containerClass = highContrast ? "bg-black border-2 border-dashed border-yellow-400" : "bg-slate-50 border-2 border-dashed border-slate-200";
    const titleClass = highContrast ? "text-yellow-400" : "text-slate-900";
    const descClass = highContrast ? "text-yellow-200" : "text-slate-500";
    const iconClass = highContrast ? "text-yellow-400" : "text-slate-300";

    return (
        <div className={`text-center py-20 rounded-3xl ${containerClass}`}>
            <Icon size={48} className={`mx-auto mb-4 ${iconClass}`} />
            <h3 className={`text-lg font-bold ${titleClass}`}>{title}</h3>
            <p className={descClass}>{desc}</p>
        </div>
    );
};

export default ScribeDashboard;
// import React, { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { 
//   Calendar, Clock, MapPin, User, Loader2, AlertCircle, 
//   CheckCircle, XCircle, CalendarOff, History, Inbox 
// } from 'lucide-react';
// import api from '../../api/axios';
// import { useNavigate } from 'react-router-dom';

// const ScribeDashboard = () => {
//   const navigate = useNavigate();
//   const queryClient = useQueryClient();
//   const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'pending', 'history'

//   // --- DATA FETCHING ---
//   // 1. Accepted/Upcoming Requests
//   const { data: upcoming = [], isLoading: loadUpcoming } = useQuery({
//     queryKey: ['scribe-upcoming'],
//     queryFn: async () => (await api.get('/scribe/get-request?status=ACCEPTED')).data.requests || []
//   });

//   // 2. Pending Invites
//   const { data: pending = [], isLoading: loadPending } = useQuery({
//     queryKey: ['scribe-invites'],
//     queryFn: async () => (await api.get('/scribe/invites')).data.invites || []
//   });

//   // 3. Completed History
//   const { data: history = [], isLoading: loadHistory } = useQuery({
//     queryKey: ['scribe-history'],
//     queryFn: async () => (await api.get('/scribe/get-request?status=COMPLETED')).data.requests || []
//   });

//   // --- MUTATIONS ---
//   const acceptMutation = useMutation({
//     mutationFn: async (token) => await api.post('/scribe/acceptRequest', { token }),
//     onSuccess: () => {
//       alert("Request Accepted!");
//       queryClient.invalidateQueries(['scribe-upcoming']);
//       queryClient.invalidateQueries(['scribe-invites']);
//       setActiveTab('upcoming'); // Switch to upcoming tab
//     },
//     onError: (err) => alert(err.response?.data?.message || "Failed to accept")
//   });

//   const rejectMutation = useMutation({
//     mutationFn: async (token) => await api.post('/scribe/reject-invite', { token }),
//     onSuccess: () => queryClient.invalidateQueries(['scribe-invites'])
//   });

//   if (loadUpcoming || loadPending || loadHistory) {
//     return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
//   }

//   return (
//     <div className="max-w-6xl mx-auto py-8 px-4">
      
//       {/* HEADER & ACTIONS */}
//       <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
//         <div>
//           <h2 className="text-3xl font-bold text-slate-900">Scribe Dashboard</h2>
//           <p className="text-slate-500">Manage your exams and requests.</p>
//         </div>
//         <button 
//           onClick={() => navigate('/scribe/availability')}
//           className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg"
//         >
//           <CalendarOff size={18} /> Set Unavailability
//         </button>
//       </div>

//       {/* TABS */}
//       <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl w-full md:w-fit">
//         <button 
//           onClick={() => setActiveTab('upcoming')}
//           className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//         >
//           Upcoming ({upcoming.length})
//         </button>
//         <button 
//           onClick={() => setActiveTab('pending')}
//           className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//         >
//           Invites 
//           {pending.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pending.length}</span>}
//         </button>
//         <button 
//           onClick={() => setActiveTab('history')}
//           className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//         >
//           History
//         </button>
//       </div>

//       {/* CONTENT AREA */}
//       <div className="min-h-[400px]">
        
//         {/* 1. UPCOMING TAB */}
//         {activeTab === 'upcoming' && (
//           upcoming.length === 0 ? (
//             <EmptyState icon={Calendar} title="No upcoming exams" desc="Accepted requests will appear here." />
//           ) : (
//             <div className="grid md:grid-cols-2 gap-6">
//               {upcoming.map((req) => (
//                 <RequestCard key={req.id} req={req} type="accepted" onChat={() => navigate(`/chat/${req.id}`)} />
//               ))}
//             </div>
//           )
//         )}

//         {/* 2. PENDING TAB */}
//         {activeTab === 'pending' && (
//           pending.length === 0 ? (
//             <EmptyState icon={Inbox} title="No pending invites" desc="You're all caught up!" />
//           ) : (
//             <div className="grid md:grid-cols-2 gap-6">
//               {pending.map((invite) => (
//                 <div key={invite.token} className="bg-white p-6 rounded-2xl border-l-4 border-orange-500 shadow-sm">
//                   <div className="flex justify-between items-start mb-4">
//                     <h3 className="font-bold text-lg text-slate-900">{invite.student_name}</h3>
//                     <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">INVITE</span>
//                   </div>
//                   <RequestDetails date={invite.exam_date} time={invite.exam_time} location={`${invite.city}, ${invite.district}`} />
//                   <div className="flex gap-3 mt-6">
//                     <button 
//                       onClick={() => acceptMutation.mutate(invite.token)}
//                       className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 flex justify-center items-center gap-2"
//                     >
//                       <CheckCircle size={16}/> Accept
//                     </button>
//                     <button 
//                       onClick={() => rejectMutation.mutate(invite.token)}
//                       className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold text-sm hover:bg-red-100 flex justify-center items-center gap-2"
//                     >
//                       <XCircle size={16}/> Decline
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )
//         )}

//         {/* 3. HISTORY TAB */}
//         {activeTab === 'history' && (
//           history.length === 0 ? (
//             <EmptyState icon={History} title="No past exams" desc="Completed exams will show up here." />
//           ) : (
//             <div className="grid md:grid-cols-2 gap-6">
//               {history.map((req) => (
//                 <RequestCard key={req.id} req={req} type="completed" />
//               ))}
//             </div>
//           )
//         )}

//       </div>
//     </div>
//   );
// };

// // --- Helper Components ---

// const RequestCard = ({ req, type, onChat }) => (
//   <div className={`bg-white p-6 rounded-2xl shadow-sm border ${type === 'completed' ? 'border-slate-100 opacity-75' : 'border-slate-100'}`}>
//     <div className="flex justify-between items-start mb-4">
//       <div>
//         <h3 className="font-bold text-lg text-slate-900">{req.student_name}</h3>
//         <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
//             <User size={14} /> 
//             <span>{req.student_phone || 'No Phone'}</span>
//         </div>
//       </div>
//       <span className={`px-3 py-1 rounded-full text-xs font-bold border ${type === 'completed' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
//         {type === 'completed' ? 'COMPLETED' : 'CONFIRMED'}
//       </span>
//     </div>

//     <RequestDetails date={req.exam_date} time={req.exam_time} location={`${req.city}, ${req.district}`} />

//     {type === 'accepted' && (
//       <div className="mt-6">
//         <button 
//           onClick={onChat}
//           className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-md active:scale-95"
//         >
//           Chat & Video Call
//         </button>
//       </div>
//     )}
//   </div>
// );

// const RequestDetails = ({ date, time, location }) => (
//   <div className="space-y-3 border-t border-slate-50 pt-4">
//     <div className="flex items-center gap-3 text-slate-700">
//       <Calendar size={18} className="text-primary" />
//       <span className="font-semibold">{new Date(date).toLocaleDateString()}</span>
//     </div>
//     <div className="flex items-center gap-3 text-slate-700">
//       <Clock size={18} className="text-primary" />
//       <span className="font-semibold">{time || 'TBD'}</span>
//     </div>
//     <div className="flex items-center gap-3 text-slate-700">
//       <MapPin size={18} className="text-primary" />
//       <span className="capitalize">{location}</span>
//     </div>
//   </div>
// );

// const EmptyState = ({ icon: Icon, title, desc }) => (
//   <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//     <Icon size={48} className="mx-auto text-slate-300 mb-4" />
//     <h3 className="text-lg font-bold text-slate-900">{title}</h3>
//     <p className="text-slate-500">{desc}</p>
//   </div>
// );

// export default ScribeDashboard;