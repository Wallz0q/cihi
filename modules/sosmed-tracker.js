const axios = require('axios');

async function track(username) {
    const platforms = [
        { name: 'Instagram', url: `https://www.instagram.com/${username}` },
        { name: 'Twitter/X', url: `https://twitter.com/${username}` },
        { name: 'TikTok', url: `https://www.tiktok.com/@${username}` },
        { name: 'Facebook', url: `https://www.facebook.com/${username}` },
        { name: 'YouTube', url: `https://www.youtube.com/@${username}` },
        { name: 'GitHub', url: `https://github.com/${username}` },
        { name: 'Reddit', url: `https://www.reddit.com/user/${username}` },
        { name: 'Pinterest', url: `https://www.pinterest.com/${username}` },
        { name: 'Snapchat', url: `https://www.snapchat.com/add/${username}` },
        { name: 'Tumblr', url: `https://${username}.tumblr.com` },
        { name: 'LinkedIn', url: `https://www.linkedin.com/in/${username}` },
        { name: 'Twitch', url: `https://www.twitch.tv/${username}` },
        { name: 'Spotify', url: `https://open.spotify.com/user/${username}` },
        { name: 'Steam', url: `https://steamcommunity.com/id/${username}` },
        { name: 'Discord', url: `https://discord.com/users/${username}` },
        { name: 'OnlyFans', url: `https://onlyfans.com/${username}` },
        { name: 'Patreon', url: `https://www.patreon.com/${username}` },
        { name: 'Telegram', url: `https://t.me/${username}` },
        { name: 'WhatsApp', url: `https://wa.me/${username}` },
        { name: 'Signal', url: `https://signal.me/#p/${username}` }
    ];
    
    const results = await Promise.all(platforms.map(async (platform) => {
        try {
            const response = await axios.head(platform.url, { timeout: 3000 });
            return {
                name: platform.name,
                found: response.status === 200,
                profilePic: null // Would need actual profile pic scraping
            };
        } catch (error) {
            return {
                name: platform.name,
                found: false,
                profilePic: null
            };
        }
    }));
    
    return { platforms: results };
}

module.exports = { track };