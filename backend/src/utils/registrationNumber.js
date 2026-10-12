const Registration = require('../models/Registration');

const generateRegistrationNumber = async (year, term) => {
  const termCode = term === 'Term 1' ? 'T1' : term === 'Term 2' ? 'T2' : 'T3';
  const prefix = `REG-${year}-${termCode}-`;
  const last = await Registration.findOne({
    registrationNumber: new RegExp(`^${prefix}`)
  }).sort({ registrationNumber: -1 });
  const sequence = last ? parseInt(last.registrationNumber.split('-')[3], 10) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

module.exports = { generateRegistrationNumber };
