const _ = require("lodash");
const { token } = require("morgan");
const request = require("superagent");
const superagent = require("superagent");
const logger = require("../lib/logger");

// const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
//   .split(",")
//   .map(res => res.trim());

var CONSENT_FHIR_SERVERS = []
var TOKEN;

async function fetchConsents(patientIdentifiers, category, fhirServer, fhirAuthorization) {

  CONSENT_FHIR_SERVERS.push(fhirServer)
  TOKEN = `${fhirAuthorization.token_type} ${fhirAuthorization.access_token}`
  global.TOKEN = TOKEN

  try {

    // CONSENT_FHIR_SERVERS.push(fhirServer+'/open')
    const patientFhirIds = await patientIds(patientIdentifiers);


    const consentSearchQueries = patientFhirIds.map(patientFhirId =>
      resolveConsents(patientFhirId.fhirBase, patientFhirId.patientId, category)
    );

    const consentSearchResults = await Promise.all(consentSearchQueries);

    const resolvedConsents = consentSearchResults
      .filter(consentResult => consentResult.body.total)
      .map(consentResult => consentResult.body.entry);
    

    return _.flatten(resolvedConsents);
  } catch (e) {
    logger.warn(e);
    throw {
      httpCode: 503,
      error: "service_unavailable",
      errorMessage: `Error connecting to one of the consent services.`
    };
  }
}

function resolveConsents(fhirBase, patientId, category) {
  const patientParam = {
    patient: `Patient/${patientId}`
  };
  //todo: incorporate categoty into the search parameters

  const params = { ...patientParam };

  return superagent
    .get(`${fhirBase}/Consent`)
    .query(params)
    .set({ Accept: "application/json" , Authorization: TOKEN});
}

async function patientIds(patientIdentifiers) {
  const patientIdQueries = CONSENT_FHIR_SERVERS.map(fhirBase =>
    resolvePatientOnServer(fhirBase, patientIdentifiers)
  );

  const patientIds = await Promise.all(patientIdQueries);

  return _.zipWith(CONSENT_FHIR_SERVERS, patientIds, (fhirBase, patientId) => ({
    fhirBase,
    patientId
  })).filter(consentQuery => consentQuery.patientId);
}

async function resolvePatientOnServer(fhirBase, patientIdentifiers) {
  const patientSearchQueries = patientIdentifiers.map(patientIdentifier =>
    resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier)
  );
  const patientIdSearchResults = await Promise.all(patientSearchQueries);


  const patientIds = patientIdSearchResults
    .map(patientIdResult => firstPatientId(patientIdResult))
    .filter(patientId => patientId);



  return _.first(patientIds);
}

function resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier) {

  const query = {
    identifier: patientIdentifier.system
      ? `${patientIdentifier.system}|${patientIdentifier.value}`
      : `${patientIdentifier.value}`
  };

  return superagent
    .get(`${fhirBase}/Patient`)
    .query(query)
    .query({ _summary: "true" })
    .set({ Accept: "application/json" , Authorization: TOKEN});
}

function firstPatientId(patientSearchResult) {
  return _.get(patientSearchResult.body, "entry[0].resource.id");
}

module.exports = {
  fetchConsents
};
