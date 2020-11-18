/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const { Storage } = require("@google-cloud/storage");

// Bucket config
const projectId = "osms-website";
const keyFilePath = "./key.json";
const storage = new Storage({ projectId, keyFilePath });
const bucket = storage.bucket("opensourcemedicalsupplies.org");

exports.upload = (req, res) => {
    let message = 'hi';
    let parsed;

    try {
      parsed = JSON.parse(req.body);
    } catch {
      parsed = req.body;
    }
  
    if (parsed['security'] !== process.env.security) {
      res.status(404).send();
    }

    console.log(req)
    
    res.status(200).send(message);
  };
  