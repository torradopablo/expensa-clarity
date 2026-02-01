import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Hook to manage session timeout based on user inactivity.
 * @param timeoutMs Timeout in milliseconds (default: 30 minutes)
 */
export const useSessionTimeout = (timeoutMs: number = 60 * 60 * 1000) => {
    const navigate = useNavigate();
    const timerRef = useRef<any>(null);

    const logout = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await supabase.auth.signOut();
            toast.info("Sesión cerrada por inactividad");
            navigate("/auth");
        }
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(logout, timeoutMs);
    }, [logout, timeoutMs]);

    useEffect(() => {
        // Events that count as activity
        const events = [
            "mousedown",
            "mousemove",
            "keypress",
            "scroll",
            "touchstart",
            "click"
        ];

        const handleActivity = () => {
            resetTimer();
        };

        // Only start monitoring if there's a session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                resetTimer();
                events.forEach((event) => {
                    document.addEventListener(event, handleActivity);
                });
            }
        };

        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
                resetTimer();
                events.forEach((event) => {
                    document.addEventListener(event, handleActivity);
                });
            } else if (event === "SIGNED_OUT") {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
                events.forEach((event) => {
                    document.removeEventListener(event, handleActivity);
                });
            }
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach((event) => {
                document.removeEventListener(event, handleActivity);
            });
            subscription.unsubscribe();
        };
    }, [resetTimer]);
};
