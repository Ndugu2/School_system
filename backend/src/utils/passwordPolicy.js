const MIN_ACCOUNT_PASSWORD_LENGTH = 12;

const isAcceptableAccountPassword = password =>
  typeof password === 'string' && password.length >= MIN_ACCOUNT_PASSWORD_LENGTH;

module.exports = { MIN_ACCOUNT_PASSWORD_LENGTH, isAcceptableAccountPassword };
