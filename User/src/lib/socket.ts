// lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './constant';

class SocketService {
    private socket: Socket | null = null;
    private isInitialized = false;

    initialize() {
        if (this.isInitialized && this.socket?.connected) {
            return this.socket;
        }

        // Socket.IO will automatically send httpOnly cookies with the handshake
        // Backend will extract the token from cookies
        this.socket = io(SOCKET_URL, {
            withCredentials: true, // This ensures cookies are sent
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket.IO connected:', this.socket?.id);
            this.isInitialized = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket.IO disconnected:', reason);
            this.isInitialized = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error.message);
        });

        return this.socket;
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isInitialized = false;
        }
    }

    // Helper methods for common operations
    joinPostRoom(postId: string) {
        if (this.socket?.connected) {
            this.socket.emit('join:post', postId);
            console.log(`Joined post room: ${postId}`);
        }
    }

    leavePostRoom(postId: string) {
        if (this.socket?.connected) {
            this.socket.emit('leave:post', postId);
            console.log(`Left post room: ${postId}`);
        }
    }
}

// Export singleton instance
export const socketService = new SocketService();
