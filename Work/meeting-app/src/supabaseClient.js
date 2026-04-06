// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pobluqihednbjnazwjov.supabase.co'; // เช่น 'https://xyz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmx1cWloZWRuYmpuYXp3am92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDgxNDYsImV4cCI6MjA4OTMyNDE0Nn0.9ICVtUk-X9kZK3HKTSynyxJ5IsA_Bd0e1uDfM4tI5jY'; // คีย์ยาวๆ ที่ก็อปมา

export const supabase = createClient(supabaseUrl, supabaseKey);