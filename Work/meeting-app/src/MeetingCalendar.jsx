import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './MeetingCalendar.css';

export default function MeetingCalendar({ session, meeting, onBack }) {
  const [allTimes, setAllTimes] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(1); 
  const [currentTime, setCurrentTime] = useState(new Date());

  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const currentDate = meeting.meeting_date || new Date().toISOString().split('T')[0]; 
  const isOwner = meeting.owner_id === session.user.id; 
  const isFinalized = !!meeting.finalized_time; 

  const currentHour = String(currentTime.getHours()).padStart(2, '0');
  const currentMinute = String(currentTime.getMinutes()).padStart(2, '0');
  const timeString = `${currentHour}:${currentMinute}`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    const { data: invites } = await supabase.from('invites').select('*').eq('meeting_id', meeting.id).eq('status', 'accepted');
    setTotalParticipants(1 + (invites ? invites.length : 0));

    const { data: times } = await supabase.from('available_times').select('*').eq('meeting_id', meeting.id);
    if (times) setAllTimes(times);
  };

  useEffect(() => { loadData(); }, [meeting.id]);

  const isPast = (slotStr) => {
    const slotTime = new Date(slotStr);
    return slotTime < currentTime; 
  };

  const handleFinalize = async (slotStr) => {
    await supabase.from('meetings').update({ finalized_time: slotStr }).eq('id', meeting.id);
    alert('Meeting time has been locked successfully!');
    onBack(); 
  };

  const toggleSlot = async (slotStr, formattedHour) => {
    if (isFinalized || isPast(slotStr)) return;

    const existingRecord = allTimes.find(t => t.time_slot === slotStr && t.user_id === session.user.id);
    const voteCount = allTimes.filter(t => t.time_slot === slotStr).length;

    if (isOwner) {
      if (existingRecord && voteCount > 1) {
        const confirmLock = window.confirm(
          `Do you want to LOCK the meeting at ${formattedHour}:00?\n\n- Click "OK" to LOCK this time.\n- Click "Cancel" to UNSELECT your vote.`
        );
        
        if (confirmLock) {
          handleFinalize(slotStr);
          return;
        }
      }
    }

    try {
      if (existingRecord) {
        const { error } = await supabase.from('available_times').delete().eq('id', existingRecord.id);
        if (error) throw error;
        setAllTimes(prev => prev.filter(t => t.id !== existingRecord.id));
      } else {
        const { data, error } = await supabase.from('available_times').insert([{ meeting_id: meeting.id, user_id: session.user.id, time_slot: slotStr }]).select();
        if (error) throw error;
        if (data && data[0]) setAllTimes(prev => [...prev, data[0]]);
      }
    } catch (err) {
      alert("❌ ไม่สามารถเลือกเวลาได้: " + err.message);
      console.error(err);
    }
  };

  const isSelectedByMe = (slotStr) => {
    return allTimes.some(t => t.time_slot === slotStr && t.user_id === session.user.id);
  };

  return (
    <div className="calendar-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ borderColor: 'var(--border)' }}>← Back</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge badge-pending" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📅 {currentDate}
          </span>
          <span className="badge" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            ⏰ {timeString}
          </span>
        </div>
      </div>
      
      <h2 className="card-header">🗓️ Calendar: {meeting.title}</h2>
      
      {isFinalized ? (
        <div style={{ padding: '15px', backgroundColor: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
          <h3 style={{ color: '#c4b5fd', margin: '0 0 5px 0' }}>🔒 Meeting Time is Locked!</h3>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            Scheduled for: <strong>{new Date(meeting.finalized_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)' }}>
            Expected Participants: <strong>{totalParticipants} person(s)</strong> (Owner + Accepted)
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px', color: '#fbbf24' }}>
            {isOwner ? "💡 Tip: Click on a green slot to LOCK the meeting time. Click again to unselect." : "Click on the slots to mark your availability."}
          </p>
        </>
      )}

      <div className="calendar-list">
        {hours.map(hour => {
          const formattedHour = hour.toString().padStart(2, '0');
          const slotString = `${currentDate}T${formattedHour}:00:00+00:00`;

          const past = isPast(slotString);
          const selected = isSelectedByMe(slotString);
          const isThisTheFinalTime = meeting.finalized_time === slotString;

          // 🔴 1. ดึงข้อมูลว่าใครโหวตสล็อตนี้บ้าง
          const slotVotes = allTimes.filter(t => t.time_slot === slotString);
          const voteCount = slotVotes.length;
          
          // 🔴 2. เช็คว่า "เจ้าของห้อง (Owner)" อยู่ในกลุ่มคนที่โหวตสล็อตนี้ไหม?
          const ownerVoted = slotVotes.some(t => t.user_id === meeting.owner_id);

          const intersection = voteCount >= 2; 
          const everyoneFree = voteCount === totalParticipants && totalParticipants > 1; 

          let slotClass = "time-slot";
          if (isThisTheFinalTime) {
            slotClass += " intersection"; 
          } else if (isFinalized) {
            slotClass += " past"; 
          } else if (past) {
            slotClass += " past";
          } else if (intersection) {
            slotClass += " intersection"; 
          } else if (selected) {
            slotClass += " selected";
          }

          return (
            <div key={slotString} onClick={() => toggleSlot(slotString, formattedHour)} className={slotClass}>
              <div style={{ marginBottom: '4px' }}>
                {formattedHour}:00 - {String(hour + 1).padStart(2, '0')}:00
              </div>
              
              {!isFinalized && !past && voteCount > 0 && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 'bold', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px',
                  backgroundColor: intersection ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginTop: '4px'
                }}>
                  {/* 🔴 3. แสดงมงกุฎถ้า Owner โหวต และแสดงรูปคนตามความเหมาะสม */}
                  {ownerVoted && <span title="Owner is available">👑</span>}
                  {(!ownerVoted || voteCount > 1) && <span title="Participant(s) available">👤</span>}
                  <span style={{ marginLeft: '2px' }}>{voteCount}/{totalParticipants}</span>
                </div>
              )}

              {isThisTheFinalTime && <div style={{ fontSize: '0.8rem', marginTop: '6px', fontWeight: 'bold', color: '#fde047' }}>⭐ FINAL TIME ⭐</div>}
              
              {!isFinalized && intersection && (
                <div style={{ fontSize: '0.75rem', marginTop: '6px', opacity: 0.9 }}>
                  {everyoneFree ? "Everyone Free!" : "Match Found!"}
                </div>
              )}
              
              {!isFinalized && past && <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>(Past)</div>}
            </div>
          );
        })}
      </div>

      {!isFinalized && (
        <div className="legend-container">
          <h3>Legend:</h3>
          <p className="legend-item"><span className="text-blue">Blue:</span> Your selected time</p>
          <p className="legend-item"><span className="text-green">Green:</span> Intersection (Matched with others)</p>
          <p className="legend-item" style={{ marginTop: '10px' }}>👑 = Owner available &nbsp;&nbsp;|&nbsp;&nbsp; 👤 = Participant available</p>
        </div>
      )}
    </div>
  );
}
