import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import MeetingManager from './MeetingManager';
import MeetingCalendar from './MeetingCalendar';

export default function Dashboard({ session }) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const todayString = new Date().toISOString().split('T')[0];
  const [meetingDate, setMeetingDate] = useState(todayString);
  const [myMeetings, setMyMeetings] = useState([]);
  const [myInvites, setMyInvites] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  
  const [selectedMeeting, setSelectedMeeting] = useState(null); 
  const [activeCalendarMeeting, setActiveCalendarMeeting] = useState(null); 
  
  const [currentUser, setCurrentUser] = useState(null);

  const fetchMyMeetings = async () => {
    const { data: meetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });
    if (meetings) setMyMeetings(meetings);
  };
  
  const fetchMyInvites = async (username) => {
    const { data: invites } = await supabase
      .from('invites')
      .select(`*, meetings ( title, owner_id, meeting_date, finalized_time )`)
      .eq('invited_username', username);
    if (invites) setMyInvites(invites);
  };

  useEffect(() => {
    const fetchUserAndData = async () => {
      // ดึงข้อมูล User ปัจจุบัน
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (userData) {
        setCurrentUser(userData);
        fetchMyInvites(userData.username);
      }
      fetchMyMeetings();
    };
    fetchUserAndData();
  }, [session.user.id]);

  // 🔴 อัปเกรดระบบดักจับ Error ป้องกันปุ่มค้าง
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setCreateMessage('');

    const title = meetingTitle.trim();
    if (!title || !meetingDate) {
      setCreateMessage('Please enter a meeting title and date.');
      return;
    }

    if (!session?.user?.id) {
      setCreateMessage('Cannot create meeting because the current user session is missing.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: newMeeting, error } = await supabase
        .from('meetings')
        .insert([{ title, owner_id: session.user.id, meeting_date: meetingDate }])
        .select()
        .single();
      
      if (error) throw error; // ถ้า Database ฟ้อง Error ให้กระโดดไปที่ catch
      
      setMeetingTitle(''); 
      setMeetingDate(todayString); 
      setCreateMessage('Meeting created successfully.');
      if (newMeeting) setMyMeetings(prev => [newMeeting, ...prev]);
      fetchMyMeetings(); // รีเฟรชรายการ Meeting
      
    } catch (error) {
      setCreateMessage("Cannot create meeting: " + error.message);
      alert("❌ ไม่สามารถสร้าง Meeting ได้: " + error.message);
      console.error("Create Meeting Error:", error);
    } finally {
      setLoading(false); // หยุดหมุน Loading เสมอไม่ว่าจะสำเร็จหรือพัง
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to delete this meeting? All invites will be lost.")) return;
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
    if (!error) {
      setMyMeetings(prev => prev.filter(m => m.id !== meetingId));
    }
  };

  const handleInviteAction = async (inviteId, status) => {
    const { error } = await supabase.from('invites').update({ status: status }).eq('id', inviteId);
    if (!error && currentUser) {
      fetchMyInvites(currentUser.username);
    }
  };

  // --- ส่วนควบคุมการแสดงผลหน้าต่างๆ ---

  if (activeCalendarMeeting) {
    return (
      <MeetingCalendar 
        session={session} 
        meeting={activeCalendarMeeting} 
        onBack={() => {
          setActiveCalendarMeeting(null); 
          fetchMyMeetings(); 
        }} 
      />
    );
  }

  if (selectedMeeting) {
    return (
      <MeetingManager 
        session={session} 
        meeting={selectedMeeting} 
        onBack={() => {
          setSelectedMeeting(null); 
          fetchMyMeetings();
        }} 
      />
    );
  }

  return (
    <div>
      <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
        <h2 className="card-header">📥 My Invitations</h2>
        {myInvites.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No pending invitations. You're all caught up!</p>
        ) : (
          <ul className="list-container">
            {myInvites.map((invite) => (
              <li key={invite.id} className="list-item">
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{invite.meetings?.title || 'Unknown Meeting'}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>📅 Date: {invite.meetings?.meeting_date}</div>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge badge-${invite.status}`}>{invite.status.toUpperCase()}</span>
                    {invite.meetings?.finalized_time && (<span className="badge" style={{ marginLeft: '8px', backgroundColor: '#8b5cf6', color: 'white' }}>🔒 FINALIZED</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {invite.status === 'pending' ? (
                    <>
                      <button onClick={() => handleInviteAction(invite.id, 'accepted')} className="btn btn-success">✓ Accept</button>
                      <button onClick={() => handleInviteAction(invite.id, 'declined')} className="btn btn-outline" style={{ color: 'var(--danger)' }}>✕ Decline</button>
                    </>
                  ) : (
                    invite.status === 'accepted' && (
                      <button 
                        onClick={() => setActiveCalendarMeeting(invite.meetings ? { id: invite.meeting_id, ...invite.meetings } : {id: invite.meeting_id})} 
                        className="btn btn-primary"
                        style={{ fontWeight: 'bold' }}
                      >
                        🗓️ Open Calendar
                      </button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }} />

      <div className="card">
        <h2 className="card-header">➕ Create New Meeting</h2>
        <form onSubmit={handleCreateMeeting} noValidate style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="e.g., Weekly Team Sync" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="input-field" style={{ flex: 2, minWidth: '200px' }} required />
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="input-field" style={{ flex: 1, minWidth: '150px' }} required />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>{loading ? 'Creating...' : 'Create Meeting'}</button>
        </form>
        {createMessage && (
          <p style={{ margin: '12px 0 0', color: createMessage.includes('success') ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {createMessage}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="card-header">📂 Meetings I Manage</h2>
        {myMeetings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>You haven't created any meetings yet.</p>
        ) : (
          <ul className="list-container">
            {myMeetings.map((meeting) => (
              <li key={meeting.id} className="list-item">
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{meeting.title}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    📅 {meeting.meeting_date}
                    {meeting.finalized_time && <span style={{ color: '#8b5cf6', marginLeft: '10px', fontWeight: 'bold' }}>🔒 Time Locked</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setActiveCalendarMeeting(meeting)} 
                    className="btn btn-primary"
                    style={{ fontWeight: 'bold' }}
                  >
                    🗓️ View Calendar
                  </button>
                  <button onClick={() => setSelectedMeeting(meeting)} className="btn btn-outline" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>⚙️ Invite</button>
                  <button onClick={() => handleDeleteMeeting(meeting.id)} className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '8px' }}>🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
