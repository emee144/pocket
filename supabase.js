import { createClient } from '@supabase/supabase-js';

// Replace with your own values from Supabase Project Settings
const SUPABASE_URL = 'https://xxwalosfezpaykyerznt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d2Fsb3NmZXpwYXlreWVyem50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTY0NzMsImV4cCI6MjA3NTAzMjQ3M30.uxMIactbxrJQPLAdd0I_4Rjmi6MnVrv9eG-CbxTtQ0c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
