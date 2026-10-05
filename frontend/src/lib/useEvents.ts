import { useEffect } from 'react';

export function useSSE(onFileChanged?: (data: { exercise_id: string; file: string }) => void) {
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    function connect() {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('file_changed', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (onFileChanged) onFileChanged(data);
        } catch (err) {
          console.error('Failed to parse file_changed event payload', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry connection after 3 seconds
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, [onFileChanged]);
}
