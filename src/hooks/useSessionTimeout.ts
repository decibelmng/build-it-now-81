import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_MS = 5 * 60 * 1000;
const CHECK_INTERVAL = 30 * 1000;

export const useSessionTimeout = () => {
  const lastActivity = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;

      if (elapsed >= TIMEOUT_MS) {
        clearInterval(interval);
        supabase.auth.signOut().then(() => {
          navigate('/auth');
          toast({
            title: 'Session expired',
            description: 'You were signed out due to inactivity',
          });
        });
      } else if (elapsed >= TIMEOUT_MS - WARNING_MS) {
        setShowWarning(true);
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [resetTimer, navigate, toast]);

  return { showWarning, resetTimer };
};
