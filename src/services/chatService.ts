import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { apiClient } from './apiClient';

export interface Message {
    _id: string;
    booking?: string;
    sender: {
        _id: string;
        name: string;
        avatar?: string;
        role: string;
    };
    recipient: string;
    content: string;
    type: 'text' | 'image' | 'location' | 'system';
    chatType: 'booking' | 'support';
    createdAt: string;
}

class ChatService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(userId: string) {
        if (this.socket) return;

        this.socket = io(API_BASE_URL.replace('/api/v1', ''), {
            transports: ['websocket'],
            query: { userId }
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to chat server');
            this.socket?.emit('join', userId);
        });

        this.socket.on('receive_message', (message: Message) => {
            this.trigger('message', message);
        });

        this.socket.on('user_typing', (data: any) => {
            this.trigger('typing', data);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from chat server');
        });
    }

    joinBooking(bookingId: string) {
        this.socket?.emit('join_booking', bookingId);
    }

    on(event: 'message' | 'typing', callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: 'message' | 'typing', callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            this.listeners.set(event, eventListeners.filter(cb => cb !== callback));
        }
    }

    private trigger(event: string, data: any) {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    async getBookingMessages(bookingId: string) {
        const response = await apiClient.get(`/chat/booking/${bookingId}`);
        return response.data;
    }

    async getSupportMessages() {
        const response = await apiClient.get('/chat/support');
        return response.data;
    }

    async sendMessage(data: { 
        bookingId?: string; 
        recipientId: string; 
        content: string; 
        type?: string; 
        chatType?: string 
    }) {
        const response = await apiClient.post('/chat/send', data);
        return response.data;
    }

    sendTyping(data: { bookingId?: string; recipientId: string; isTyping: boolean }) {
        this.socket?.emit('typing', data);
    }

    sendLocation(data: { bookingId: string; latitude: number; longitude: number }) {
        this.socket?.emit('provider_location', data);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this.listeners.clear();
    }
}

export const chatService = new ChatService();
