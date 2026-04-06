import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
// ลบ import MeetingCalendar ออก เพราะไม่ใช้ในหน้านี้แล้ว

export default function MeetingManager({ session, meeting, onBack }) {
  const [inviteUsername, setInviteUsername] = useState('');
  const [invites, setInvites] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ลบ const [showCalendar, setShowCalendar] = useState(false); ออก

  const fetchInvites = async () => {
    const { data: invitesData, error } = await supabase
      .from('invites')
      .select('*')
      .eq('meeting_id', meeting.id);
    
    if (!error && invitesData) setInvites(invitesData);
  };

  useEffect(() => {
    fetchInvites();
  }, [meeting.id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setLoading(true);
    setMessage('');

    try {
      const { data: userExist, error: userErr } = await supabase
        .from('users')
        .select('username')
        .eq('username', inviteUsername)
        .single();

      if (userErr || !userExist) {
        throw new Error("Username not found!");
      }

      // เช็คว่าเชิญตัวเองหรือเปล่า
      if (userExist.username === session.user.user_metadata?.username) {
        throw new Error("You cannot invite yourself!");
      }

      const { error: insertErr } = await supabase
        .from('invites')
        .insert([{ meeting_id: meeting.id, invited_username: inviteUsername, status: 'pending' }]);

      if (insertErr) throw insertErr;

      setMessage(`✅ Invite sent successfully to ${inviteUsername}!`);
      setInviteUsername('');
      fetchInvites(); 
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius)', color: 'var(--text-main)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      
      {/* 🔴 ส่วนปุ่มควบคุมด้านบน มีแค่ปุ่ม Back อย่างเดียว */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ borderColor: 'var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ← Back to Dashboard
        </button>
      </div>

      <h2 className="card-header" style={{ marginBottom: '24px' }}>
        Managing Invitations: <span style={{ color: '#c084fc' }}>{meeting.title}</span>
      </h2>

      {/* ส่วนส่งคำเชิญ */}
      <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Invite a Friend</h3>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="text" placeholder="Enter exact Username" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} className="input-field" style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#0f172a', color: 'white' }} required />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px 20px', fontWeight: 'bold' }}>
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
        {message && <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '0.95rem' }}>{message}</p>}
      </div>

      {/* ส่วนแสดงรายชื่อคนที่เชิญไปแล้ว */}
      <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Invited Users</h3>
        {invites.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '15px' }}>No one invited yet.</p>
        ) : (
          <ul className="list-container">
            {invites.map((inv) => (
              <li key={inv.id} className="list-item" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.05rem' }}>👤 {inv.invited_username}</span>
                <span className={`badge badge-${inv.status}`}>{inv.status.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}