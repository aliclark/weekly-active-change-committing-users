const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

async function runQuery(query) {
  const options = {
    query: query,
    location: 'US',
  }
  const [job] = await bigquery.createQueryJob(options)
  const [rows] = await job.getQueryResults()
  return rows
}

// FIXME: will need to refine the "pairs" using HAVING for the next lot.
// Then return the pairs, not the distincts.
const loginsNamesQuery = `SELECT COUNT(DISTINCT login_name_pairs.login) AS login, login_names.names AS names
  FROM
    (SELECT actor.login AS login, JSON_EXTRACT_SCALAR(payload, '$.commits[0].author.name') AS name
      FROM githubarchive.day.20210306
      WHERE type='PushEvent'
      GROUP BY name, login)
     AS login_name_pairs,
    (SELECT actor.login AS login, COUNT(DISTINCT JSON_EXTRACT_SCALAR(payload, '$.commits[0].author.name')) AS names
      FROM githubarchive.day.20210306
      WHERE type='PushEvent'
      GROUP BY login)
     AS login_names
  WHERE login_name_pairs.login=login_names.login
  GROUP BY names
  ORDER BY names`

function getLoginsNamesHistogram() {
  return runQuery(loginsNamesQuery)
}

function getNamesLoginsHistogram(namesThreshold) {
  return runQuery(`

-- TODO: test with some HAVING threshold eg. 12

SELECT COUNT(DISTINCT name_login_pairs.name) AS names, name_logins.logins AS logins
  FROM
    (${loginsNamesQuery})
     AS name_login_pairs,
    (SELECT JSON_EXTRACT_SCALAR(payload, '$.commits[0].author.name') AS name, COUNT(DISTINCT actor.login) AS logins
      FROM githubarchive.day.20210306
      WHERE type='PushEvent'
      GROUP BY name)
     AS name_logins
  WHERE name_login_pairs.name=name_logins.name
  GROUP BY logins
  ORDER BY logins
`)
}

function getHistogramThreshold(histo, massy, spammy) {
  if (histo.length > 0 && histo[0][spammy] === 0) {
    rows.shift()
  }
  if (histo.length === 0) {
    throw new Error('1 or more rows needed')
  }
  const index = histo.findIndex((row, i) => row[spammy] >= row[massy] || row[spammy] != i + 1)
  if (index <= 0) {
    return histo[0][spammy]
  }
  return histo[index - 1][spammy]
}

async function getLoginsNamesThreshold() {
  const rows = await getLoginsNamesHistogram()
  return getHistogramThreshold(rows, 'logins', 'names')
}

async function getNamesLoginsThreshold() {
  const rows = await getNamesLoginsHistogram()
  return getHistogramThreshold(rows, 'names', 'logins')
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.handler = async(req, res) => {
  let message = await queryTexas();
  res.status(200).send(message);
};
