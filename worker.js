// 📌 IMPORTANT: আপনার ফর্ক করা রিপোজিটরির NS_player.json-এর Raw লিংক দিন
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dhaka-livestream/Toffee-playlist-autoupdate/main/NS_player.json';

// চ্যানেলের নাম থেকে URL-এর জন্য কী তৈরি করা
function getChannelKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// GitHub থেকে লেটেস্ট JSON ডাটা আনা
async function getChannels() {
  const response = await fetch(GITHUB_RAW_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch NS_player.json');
  }
  const data = await response.json();
  const map = {};
  data.forEach(item => {
    const key = getChannelKey(item.name);
    map[key] = {
      link: item.link,
      cookie: item.cookie
    };
  });
  return map;
}

// মেইন হ্যান্ডলার
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // ---------- ১. প্লেলিস্ট (.m3u8) রিকোয়েস্ট ----------
    if (pathParts[0] === 'playlist' && pathParts[1]) {
      const channelKey = pathParts[1].replace('.m3u8', '');
      
      try {
        const channels = await getChannels();
        const info = channels[channelKey];
        
        if (!info) {
          return new Response(`Channel "${channelKey}" not found`, { status: 404 });
        }

        const m3uResponse = await fetch(info.link, {
          headers: {
            'Cookie': info.cookie
          }
        });

        if (!m3uResponse.ok) {
          return new Response('Failed to fetch original playlist', { status: 503 });
        }

        let content = await m3uResponse.text();
        const baseUrl = new URL(info.link);
        
        // .ts সেগমেন্টের লিংকগুলোকে প্রক্সির মাধ্যমে রিডাইরেক্ট করা
        content = content.replace(/(https?:\/\/[^\s]+\.ts)/gi, (match) => {
          const encodedUrl = encodeURIComponent(match);
          return `https://${url.host}/segment/${channelKey}?url=${encodedUrl}`;
        });

        content = content.replace(/(["'])(\/[^\s"']+\.ts)(["'])/gi, (match, p1, p2, p3) => {
          const fullUrl = new URL(p2, baseUrl.origin).href;
          const encodedUrl = encodeURIComponent(fullUrl);
          return `${p1}https://${url.host}/segment/${channelKey}?url=${encodedUrl}${p3}`;
        });

        return new Response(content, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*'
          }
        });

      } catch (error) {
        return new Response(`Server Error: ${error.message}`, { status: 500 });
      }
    }

    // ---------- ২. সেগমেন্ট (.ts) রিকোয়েস্ট ----------
    if (pathParts[0] === 'segment' && pathParts[1]) {
      const channelKey = pathParts[1];
      const targetUrl = url.searchParams.get('url');

      if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
      }

      try {
        const channels = await getChannels();
        const info = channels[channelKey];

        if (!info) {
          return new Response(`Channel "${channelKey}" not found`, { status: 404 });
        }

        const segmentResponse = await fetch(targetUrl, {
          headers: {
            'Cookie': info.cookie,
            'User-Agent': 'Mozilla/5.0'
          }
        });

        const newHeaders = new Headers(segmentResponse.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(segmentResponse.body, {
          status: segmentResponse.status,
          headers: newHeaders
        });

      } catch (error) {
        return new Response(`Segment Error: ${error.message}`, { status: 500 });
      }
    }

    // ---------- ৩. রুট পেইজ ----------
    return new Response(`
      <h1>Toffee Proxy is running! 🚀</h1>
      <p>Use: <code>/playlist/{channel_key}.m3u8</code></p>
      <p>Example: <code>/playlist/sony_ten_sports_1_hd.m3u8</code></p>
      <p>Check your NS_player.json keys for exact names (lowercase, underscores).</p>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
