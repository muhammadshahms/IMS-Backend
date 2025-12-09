// socket/index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL,
                process.env.ADMIN_URL,
                process.env.LOCALHOST_URL,
                process.env.USER_URL,
            ].filter(Boolean),
            credentials: true,
        },
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            // Try to get token from multiple sources
            let token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.split(' ')[1];

            // If no token in auth or headers, try to get from cookies
            if (!token) {
                const cookies = socket.handshake.headers.cookie;
                if (cookies) {
                    const tokenCookie = cookies.split('; ').find(row => row.startsWith('token='));
                    if (tokenCookie) {
                        token = tokenCookie.split('=')[1];
                    }
                }
            }

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.userId}`);

        // Join user's personal room for direct messages
        socket.join(socket.userId);

        // Join a post room for real-time comment updates
        socket.on('join:post', (postId) => {
            socket.join(`post:${postId}`);
            console.log(`User ${socket.userId} joined post room: ${postId}`);
        });

        // Leave a post room
        socket.on('leave:post', (postId) => {
            socket.leave(`post:${postId}`);
            console.log(`User ${socket.userId} left post room: ${postId}`);
        });

        // Typing indicators
        socket.on('typing', ({ receiverId }) => {
            socket.to(receiverId).emit('typing', { userId: socket.userId });
        });

        socket.on('stop_typing', ({ receiverId }) => {
            socket.to(receiverId).emit('stop_typing', { userId: socket.userId });
        });


        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getIO };
