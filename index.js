/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const logger = require("firebase-functions/lib/logger");
const { Storage } = require("@google-cloud/storage");

// Bucket config
const projectId = "osms-website";
const keyFilePath = "./key.json";
const storage = new Storage({ projectId, keyFilePath });
const bucket = storage.bucket("opensourcemedicalsupplies.org");
// end Bucket config

exports.upload = (req, res) => {
  const { security } = process.env;
  let message = 'success';
  let parsed;

  if (
    !req.body ||
    !(
      req.body['security'] === security ||
      req.header('security') === security
    )
  ) {
    res.status(404).send();
  }

  try {
    logger.log(req.body);
  } catch {
    logger.error('could not parse req.body', req);
  }
  res.status(200).send(message);
};
