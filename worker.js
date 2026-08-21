// লাইভ JSON এর Raw লিংক (যেটা আপনার প্লেয়ারে কাজ করছে)
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dhaka-livestream/Toffee-playlist-autoupdate/main/NS_player.json';

export default {
  async fetch(request) {
    try {
      // ১. গিটহাব থেকে লেটেস্ট JSON ডাউনলোড
      const response = await fetch(GITHUB_RAW_URL);
      if (!response.ok) throw new Error('JSON ফাইল পাওয়া যায়নি');
      
      const channels = await response.json();
      
      // ২. M3U হেডার
      let m3uContent = '#EXTM3U\n';
      
      // ৩. প্রতিটি চ্যানেল ঘুরে M3U লাইন তৈরি
      for (const channel of channels) {
        const name = channel.name;
        const logo = channel.logo || '';
        let url = channel.link;
        const cookie = channel.cookie || '';

        // 🔥 সবচেয়ে গুরুত্বপূর্ণ অংশ: কুকি যোগ করা
        // OTT Navigator, Televizo, TiviMate (কিছু ভার্সন) এই ফরম্যাট সাপোর্ট করে
        if (cookie) {
          url = url + '|Cookie=' + encodeURIComponent(cookie);
        }

        // M3U এন্ট্রি তৈরি
        m3uContent += `#EXTINF:-1 tvg-logo="${logo}", ${name}\n`;
        m3uContent += `${url}\n`;
      }

      // ৪. M3U ফাইল রিটার্ন
      return new Response(m3uContent, {
        headers: {
          'Content-Type': 'audio/x-mpegurl', // অথবা application/vnd.apple.mpegurl
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      return new Response(`Server Error: ${error.message}`, { status: 500 });
    }
  }
};
