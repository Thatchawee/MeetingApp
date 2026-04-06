import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import MeetingCalendar from './MeetingCalendar';
import Auth from './Auth';
import Dashboard from './Dashboard';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  // 🔴 1. เพิ่ม state สำหรับเก็บ username
  const [username, setUsername] = useState(null);

  useEffect(() => {
    // 🔴 2. ฟังก์ชันดึงข้อมูลชื่อ user มาเก็บไว้
    const fetchSessionAndUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .single();
        if (userData) setUsername(userData.username);
      }
    };
    fetchSessionAndUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .single();
        if (userData) setUsername(userData.username);
      } else {
        setUsername(null); // ล้างชื่อเมื่อ logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app-container">
      {!session ? (
        <Auth />
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Des422 Sync
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* 🔴 3. เพิ่มการแสดงผล username ข้างๆ email ในส่วนหัว */}
              <span style={{ color: 'var(--text-muted)' }}>
                Logged in as: <strong>{username || 'Loading...'}</strong> ({session.user.email})
              </span>
              <button onClick={handleLogout} className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                Logout
              </button>
            </div>
          </div>
          
          <Dashboard session={session} />
          
        </div>
      )}
    </div>
  );
}

export default App;