import { useEffect, useRef } from 'react';
import { T } from '../i18n';

// Browser notification when it becomes the player's turn (only if tab is hidden).
export function useTurnNotification(isMyTurn, gameStateExists) {
  const wasMyTurn = useRef(false);
  useEffect(() => {
    // Request permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!gameStateExists) return;
    if (isMyTurn && !wasMyTurn.current) {
      // Just became my turn
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(T.msgs.yourTurnNotif, {
            tag: 'lechia-turn',
            renotify: true,
          });
          n.onclick = () => { window.focus(); n.close(); };
          // Auto-close after 5s
          setTimeout(() => n.close(), 5000);
        } catch {}
      }
      // Title flash
      const origTitle = document.title;
      if (document.hidden) {
        document.title = '🎲 ' + T.msgs.yourTurnNotif;
        const onVis = () => {
          if (!document.hidden) {
            document.title = origTitle;
            document.removeEventListener('visibilitychange', onVis);
          }
        };
        document.addEventListener('visibilitychange', onVis);
      }
    }
    wasMyTurn.current = isMyTurn;
  }, [isMyTurn, gameStateExists]);
}

// Confirm before unload while a game is in progress.
export function useLeaveConfirm(gameInProgress) {
  useEffect(() => {
    if (!gameInProgress) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = T.msgs.leaveConfirm;
      return T.msgs.leaveConfirm;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [gameInProgress]);
}
