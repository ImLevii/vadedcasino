const io = require('../server');
const { sql } = require('../../database');
const channels = {};

const limit = 50;

const channelsIds = ['VIP', 'EN', 'BEG', 'GR', 'TR'];
channelsIds.forEach(channel => {
    channels[channel] = {};
});

async function cacheChannels() {

    await Promise.all(channelsIds.map(async channel => {

        const [messages] = await sql.query(`
            SELECT users.username, content, users.role, users.xp, chatMessages.id, chatMessages.content, chatMessages.senderId, chatMessages.type, chatMessages.replyTo, chatMessages.createdAt FROM chatMessages
            LEFT JOIN users ON users.id = chatMessages.senderId
            WHERE (chatMessages.channelId = ? OR chatMessages.channelId IS NULL) AND deletedAt IS NULL AND chatMessages.type != 'rain-end'
            ORDER BY chatMessages.id DESC LIMIT ?;
        `, [channel, limit]);

        let recentMessages = [];

        messages.reverse().forEach(e => {

            if (!['system', 'user'].includes(e.type)) e.content = JSON.parse(e.content);

            if (e.type == 'clear') {
                recentMessages = [];
                e.content = 'Chat cleared.';
                e.type = 'system';
            }

            recentMessages.push({
                id: e.id,
                content: e.content,
                replyTo: e.replyTo,
                type: e.type,
                createdAt: e.createdAt,
                user: e.senderId && {
                    id: e.senderId,
                    username: e.username,
                    role: e.role,
                    xp: e.xp
                }
            });
            
        });

        channels[channel].messages = recentMessages;

    }));

}

function newMessage(message, channelId = null) {
    const handleNewMessage = (channel) => {
        if (message.type === 'rain-end') return; // broadcast only, never cache
        channel.messages.push(message);
        if (channel.messages.length > limit) channel.messages.shift();
    };

    if (!channelId) {
        io.emit('chat:pushMessage', [message]);
        channelsIds.forEach(id => handleNewMessage(channels[id]));
    } else {
        io.to(channelId).emit('chat:pushMessage', [message]);
        handleNewMessage(channels[channelId]);
    }
}



function sendSystemMessage(socket, message) {

    return socket.emit('chat:pushMessage', [{
        type: 'system',
        content: message,
        createdAt: Date.now(),
        replyTo: null,
        user: null
    }]);

}

let lastOnlineUsers = {};
const multiplier = process.env.NODE_ENV == 'production' ? 2.5 : 1;

async function sendOnlineUsers(socket, cache) {

    const channelsUsers = {};
    let total = 0;

    channelsIds.forEach(channel => {
        const channelCount = Math.floor((io.sockets.adapter.rooms.get(channel)?.size || 0) * multiplier);
        total += channelCount;
        channelsUsers[channel] = channelCount;
    });

    total = Math.floor(io.sockets.sockets.size * multiplier);

    const onlineUsers = {
        total,
        channels: channelsUsers
    };

    if (cache) {
        if (JSON.stringify(onlineUsers) == JSON.stringify(lastOnlineUsers)) return;
        lastOnlineUsers = onlineUsers;
    }

    socket.emit('misc:onlineUsers', onlineUsers);

}

module.exports = {
    sendSystemMessage,
    sendOnlineUsers,
    cacheChannels,
    newMessage,
    channels
}