/**
 * Utility functions to standardize fields across the application
 */

/**
 * Standardizes church unit fields from a database record
 * Handles both singular (churchUnit/churchunit) and plural (churchUnits/churchunits) fields
 *
 * @param record - The database record to standardize
 * @returns The standardized record with consistent church unit fields
 */
export const standardizeChurchUnitFields = <T extends Record<string, any>>(record: T): T => {
  const result = { ...record };

  // Extract all possible church unit fields
  const churchUnit = record.churchUnit;
  const churchunit = record.churchunit;
  const churchUnits = record.churchUnits;
  const churchunits = record.churchunits;

  // Standardize the plural fields (arrays)
  if (Array.isArray(churchUnits) && churchUnits.length > 0) {
    result.churchUnits = churchUnits;
    result.churchunits = churchUnits;
  } else if (Array.isArray(churchunits) && churchunits.length > 0) {
    result.churchUnits = churchunits;
    result.churchunits = churchunits;
  } else if (churchUnit) {
    // If no arrays but we have a singular value, create arrays
    result.churchUnits = [churchUnit];
    result.churchunits = [churchUnit];
  } else if (churchunit) {
    // If no arrays but we have a singular value, create arrays
    result.churchUnits = [churchunit];
    result.churchunits = [churchunit];
  } else {
    // Ensure we have empty arrays rather than null/undefined
    result.churchUnits = [];
    result.churchunits = [];
  }

  // Standardize the singular fields
  if (churchUnit) {
    result.churchUnit = churchUnit;
    result.churchunit = churchUnit;
  } else if (churchunit) {
    result.churchUnit = churchunit;
    result.churchunit = churchunit;
  } else if (Array.isArray(result.churchUnits) && result.churchUnits.length > 0) {
    // If we have arrays but no singular value, use the first array element
    result.churchUnit = result.churchUnits[0];
    result.churchunit = result.churchUnits[0];
  } else {
    // Ensure we have empty strings rather than null/undefined
    result.churchUnit = '';
    result.churchunit = '';
  }

  return result;
};

/**
 * Standardizes auxano group field from a database record
 *
 * @param record - The database record to standardize
 * @returns The standardized record with consistent auxano group field
 */
export const standardizeAuxanoGroupField = <T extends Record<string, any>>(record: T): T => {
  const result = { ...record };

  // Ensure auxanoGroup is always defined
  if (record.auxanoGroup === null || record.auxanoGroup === undefined) {
    result.auxanoGroup = '';
  }

  return result;
};

/**
 * Standardizes name fields from a database record
 * Handles both camelCase and lowercase variants (fullName/fullname)
 *
 * @param record - The database record to standardize
 * @returns The standardized record with consistent name fields
 */
export const standardizeNameFields = <T extends Record<string, any>>(record: T): T => {
  const result = { ...record };

  // Extract possible name fields
  const fullName = record.fullName;
  const fullname = record.fullname;

  // Standardize the name fields
  if (fullName) {
    result.fullName = fullName;
    result.fullname = fullName;
  } else if (fullname) {
    result.fullName = fullname;
    result.fullname = fullname;
  }

  return result;
};

/**
 * Standardizes all fields from a database record
 *
 * @param record - The database record to standardize
 * @returns The standardized record with all fields standardized
 */
export const standardizeAllFields = <T extends Record<string, any>>(record: T): T => {
  let result = standardizeChurchUnitFields(record);
  result = standardizeAuxanoGroupField(result);
  result = standardizeNameFields(result);
  return result;
};

/**
 * Standardizes all fields from an array of database records
 *
 * @param records - The array of database records to standardize
 * @returns The array of standardized records
 */
export const standardizeAllRecords = <T extends Record<string, any>>(records: T[]): T[] => {
  return records.map(standardizeAllFields);
};
