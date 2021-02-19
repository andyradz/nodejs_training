/**
 * Struktura komunikatu: Wykaz informacji o metodach
 * uczestnictwa w walnym zgromadzeniu (seev.ptc.001.01)
 * 
 * Wykaz informacji o metodach uczestnictwa w walnym zgromadzeniu
 */

const db = require("../lib/db");
const regex = require('../lib/regex');
const log = require("../lib/log");
const globals = require("../cfg/globals");
const httpStatus = require('http-status-codes');
const dics = require("../lib/dics");

const mapHdrFields = ({  
	CACD: MtgTp,
	ISSUER: IssrCd,
	FULLNM: IssrNm,
	MEETDT: MtgDt,
	MEETTM: MtgTm,
	RCDDT: EntitlmntFxgDt,
	TOTALISSUE: TtlNbOfBearerSctiesKDPW,
	TOTALQTY: TtlNbOfSctiesRegd,
	TOTALCOUNT: TtlNbOfShrhldgRegd  
}) => ({  
	IssrCd,
	IssrNm,
	MtgTp: MtgTp === '' ? MtgTp : dics.CorpActionTypesDesc.get(MtgTp),
	MtgDt,
	MtgTm,
	EntitlmntFxgDt,
	TtlNbOfBearerSctiesKDPW: TtlNbOfBearerSctiesKDPW === '' ? '0' : TtlNbOfBearerSctiesKDPW,  
	TtlNbOfSctiesRegd: TtlNbOfSctiesRegd === '' ? '0' : TtlNbOfSctiesRegd,
	TtlNbOfShrhldgRegd: TtlNbOfShrhldgRegd === '' ? '0' : TtlNbOfShrhldgRegd  
});

const mapDtlFields = ({  
	PRTCPTNMTD: PrtcptnMtd,
	VEXECCNF: VoteExctnConf,
	IDNTYCRDNB: IdntyCardNb,
	KDPWBNFID: IdKDPW,
	RGHTSHLDRNM: RghtsHldrNm 
}) => ({  
	IdKDPW: IdKDPW === '' ? '000' : IdKDPW,
	RghtsHldrNm,
	IdntyCardNb,
	PrtcptnMtd: PrtcptnMtd === '' ? PrtcptnMtd : dics.ParticipationTypesDesc.get(PrtcptnMtd),
	VoteExctnConf: VoteExctnConf === '' ? VoteExctnConf : dics.LogicValues.get(VoteExctnConf)
});

