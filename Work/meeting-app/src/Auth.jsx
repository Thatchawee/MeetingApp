import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true); // สลับโหมด Login / Signup
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        // --- โหมด Login ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Login successful!');
      } else {
        // --- โหมด Signup ---
        if (!username) throw new Error("Please enter a username.");
        
        // 1. สร้าง User ในระบบ Auth ของ Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        // 2. เอา Username ไปบันทึกลงตาราง users ของเราที่สร้างไว้
        if (authData.user) {
          const { error: dbError } = await supabase
            .from('users')
            .insert([{ id: authData.user.id, username: username }]);
          
          if (dbError) throw dbError;
        }
        setMessage('Signup successful! You can now log in.');
        setIsLogin(true); // กลับไปหน้า Login
      }
    } catch (error) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', backgroundColor: '#242424', borderRadius: '8px', color: 'white' }}>
      <h2>{isLogin ? 'Log In' : 'Sign Up'}</h2>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: 'none' }}
        />
        
        {!isLogin && (
          <input 
            type="text" 
            placeholder="Username (for invites)" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required={!isLogin} 
            style={{ padding: '10px', borderRadius: '4px', border: 'none' }}
          />
        )}

        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: 'none' }}
        />
        
        <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
        </button>
      </form>

      {message && <p style={{ color: message.includes('success') ? '#4caf50' : '#f44336', marginTop: '10px' }}>{message}</p>}

      <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span 
          onClick={() => setIsLogin(!isLogin)} 
          style={{ color: '#646cff', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isLogin ? 'Sign up here' : 'Log in here'}
        </span>
      </p>
    </div>
  );
}