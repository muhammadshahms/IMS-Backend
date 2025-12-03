// hooks/useSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '@/lib/socket';

export const useSocket = (postId?: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Initialize socket connection
        const socketInstance = socketService.initialize();
        setSocket(socketInstance);

        const handleConnect = () => {
            setIsConnected(true);
            // Auto-join post room if postId is provided
            if (postId) {
                socketService.joinPostRoom(postId);
            }
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);

        // Set initial connection state
        if (socketInstance.connected) {
            setIsConnected(true);
            if (postId) {
                socketService.joinPostRoom(postId);
            }
        }

        // Cleanup
        return () => {
            socketInstance.off('connect', handleConnect);
            socketInstance.off('disconnect', handleDisconnect);

            if (postId) {
                socketService.leavePostRoom(postId);
            }
        };
    }, [postId]);

    // Subscribe to socket events
    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        socket?.on(event, callback);
        return () => {
            socket?.off(event, callback);
        };
    }, [socket]);

    // Emit socket events
    const emit = useCallback((event: string, ...args: any[]) => {
        socket?.emit(event, ...args);
    }, [socket]);

    return {
        socket,
        isConnected,
        on,
        emit,
    };
};
