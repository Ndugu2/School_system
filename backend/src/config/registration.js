/**
 * Registration policy.
 *
 * A student may only be registered for a term once they have paid at least
 * this fraction of the term's invoiced fees. The bursar can change this
 * without touching the code by setting REGISTRATION_FEE_THRESHOLD in .env
 * (e.g. 0.5 = 50%, 0.6 = 60%).
 */
const parsedThreshold = Number(process.env.REGISTRATION_FEE_THRESHOLD);

const REGISTRATION_FEE_THRESHOLD =
  Number.isFinite(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 1
    ? parsedThreshold
    : 0.5;

module.exports = { REGISTRATION_FEE_THRESHOLD };
