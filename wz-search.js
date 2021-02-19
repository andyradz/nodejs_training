/**
 * REST API (ECA APM) w zakresie wyszukiwania id KDPW zaświadczenia (punkt 1.10 specyfikacji zmian w aplikacji WZ) 
 * zwraca listę istniejących dla danego zdarzenia Id KDPW zaświadczeń 
 * rozpoczynających się od przekazanego w zapytaniu ciągu znaków (klucz wyszukiwania) przy następujących założeniach:   
 * 
 * Wymagania
 * 
 * 1. Minimalna długość klucza wyszukiwania to 3 znaki (id KDPW zaświadczenia jest zawsze co najmniej 3 znakowe)
 * 2. Api ECA APM zwraca maksymalnie N id KDPW zaświadczeń posortowanych leksykograficznie, gdzie N zostanie ustalone w terminie późniejszym.
 * 3. Propozycja ze strony KDPW (nie dyskutowana na spotkaniu):  30 <= N <= 200 . Konkretna wartość N zostanie ustalona po wstępnych testach integracyjnych.
 * Ograniczenie na ilość zwracanych danych została usunięt z wymogów	
 * 4. API ECA APM udostępni tylko jeden „endpoint” do wyszukiwania, nie ma potrzeby udostępniania innego dedykowanego „endpointa”
 *    sprawdzającego czy pełne id KDPW zaświadczenia jest poprawne (aplikacja WZ może do takiej weryfikacji 
 *    użyć endpointa do wyszukiwania, weryfikując czy na zwróconej liście poprawnych id KDPW zaświadczeń istnieje dane id)
 */
const db = require("../lib/db");
const regex = require('../lib/regex');
const log = require("../lib/log");
const globals = require("../cfg/globals");
const httpStatus = require('http-status-codes');

const mapSearchFields = ({    
	KDPWBNFIDS: IdKDPW,    
}) => ({    
	IdKDPW: IdKDPW === '' ? '000' : IdKDPW   
});

const registerRoutes = router => {
  
	/*
   	* WYKAZ INFORMACJI O IDENTYFIKATORACH KDPW DLA DANEGO ZDARZENIA    
   	*/
	router.get("/rghtsHldrKdpwIdsList", (req, res) => { 

    	const caRef = req.query.CARef;
    	log.log(`/rghtsHldrKdpwIdsList caRef=${caRef} `);

    	if (!regex.caRefRegEx.test(caRef)) {
       		log.log(`/rghtsHldrKdpwIdsList CAREF ${caRef} parameter error`);
       		res.status(httpStatus.BAD_REQUEST).json([]);
       		res.end();
       		return;
    	}        
    
    	const FMEPINS1F = `MECA${globals.def.envId}.FMEPINS1L1`;
    
    	const searchSqlCmd = `
      		SELECT        
        	TRIM(kdpwBnfids) AS kdpwBnfids        
      		FROM ${FMEPINS1F} 
			WHERE caRef = '${caRef}' 
				AND sts = '30'           
      		ORDER BY KDPWBNFIDS`;
    	console.log(searchSqlCmd);  

    	let stmtHdr = db.newStmt();
    	stmtHdr.exec(searchSqlCmd, (rs, err) => {
      		stmtHdr.close();

      		if (err) {
        		log.error(err);
        		res.status(httpStatus.INTERNAL_SERVER_ERROR).json([]);
        		res.end();
        		return;
			}
			  
			let searchResult = rs.map(item => mapSearchFields(item));      

			if (searchResult === undefined || searchResult.length === 0) {        
				log.error(`/rghtsHldrKdpwIdsList Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
				res.status(httpStatus.OK).json([]);
				res.end();
				return;
			}			

      		searchResult = searchResult.map(item => item.IdKDPW);              
      		
      		res.status(httpStatus.OK).json(searchResult);
      		res.end();
      	});
    });  
}

module.exports = registerRoutes;