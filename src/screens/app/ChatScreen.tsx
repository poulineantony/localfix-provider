import React, { useEffect, useRef, useState } from 'react';
import { 
    ActivityIndicator, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { chatService, Message } from '../../services/chatService';

export const ChatScreen = ({ navigation, route }: any) => {
    const { bookingId, recipientId, jobTitle } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const loadMessages = async () => {
        try {
            let response: any;
            if (bookingId) {
                response = await chatService.getBookingMessages(bookingId);
            } else {
                response = await chatService.getSupportMessages();
            }

            if (response.success) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?._id) {
            chatService.connect(user._id);
            chatService.joinBooking(bookingId);
        }

        loadMessages();

        const handleNewMessage = (message: Message) => {
            if (message.booking === bookingId || message.chatType === 'support') {
                setMessages(prev => [...prev, message]);
                setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
            }
        };

        chatService.on('message', handleNewMessage);

        return () => {
            chatService.off('message', handleNewMessage);
            // chatService.disconnect(); // Let's keep it alive for other screens maybe?
        };
    }, [bookingId, user?._id]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const content = inputText.trim();
        setInputText('');

        try {
            const response = await chatService.sendMessage({
                bookingId,
                recipientId: recipientId || 'admin',
                content,
                chatType: bookingId ? 'booking' : 'support'
            }) as any;

            if (response.success) {
                // Optionally add to list immediately if not handled by socket bounce
                // setMessages(prev => [...prev, response.data]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender._id === user?._id;
        
        return (
            <View style={[
                s.messageContainer,
                isMe ? s.myMessage : s.theirMessage
            ]}>
                <View style={[
                    s.messageBubble,
                    isMe ? s.myBubble : s.theirBubble
                ]}>
                    <Text style={[
                        s.messageText,
                        isMe ? s.myMessageText : s.theirMessageText
                    ]}>
                        {item.content}
                    </Text>
                    <Text style={[
                        s.messageTime,
                        isMe ? s.myTime : s.theirTime
                    ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={s.headerTitleContainer}>
                    <Text style={s.headerTitle}>{jobTitle || 'Chat'}</Text>
                    <Text style={s.headerSubtitle}>Active now</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item._id}
                    renderItem={renderMessage}
                    contentContainerStyle={s.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={s.inputContainer}>
                    <TextInput
                        style={s.input}
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} 
                        onPress={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Icon name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        backgroundColor: '#fff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E0E0E0' 
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    headerSubtitle: { fontSize: 12, color: theme.colors.success },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 32 },
    messageContainer: { marginBottom: 12, maxWidth: '80%' },
    myMessage: { alignSelf: 'flex-end' },
    theirMessage: { alignSelf: 'flex-start' },
    messageBubble: { 
        padding: 12, 
        borderRadius: 18, 
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    myBubble: { 
        backgroundColor: theme.colors.primary, 
        borderBottomRightRadius: 2,
    },
    theirBubble: { 
        backgroundColor: '#fff', 
        borderBottomLeftRadius: 2,
    },
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#fff' },
    theirMessageText: { color: theme.colors.text },
    messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: theme.colors.textMuted },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0'
    },
    input: { 
        flex: 1, 
        backgroundColor: '#F0F2F5', 
        borderRadius: 24, 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        maxHeight: 100,
        fontSize: 15,
        color: theme.colors.text,
        marginRight: 10
    },
    sendBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    sendBtnDisabled: { backgroundColor: '#BDBDBD' }
});
