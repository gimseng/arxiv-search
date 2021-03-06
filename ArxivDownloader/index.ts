'use strict';

import * as rp from 'request-promise-native'
import * as fs from 'fs'
import * as request from 'request'

type api_params = {
    key: string
    id: string,
};
var api_vals: api_params = require('./aws-api-key.json');

const client_id = process.env['CLIENT_ID'] || "unknown";
const EdsURI = "https://k83jynyecj.execute-api.us-east-1.amazonaws.com/v1/testprocesswork"
const EricsURI = 'https://o8spaqhcc5.execute-api.us-east-1.amazonaws.com/v1/testprocesswork'
const uris = [
    EdsURI,
    EricsURI
];


type paper_data = {
    idvv: string,
    field: string,
    fetch: string,
    submit: string
};

type failed_paper = {
    idvv: string,
    field: string
};
const MAX_TRIES = 2;

let fails: failed_paper[] = [];
let succ: string[] = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function awaitEvent(item, eventName) { return new Promise<any>((resolve, reject) => item.on(eventName, resolve)) }

/**
 * Attempts to download the paper up to MAX_TRIES number of times. 
 * Returns a promise which resolves when the download completes, or rejects if the maximum number of attempts was reached.
 * @param url url to download
 * @param filename filename to place the document
 */
async function downloadPaper(url, filename): Promise<request.Response> {
    let try_again: boolean;
    let attempts = 0;
    do {
        attempts++;
        let r = request.get({
            'uri': url,
            headers: {
                "User-Agent": "request"
            }
        });
        r.pause();
        // wait for the response
        let dl_response: any = await awaitEvent(r, "response");
        if (dl_response.statusCode === 200) {
            let file = r.pipe(fs.createWriteStream(filename)) //pipe to where you want it to go
            r.resume();
            let e: request.Response = await awaitEvent(file, 'finish');
            return e;
        } else {
            console.log(`Got status ${dl_response.statusCode} on attempt ${attempts}`)
            if (attempts < MAX_TRIES) {
                try_again = true;
            } else {
                try_again = false;
                throw new Error(`Failed on MAX_TRIES (${MAX_TRIES}) download attempts, so moving on...`);
            }
        }
        await sleep(5000);
    } while (try_again)
}

function uploadPaper(url, filename) {
    let stats = fs.statSync(filename);
    return new Promise((resolve, reject) => {
        fs.createReadStream(filename).pipe(request.put({
            uri: url,
            headers: {
                'Content-Length': stats['size']
            }
        }, (err, res, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        }));
    });
}



function deleteFile(filename) {
    return new Promise((resolve, reject) => {
        fs.unlink(filename, (ferr) => {
            if (ferr) {
                console.log("Error deleting " + filename + " : " + ferr)
                reject(ferr)
            } else {
                resolve()
            }
        })
    });
}

type errorEvent = {
    kind: "error",
    client_id: string,
    errors: { idvv: string, field: string }[]
};

async function run(uri) {
    const options = {
        uri,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        body: {
            'kind': 'request',
            client_id
        },
        json: true // Automatically parses the JSON string in the response
    }
    let resp = await rp.post(options);
    console.log(`Got response of length ${resp.length}`)
    for (let paper of resp) {
        let filename = paper.idvv + "." + paper.field;
        try {
            await downloadPaper(paper.fetch, filename);
            console.log(`Downloaded ${filename}`);
        } catch (e) {
            console.log("Download request failed. Probably set to dead?")
            fails.push({
                idvv: paper.idvv,
                field: paper.field
            });
            continue; // skip the rest for this paper, since we couldn't download it
        }
        // validate file ?
        try {
            await uploadPaper(paper.submit, filename);
            console.log(`Uploaded ${filename}`);
        } catch (e) {
            console.log("Upload request failed. Probably set to error?")
            fails.push({
                idvv: paper.idvv,
                field: paper.field
            });
            continue; // skip the rest for this paper, since we couldn't download it
        }
        await deleteFile(filename);
        await sleep(1001);
    }
    console.log("Succeeded papers: " + succ)
    if (fails) {
        let body: errorEvent = {
            client_id,
            errors: fails,
            kind: "error"
        }
        let new_options = { ...options, body }
        await rp.post(new_options);
        console.log("Submitted failed papers: " + JSON.stringify(fails));
    }
    return resp.length;
}

let interupt = false;
async function main() {
    while (true) {
        let total = 0;
        for (let uri of uris) {
            total += await run(uri);
        }
        if(total === 0) {return;}
        if(interupt) {return;}
        if(!process.env["DL_FOREVER"]) {return;}
    }
}

process.on('SIGINT', function () {
    console.log("Caught interrupt signal. Waiting for the cycle to finish. Interupt again to force an exit.");
    if (interupt) {
        console.log("Forcing exit.")
        process.exit();
    }
    interupt = true;
});

main().catch(
    (err) => {
        console.log("Request error!")
        console.log(err)
    }
)