const registerRoutes = router => {

  	/*
   	* WYKAZ INFORMACJI O METODZIE UCZESTNICTWA – TRYB PODSTAWOWY I ROZSZERZONY    
   	*/
	router.get("/participationMethodList", (req, res) => {
    	const caRef = req.query.CARef;
    	log.log(`/participationMethodList caRef=${caRef} `);

    	if (!regex.caRefRegEx.test(caRef)) {
      		log.log(`/participationMethodList CAREF ${caRef} parameter error`);
      		res.status(httpStatus.BAD_REQUEST).json([]);
      		res.end();
      		return;
    	}
    
		const FMEDHDR0F = `MECA${globals.def.envId}.FMEDHDR0L0`;
		const FMEPINS0F = `MECA${globals.def.envId}.FMEPINS0L0`;
		const FMEPINS1F = `MECA${globals.def.envId}.FMEPINS1L0`;
		const FMEPINS2F = `MECA${globals.def.envId}.FMEPINS2L0`;    
		const FMEPINS5F = `MECA${globals.def.envId}.FMEPINS5L0`;
		const FFINSTR0F = `MLBD${globals.def.envId}.FFINSTR0L0`;
		const FREGCON0F = `MLBD${globals.def.envId}.FREGCON0L0`;
		const FINSTIT0F = `MSRD${globals.def.envId}.FINSTIT0L0`;
		const FMEDISI0F = `MECA${globals.def.envId}.FMEDISI0L0`; 

    	const hdrSqlCmd = `
        	SELECT DISTINCT
	        	def.CAREF,
	        	def.CACD,
          		def.ISSUER,
          		TRIM(con.FULLNM) AS FULLNM,
         		hdr.MEETDT,
	        	SUBSTR(LPAD(hdr.meetTm, 8, '0'), 1, 2) || ':' ||    
         		SUBSTR(LPAD(hdr.meetTm, 8, '0'), 4, 2) || ':' ||                   
	        	SUBSTR(LPAD(hdr.meetTm, 8, '0'), 7, 2) MEETTM,         
         		def.RCDDT,
         		TRIM(CAST(ISIN.TOTALISSUE AS CHAR(18))) AS TOTALISSUE,
         		TRIM(CAST(qty.TOTALQTY AS CHAR(18))) AS TOTALQTY,         
	        	TRIM(CAST(qty.TOTALCOUNT AS CHAR(18))) AS TOTALCOUNT	

        	FROM ${FMEPINS0F} hdr 

        	INNER JOIN ${FMEPINS1F} dtl
          		ON hdr.caRef = dtl.caRef 
          		AND hdr.msgId = dtl.msgId          		

        	INNER JOIN ${FMEDHDR0F} def        
          		ON def.caRef = hdr.caRef

			LEFT JOIN ( 
				SELECT
					f.issuer,		  			
		  			i.caRef,
					SUM(TOTALISSUE) AS TOTALISSUE                                                                                            
				FROM ${FFINSTR0F} f 
		  		INNER JOIN ${FMEDISI0F} i
		   		ON i.isin = f.isin      
				WHERE f.eligdt = (SELECT MAX(g.eligdt) AS eligdt                                                                                                                                    		  		 
		   		FROM ${FFINSTR0F} g                       
		  		WHERE g.isin = i.isin AND g.issuer = f.issuer)                         		   			     
				  	GROUP BY f.ISSUER, i.caref                                              
				) AS ISIN
					ON ISIN.issuer = def.ISSUER 		  			
		  			AND ISIN.caRef = hdr.caRef
  
        	LEFT JOIN ( 
          		SELECT 
            		CAREF,
            		SUM(QTY) AS TOTALQTY,
            		COUNT(INSID) AS TOTALCOUNT                                                                                          
				  FROM ${FMEPINS1F}
				  WHERE STS = '30' 
				  		AND msgid NOT IN (SELECT i.CANCMSGID FROM ${FMEPINS1F} i WHERE i.sts = '41')
	        	GROUP BY CAREF
        	) AS QTY
        		ON qty.CAREF = def.CAREF 
        
        	LEFT JOIN(
          		SELECT 
            		o.ID, 
            		r.FULLNM
          		FROM ${FINSTIT0F} o
          		INNER JOIN ${FREGCON0F} r on r.ID = o.CONTRID
				WHERE o.ELIGDT = (SELECT MAX(i.ELIGDT) FROM ${FINSTIT0F} i WHERE i.ID = o.ID)
				AND r.ELIGDT = (SELECT MAX(r1.ELIGDT) FROM ${FREGCON0F} r1 WHERE r1.ID = r.ID )  
			) AS CON
				ON CON.ID = def.ISSUER

         	WHERE hdr.caRef = '${caRef}' AND dtl.sts = '30'`;
    	console.log(hdrSqlCmd);          

    	const dtlSqlCmd = `
        	SELECT DISTINCT
          		hdr.CAREF,
          		dtl.VEXECCNF,
          		TRIM(dtl.IDNTYCRDNB) AS IDNTYCRDNB,          
          		TRIM(CAST(dtl.KDPWBNFID AS CHAR(18))) AS KDPWBNFID, 
          		pmn.PRTCPTNMTD,        	
          		TRIM(TRIM(shd.SHLDNM) || ' ' || TRIM(shd.SHLDSURNM)  || ' ' || TRIM(shd.SHLDFRSTNM)) AS RghtsHldrNm  

        	FROM ${FMEPINS0F} hdr 
  
        	INNER JOIN ${FMEPINS1F} dtl
          		ON hdr.caRef = dtl.caRef
          		AND hdr.msgId = dtl.msgId          		  
        	
			INNER JOIN (
					SELECT 	
						shdi.caref,
						shdi.msgid,
						shdi.insid,
						shdi.shldnm,
						shdi.shldsurnm,
						shdi.shldfrstnm,
						MIN(shdi.shldId) as shldId
					FROM ${FMEPINS2F} shdi
					WHERE shdi.shldId = (
						SELECT MIN(shdo.SHLDID) AS shldid
						FROM ${FMEPINS2F} shdo
						WHERE shdo.caRef = shdi.caRef
							AND shdo.msgid = shdi.msgid 
							AND shdo.insid = shdi.insid  									 
					) 	
					GROUP BY
						shdi.caref,
						shdi.msgid,
						shdi.insid,
						shdi.SHLDNM,
						shdi.shldsurnm,
						shdi.shldfrstnm) AS shd          		
					ON dtl.caRef = shd.caRef 
					AND dtl.msgId = shd.msgId      
					AND dtl.insid = shd.insid
  
        	INNER JOIN ${FMEPINS5F} pmn           
          		ON pmn.caRef = hdr.caRef
          		AND pmn.msgid = hdr.msgid        
          		AND pmn.insId = dtl.insId
  
			WHERE hdr.caRef='${caRef}' AND dtl.sts = '30'
			     AND hdr.msgid NOT IN (SELECT i.CANCMSGID FROM ${FMEPINS1F} i where i.sts = '41')`;
    	console.log(dtlSqlCmd);      
    	
    	let stmtHdr = db.newStmt();
    	stmtHdr.exec(hdrSqlCmd, (rs, err) => {
      		stmtHdr.close();

      	if (err) {
	        log.error(err);
    	    res.status(httpStatus.INTERNAL_SERVER_ERROR).json([]);
	        res.end();
        	return;
      	}      
      	let hdrResult = rs.map(e => mapHdrFields(e));
	    hdrResult = hdrResult[0];
		
		if (hdrResult === undefined) {        
			log.error(`/participationMethodList Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
			res.status(httpStatus.OK).json([]);
			res.end();
			return;
		}	  	 	  	  	        
      	
      	let stmtDtl = db.newStmt();
      	stmtDtl.exec(dtlSqlCmd, (rs, err) => {
        stmtDtl.close();

        if (err) {
        	log.error(err);
          	res.status(httpStatus.INTERNAL_SERVER_ERROR).json([]);
          	res.end();
          	return;
		}      
		
		let dtlResult = rs.map(e => mapDtlFields(e));    		
		
		if (dtlResult === undefined || dtlResult.length === 0) {        
			dtlResult = [];	
			log.error(`/participationMethodList Brak szczegółów zdarzenia ${caRef}`);
		 	res.status(httpStatus.OK).json([]);
		 	res.end();
		 	return;
		}

        const result = { MtgGnlInf: hdrResult,
                         PrtcptnMtdDtls: dtlResult };
		
        res.status(httpStatus.OK).json(result);
        res.end();
      });      
    });      
  });
}

module.exports = registerRoutes;
