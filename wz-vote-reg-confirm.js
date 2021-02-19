/* eslint-disable no-mixed-spaces-and-tabs */
/**
 * REST API (ECA APM) 
 * Zwraca pełną listę informacji dot. Potwierdzeń zarejestrowania i policzenia głosów dla danego zdarzenia WZ 
 * Dane na bazie komunikatu SEEV.CNF.003
 */
const db = require("../lib/db");
const regex = require('../lib/regex');
const log = require("../lib/log");
const globals = require("../cfg/globals");
const httpStatus = require('http-status-codes');

const mapVotRegCnfFields = ({    
	IDKDPW: IdKDPW, 
    RCVD: Rcvd, 
    CNFSNT: CnfSnt,
    CNFDT: CnfDt,
    CNFTM: CnfTm     
}) => ({    
    IdKDPW: (IdKDPW === '' || IdKDPW === 0 || IdKDPW === '0') ? '000' : IdKDPW,       
    Rcvd: (Rcvd === 'Y' || Rcvd === 'y') ? true : false, 
    CnfSnt: (CnfSnt === 'Y' || CnfSnt === 'y') ? true : false,
    CnfDt,
    CnfTm     
});

const registerRoutes = router => {
  
	/*
   	* WYKAZ INFORMACJI POTWIERDZEŃ ZAREJESTROWANIA I POLICZENIA GŁOSÓW   
   	*/
	router.get('/voteRegistrationCnf', (req, res) => { 

    	const caRef = req.query.CARef;
    	log.log(`/voteRegistrationCnf caRef = ${caRef} `);

    	if (!regex.caRefRegEx.test(caRef)) {
       		log.log(`/voteRegistrationCnf CARef ${caRef} parameter error`);
       		res.status(httpStatus.BAD_REQUEST).json([]);
       		res.end();
       		return;
		}            
		
		const FMEPVTC0F = `MECA${globals.def.envId}.FMEPVTC0L0`;        	
		
		const cnfVoteSqlCmd = `
			SELECT DISTINCT
  				cnf.KDPWBNFID AS IdKDPW,
				CASE 
					WHEN COALESCE(cnf1.ile, 0) = 0 THEN 'Y'
					ELSE 'N'
				END AS Rcvd,
  				cnf.VCNFSENT AS CnfSnt,
  				cnf.VCNFSENTDT AS CnfDt,				
				SUBSTR(LPAD(cnf.VCNFSENTTM, 8, '0'), 1, 2) || ':' ||    
				SUBSTR(LPAD(cnf.VCNFSENTTM, 8, '0'), 4, 2) || ':' ||                   
				SUBSTR(LPAD(cnf.VCNFSENTTM, 8, '0'), 7, 2) AS CnfTm				  			
			FROM ${FMEPVTC0F} cnf
			LEFT JOIN (
				SELECT
					c.caRef,					
					count(1) AS ile
				FROM ${FMEPVTC0F} c
				WHERE c.sts = '31'
				GROUP BY c.caref						 
				) AS cnf1 ON cnf1.caRef = cnf.caRef					 
			WHERE cnf.caRef = '${caRef}'
					AND cnf.sts = '30' `;
    	console.log(cnfVoteSqlCmd);  

    	let stmtHdr = db.newStmt();
    	stmtHdr.exec(cnfVoteSqlCmd, (rs, err) => {
      		stmtHdr.close();

      		if (err) {
        		log.error(err);
        		res.status(httpStatus.INTERNAL_SERVER_ERROR).json([]);
        		res.end();
        		return;
			}
			  
			let dbResult = rs.map(item => mapVotRegCnfFields(item));      

			if (dbResult === undefined || dbResult.length === 0) {        
				log.error(`/voteRegistrationCnf Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
				res.status(httpStatus.OK).json([]);
				res.end();
				return;
			}			                     
      		
      		res.status(httpStatus.OK).json(dbResult);
      		res.end();
      	});
    });  
}

module.exports = registerRoutes;