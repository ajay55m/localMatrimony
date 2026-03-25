const https = require('https');
const fs = require('fs');

function makeReq(action, data) {
    return new Promise(resolve => {
        const options = {
            hostname: 'nadarmahamai.com',
            port: 443,
            path: '/api/selected-profiles.php',
            method: 'POST',
            headers: {
                'Cookie': 'humans_21909=1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => { body += d; });
            res.on('end', () => { 
                resolve({ action, body });
            });
        });
        req.write(data);
        req.end();
    });
}

async function run() {
    const r1 = await makeReq('get_viewed_profiles', 'tamil_client_id=140&action=get_viewed_profiles');
    const r2 = await makeReq('get_selected_profiles', 'tamil_client_id=140&action=get_selected_profiles');
    fs.writeFileSync('d:/NativeApp/api_results.json', JSON.stringify({ r1, r2 }, null, 2));
}

run();
