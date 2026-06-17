import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


const SUPABASE_URL = 'https://jguzfgoqqbfkzcrhpjly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndXpmZ29xcWJma3pjcmhwamx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzE5NDIsImV4cCI6MjA5MjYwNzk0Mn0.6bD2cu5bUYGblb2nw_zR5YMR1dAyfuiOLPY5DtTeFX4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
