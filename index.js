require("firebase-functions/lib/logger/compat");
// note to self, stop trying to make the new firebase logger happen. It doesn't report.

// Bucket config
const { Storage } = require("@google-cloud/storage");
const projectId = "osms-website";
const keyFilePath = "./key.json";
const storage = new Storage({ projectId, keyFilePath });
const bucket = storage.bucket("opensourcemedicalsupplies.org");
// end Bucket config

// HTTP / SC config
const Axios = require("axios");
const scURL = "https://smartcat.com/api/integration/v1/";
const { smartcatID, smartcatAPI } = process.env;
const base64Auth = Buffer.from(`${smartcatID}:${smartcatAPI}`).toString("base64");
const axios = Axios.create({
	baseURL: scURL,
	timeout: 5000,
	headers: {
		Authorization: `Basic ${base64Auth}`,
		Accept: "application/json",
	},
});
// end SC config

/**
 * Checks for a 'security' value in the body or header.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const checkSecurity = (req, res) => {
	// 'security' is a randomly generated string of sufficent length
	// stored at both ends of a request to provide a veil of safety.
	const { security } = process.env;

	if (
		!req.body ||
		!(req.body["security"] === security || req.header("security") === security)
	) {
		res.status(404).send();
		return false;
	}

	return true;
};

const AcceptedLangs = new Set([
	"ar-SA", // Arabic, Saudi Arabia
	"en-US", // English, United States
	"zh-CN", // Chinese, Simplified
	"fr-FR", // French, France
	"ru-RU", // Russian, Russian Federation
	"es-ES", // Spanish, Spain
	"pt-BR", // Portugese, Brazil
]);

/**
 * @param {string} sample
 * @returns {string|false}
 */
const getLang = (sample) => {
	if (!sample) {
		return false;
	} else if (AcceptedLangs.has(sample)) {
		return sample;
	}

	let target = false;
	AcceptedLangs.forEach((lang) => {
		if (lang.includes(sample)) {
			target = lang;
		}
	});
	return target;
};

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.upload = async (req, res) => {
	// Zaps only bind to a specific project(?), so only need to check for security key
	if (!checkSecurity(req, res)) {
		return;
	}

	if (!req.body.projectName.includes("Design Library")) {
		res.status(404).send();
		return;
	}

	console.log("incoming request");
	console.log(req.body);

	const projectURL = "project/" + req.body.projectID; // attr named in the Zap
	await axios.get(projectURL).then(
		/** @param {AxiosSCProjectResult} result */
		({ data }) => {
			console.log("axios request");
			console.log(data);

			/**
			 * Request all documentID tasks (convoluted) => gives 'id' === taskID
			 * then have to get the actual export from another endpoint GET ...document/export/{taskID}
			 * e.g. curl -X POST --header "Accept: application/json"
			 * "https://smartcat.com/api/integration/v1/document/export?documentIds=94183338c4fdfd1bb54f1100_10&documentIds=94183338c4fdfd1bb54f1100_10&type=target&stageNumber=1"
			 */

			const { documents } = data;
			let errors = false;
			documents.forEach(({ id, name, targetLanguage }, i) => {
				const docPostURL = "document/export";
				const docParams = {
					params: {
						type: "target",
						stageNumber: 1, // translation stage
						documentIds: id,
					},
				};
				// first get the document taskID...
				axios
					.post(docPostURL, null, docParams)
					.then(
						({ data }) => {
							console.log("SC doc POST");
							console.log(data);
							// then get the document
							const docGetURL = `document/export/${data.id}`;
							return axios.get(docGetURL);
						},
						(e) => {
							console.log(e);
							return e;
						}
					)
					.then(
						({ data }) => {
							if (typeof data !== "object") {
									console.error("file creation error. Data is not an object");
									console.log(data)
								return;
							}

							console.log("SC doc GET");
							console.log(data);
							// then upload the file to the gBucket
							const targetLang =
								targetLanguage.length < 5
									? getLang(targetLanguage)
									: targetLanguage;
							const fileName = targetLang + "_" + name + '.json';
							console.log("filename");
							console.log(fileName);
							const newFile = bucket.file(fileName);
							newFile.save(JSON.stringify(data), (e) =>
								e ? console.log(e) : res.write(fileName + " uploaded")
							);

							if (i === documents.length) {
								res
									.status(200)
									.send(
										"end of upload, " + errors
											? "errors occurred. see logs"
											: "no errors."
									);
							}
						},
						(e) => {
							errors = true;
							console.log(e);
							res.write("error in a file upload. see logs");
							if (i === documents.length) {
								res.status(400).send("end of upload, error(s) present. see logs");
							}
							return e;
						}
					);
			});
		},
		(e) => {
			console.log(e);
			res.status(400).send("critical error, see logs");
		}
	);
};

// Typedefs below

/**
 * @typedef {Object} SmartcatDocument
 * @property {string} id
 * @property {string} name
 * @property {string} creationDate
 * @property {string} sourceLanguage
 * @property {string} documentDisassemblingStatus
 * @property {string} targetLanguage
 * @property {string} status
 * @property {number} wordsCount
 * @property {string} statusModificationDate
 * @property {boolean} pretranslateCompleted
 * @property {Object[]} workflowStages
 * @property {string} externalId
 * @property {boolean} placeholdersAreEnabled
 */

/**
 * @typedef {Object} SmartcatProject
 * @property {string} id
 * @property {string} accountId
 * @property {string} name
 * @property {string} description
 * @property {string} creationDate
 * @property {string} createdByUserId
 * @property {string} createdByUserEmail
 * @property {string} modificationDate
 * @property {number} sourceLanguageId
 * @property {string} sourceLanguage
 * @property {string[]} targetLanguages
 * @property {string} status
 * @property {string} statusModificationDate
 * @property {string} clientId
 * @property {any[]} vendors
 * @property {Object[]} workflowStages
 * @property {SmartcatDocument[]} documents
 * @property {any[]} specializations
 * @property {string[]} managers
 * @property {Object} customFields
 */

/**
 * @typedef {Object} AxiosSCProjectResult
 * @property {SmartcatProject} data
 */
