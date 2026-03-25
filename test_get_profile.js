const https = require('https');
const payload = 'action=get_profile&tamil_client_id=2362&profile_id=2362';
const options = {
    hostname: 'nadarmahamai.com',
    port: 443,
    path: '/api/get-profile.php',
    method: 'POST',
    headers: {
        'Cookie': 'humans_21909=1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': payload.length
    }
};
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            const data = json.data || json;
            console.log("Keys available in profile:", Object.keys(data).join(', '));
            console.log("Contact fields:");
            for (let k in data) {
                 if (k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile') || k.toLowerCase().includes('contact') || k.toLowerCase().includes('cell') || k.toLowerCase().includes('num')) {
                      console.log(`${k}: ${data[k]}`);
                 }
            }
        } catch (e) {
            console.log("Error parsing JSON:", e.message, body.substring(0, 100));
        }
    });
});
req.write(payload);
req.end();
