# Google Cloud Function to pull Airtable into a Google Bucket
To the result of caching in a higher capacity than Airtable affords

## Setup a dev env
There's a google api-doc page somewhere.

## API Docs
https://googleapis.dev/nodejs/storage/latest/

## Update CORS for bucket
Note: currently set up for prod, prod-test, and localhost:3000 for React.

From this root dir, run (one line):
```
gsutil cors set ./bucket-config.json gs://opensourcemedicalsupplies.org
```

To wipe out the CORS settings (why would you?) run the same command, but w/ a JSON file containing only:
```
[]
```