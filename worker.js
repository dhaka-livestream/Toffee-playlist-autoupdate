// 🌟 রিডাইরেক্ট প্রক্সি
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dhaka-livestream/Toffee-playlist-autoupdate/main/NS_player.json';

// চ্যানেলের নাম থেকে কী তৈরি করা
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // যদি /playlist/চ্যানেল_কী.m3u8 হয়, তাহলে সরাসরি রিডাইরেক্ট করো
    if (pathParts[0] === 'playlist' && pathParts[1]) {
      const channelKey = pathParts[1].replace('.m3u8', '');
      
      try {
        const channels = await getChannels();
        const info = channels[channelKey];
        
        if (!info) {
          return new Response(`Channel "${channelKey}" not found`, { status: 404 });
        }

        // 🎯 আসল লিংক (কুকি সহ) তৈরি করা
        const finalUrl = new URL(info.link);
        // কুকি কুয়েরি প্যারামিটার হিসেবে যোগ করা (শুধু কিছু প্লেয়ারের জন্য)
        finalUrl.searchParams.set('cookie', info.cookie);

        // ৩০২ রিডাইরেক্ট পাঠানো
        return Response.redirect(finalUrl.href, 302);

      } catch (error) {
        return new Response(`Server Error: ${error.message}`, { status: 500 });
      }
    }

    // রুট পেইজ (হোমপেইজ)
    return new Response(`
      <h1>Toffee Redirect Proxy 🚀</h1>
      <p>Use: <code>/playlist/{channel_key}.m3u8</code></p>
      <p>Example: <code>/playlist/sony_ten_sports_1_hd.m3u8</code></p>
      <p>⚠️ Warning: This simply redirects to the original stream. Some players may not work.</p>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
