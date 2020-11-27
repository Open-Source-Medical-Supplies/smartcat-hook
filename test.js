const retrievedLog = require('./logs/downloaded-logs-20201125-222228.json');

const parse = () => {
    const {textPayload} = retrievedLog[1];
    const body = textPayload.match(/\sbody: (\{ .* \}),/)[1];
    console.log(typeof body);
    console.log(body['source'])
}

exports.test = () => {
    parse();
}
