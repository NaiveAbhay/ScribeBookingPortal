import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Loader2, CheckCircle, Send } from 'lucide-react';
import api from '../../api/axios';
import { useAccessibility } from '../../context/AccessibilityContext';

const CreateRequest = () => {
  const { t, highContrast } = useAccessibility();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [examRequestId, setExamRequestId] = useState(null);
  const [availableScribes, setAvailableScribes] = useState([]);
  const [selectedScribes, setSelectedScribes] = useState([]);
  
  const [formData, setFormData] = useState({ date: '', time: '', state: '', district: '', city: '', language: '' });
  
  const { data: metadata } = useQuery({ queryKey: ['metadata'], queryFn: async () => (await api.get('/locations/metadata')).data });
  const { data: states = [] } = useQuery({ queryKey: ['states'], queryFn: async () => (await api.get('/locations/states')).data });
  const { data: districts = [] } = useQuery({ queryKey: ['districts', formData.state], queryFn: async () => (await api.get(`/locations/districts/${formData.state}`)).data, enabled: !!formData.state });

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/student/createRequest', formData); // Backend maps date->exam_date automatically
      setExamRequestId(res.data.exam_request_id);
      setAvailableScribes(res.data.scribes);
      setStep(2);
    } catch (err) { alert(err.response?.data?.message || "Error"); } 
    finally { setLoading(false); }
  };

  const handleSendInvites = async () => {
    setLoading(true);
    try {
      await api.post('/student/send-request', { examRequestId, scribeIds: selectedScribes });
      setStep(3);
    } catch (err) { alert("Failed"); } 
    finally { setLoading(false); }
  };

  // Styles
  const bgClass = highContrast ? "bg-black text-yellow-400 border border-yellow-400" : "bg-white border border-slate-100 shadow-sm";
  const inputClass = highContrast ? "bg-black border-yellow-400 text-yellow-400" : "bg-white border-slate-300";
  const btnClass = highContrast ? "bg-yellow-400 text-black font-bold" : "bg-primary text-white";

  return (
    <div className={`max-w-4xl mx-auto ${highContrast ? 'bg-black min-h-screen p-4' : ''}`}>
      <div className="flex items-center justify-between mb-8 px-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center ${s !== 3 ? 'flex-1' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? btnClass : 'bg-slate-200 text-slate-500'}`}>{s}</div>
            {s !== 3 && <div className={`h-1 flex-1 mx-2 ${step > s ? (highContrast ? 'bg-yellow-400' : 'bg-primary') : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className={`p-8 rounded-2xl ${bgClass}`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar /> {t.request.title}</h2>
          <form onSubmit={handleCreateRequest} className="grid md:grid-cols-2 gap-6">
            <div><label className="text-sm font-semibold">{t.request.date}</label><input type="date" name="date" required onChange={handleInputChange} className={`w-full p-3 border rounded-xl ${inputClass}`} /></div>
            <div><label className="text-sm font-semibold">{t.request.time}</label><input type="time" name="time" required onChange={handleInputChange} className={`w-full p-3 border rounded-xl ${inputClass}`} /></div>
            <div><label className="text-sm font-semibold">{t.request.language}</label><select name="language" required onChange={handleInputChange} className={`w-full p-3 border rounded-xl uppercase ${inputClass}`}><option value="">Select</option>{metadata?.languages?.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></div>
            <div><label className="text-sm font-semibold">{t.request.city}</label><input name="city" placeholder={t.request.city} required onChange={handleInputChange} className={`w-full p-3 border rounded-xl ${inputClass}`} /></div>
            
            <section className="grid md:grid-cols-2 gap-4 col-span-2">
                <div><label className="text-sm font-semibold">{t.register.state}</label><select name="state" required onChange={handleInputChange} className={`w-full p-3 border rounded-xl uppercase ${inputClass}`}><option value="">State</option>{states.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div>
                <div><label className="text-sm font-semibold">{t.register.district}</label><select name="district" required onChange={handleInputChange} disabled={!formData.state} className={`w-full p-3 border rounded-xl uppercase ${inputClass}`}><option value="">District</option>{districts.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}</select></div>
            </section>

            <button type="submit" disabled={loading} className={`md:col-span-2 py-4 rounded-xl font-bold flex justify-center items-center gap-2 ${btnClass}`}>
              {loading ? <Loader2 className="animate-spin" /> : t.request.submit}
            </button>
          </form>
        </div>
      )}
      
      {/* Steps 2 and 3 follow similar translation pattern... */}
      {step === 2 && (
         <div className={`p-8 rounded-2xl ${bgClass}`}>
             <h2 className="text-2xl font-bold mb-4">{t.request.available}</h2>
             {/* List of scribes */}
             {availableScribes.map(scribe => (
                 <div key={scribe.scribe_id} onClick={() => setSelectedScribes(prev => prev.includes(scribe.scribe_id) ? prev.filter(id => id !== scribe.scribe_id) : [...prev, scribe.scribe_id])} 
                      className={`p-4 border-2 rounded-xl mb-2 cursor-pointer flex justify-between items-center ${selectedScribes.includes(scribe.scribe_id) ? (highContrast ? 'border-yellow-400 bg-yellow-900' : 'border-primary bg-blue-50') : 'border-slate-200'}`}>
                    <span>{scribe.first_name} {scribe.last_name}</span>
                    {selectedScribes.includes(scribe.scribe_id) && <CheckCircle size={20} />}
                 </div>
             ))}
             <button onClick={handleSendInvites} className={`w-full mt-4 py-4 rounded-xl font-bold flex justify-center gap-2 ${btnClass}`}>
                 {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> {t.request.send}</>}
             </button>
         </div>
      )}
      {/* --- ADD THIS STEP 3 BLOCK --- */}
      {step === 3 && (
        <div className={`p-10 rounded-2xl text-center ${bgClass}`}>
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Request Sent!</h2>
          <p className="text-slate-500 mb-8 text-lg">
            We have sent invites to the scribes you selected. 
            You will be notified when one of them accepts.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => window.location.href = '/student/dashboard'} 
              className={`px-8 py-3 rounded-xl font-bold border-2 border-slate-200 hover:bg-slate-50 text-slate-700`}
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className={`px-8 py-3 rounded-xl font-bold ${btnClass}`}
            >
              Make Another Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRequest;