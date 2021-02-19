/**
 * Typy metod uczestnictwa 
 */

const ParticipationTypesDesc = new Map([
  ["PHYS", "Udział osobisty z prawem głosu"],
  ["PRXY", "Udział przez pełnomocnika"],
  ["EVOT", "Głosowanie elektroniczne"],
  ["MAIL", "Głosowanie korespondencyjne"],
  ["PHNV", "Udział osobisty bez prawa głosu"] 
]);

/**
 * Typy zdarzeń walnego zgromadzenia
 */
const CorpActionTypesDesc = new Map([
  ["GMET", "Zwyczajne Walne Zgromadzenie"],
  ["XMET", "Nadzwyczajne Walne Zgromadzenie"]
]);

/**
 * Typ akcjonariusza
 */
const ShareholderType = new Map([
  ["BENY", "Akcjonariusz, z prawem głosu "],
  ["BENN", "Akcjonariusz, bez prawa głosu"],
  ["COMY", "Współwłasność małżeńska, z prawem głosu"],
  ["COMN", "Współwłasność małżeńska, bez prawa głosu"],
  ["COWY", "Współwłasność inna, z prawem głosu"],
  ["COWN", "Współwłasność inna, bez prawa głosu"],
  ["HLDR", "Użytkownik"],
  ["PLDG", "Zastawnik"]
]);

/**
 * Typ numeru identyfikacji
 */
const PersonIdentityType = new Map([
  ["ARNU", "Zagraniczny numer identyfikacyjny"],
  ["CCPT", "Numer paszportu"],  
  ["CORP", "Numer korporacyjny"],
  ["CUST", "Identyfikator typu Concat"],
  ["DRLC", "Numer prawa jazdy"],
  ["IDCD", "Numer dokumentu tożsamości"],
  ["NRIN", "Numer ewidencyjny (PESEL)"],
  ["SOCS", "Numer ubezpieczenia społecznego"],
  ["TXID", "Numer identyfikacji podatkowej"]
]);        

/**
 * Typy wartości logicznych
 */
const LogicValues = new Map([
  ["0", "N"],
  ["1", "Y"]
]);

module.exports.CorpActionTypesDesc = CorpActionTypesDesc;
module.exports.ParticipationTypesDesc = ParticipationTypesDesc;
module.exports.ShareholderType = ShareholderType;
module.exports.PersonIdentityType = PersonIdentityType;
module.exports.LogicValues = LogicValues;