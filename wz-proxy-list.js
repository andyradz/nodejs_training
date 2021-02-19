/**
 * Struktura komunikatu: Wykaz informacji o ustanowionych 
 * pełnomocnictwach (seev.prx.001.01)
 * 
 * Wykaz informacji o ustanowionych pełnomocnictwach
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
  	TOTALQTY: TtlNbOfSctiesPrxy,
  	TOTALCOUNT: TtlNbOfPrxy
}) => ({
  	IssrCd,
  	IssrNm,
  	MtgTp: MtgTp === '' ? MtgTp : dics.CorpActionTypesDesc.get(MtgTp),
  	MtgDt,
  	MtgTm,
  	EntitlmntFxgDt,
  	TtlNbOfSctiesPrxy: TtlNbOfSctiesPrxy === '' ? '0' : TtlNbOfSctiesPrxy,
  	TtlNbOfPrxy: TtlNbOfPrxy === '' ? '0' : TtlNbOfPrxy
});

const mapDtlFields = ({
	IDNTYCRDNB: IdntyCardNb,
	KDPWBNFID: IdKDPW,
	RGHTSHLDRNM: RghtsHldrNm,
	PRXYNM: PrxyNm,
	STRTNM: StrtNm,
	BLDGNB: BldgNb,
	PSTCD: PstCd,
	TWNNM: TwnNm,
	CTRY: Ctry,
	QTY: PrxyQty,
	PRXYNPIDTP: IdTp,
	PRXYNPID: Id,
	PRXYTP: PrxyTp,
	PRXYPRSTP: PrxyprsTp,
	PRXYLPLEI: PrxylpLei,
	PRXYLPBIC: PrxylpBic,
	PRXYLPCID: PrxylpcId      
}) => ({
	IdKDPW: IdKDPW === '' ? '000' : IdKDPW,
	RghtsHldrNm,
	IdntyCardNb,
	PrxyNm,
	StrtNm,
	BldgNb,
	PstCd,
	TwnNm,
	Ctry,
	PrxyQty: PrxyQty === '' ? '0' : PrxyQty,
	IdTp: IdTp === '' ? IdTp : dics.PersonIdentityType.get(IdTp),
	Id,
	PrxyTp,
	PrxyprsTp,
	PrxylpLei,
	PrxylpBic,
	PrxylpcId      
});

const registerRoutes = router => {

	/*
   	* WYKAZ INFORMACJI O USTANOWIONYCH PEŁNOMOCNICTWACH – TRYB PODSTAWOWY I ROZSZERZONY    
   	*/
  	router.get("/securityProxiesList", (req, res) => {
    	const caRef = req.query.CARef;
    	log.log(`/securityProxiesList caRef=${caRef} `);

    	if (!regex.caRefRegEx.test(caRef)) {
      		log.log(`/securityProxiesList CAREF ${caRef} parameter error`);
      		res.status(httpStatus.BAD_REQUEST).json([]);
      		res.end();
      		return;
    	}

    	const FMEDHDR0F = `MECA${globals.def.envId}.FMEDHDR0L0`;
    	const FMEPINS0F = `MECA${globals.def.envId}.FMEPINS0L0`;
    	const FMEPINS1F = `MECA${globals.def.envId}.FMEPINS1L0`;
    	const FMEPINS2F = `MECA${globals.def.envId}.FMEPINS2L0`;
    	const FMEPINS3F = `MECA${globals.def.envId}.FMEPINS3L0`;
    	const FREGCON0F = `MLBD${globals.def.envId}.FREGCON0L0`;
    	const FINSTIT0F = `MSRD${globals.def.envId}.FINSTIT0L0`;

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
         		TRIM(CAST(qty.TOTALQTY AS CHAR(18))) AS TOTALQTY,         
	        	TRIM(CAST(cnt.TOTALCOUNT AS CHAR(18))) AS	TOTALCOUNT

        	FROM ${FMEPINS0F} hdr 

        	INNER JOIN ${FMEPINS1F} dtl
          		ON hdr.caRef = dtl.caRef 
          		AND hdr.msgId = dtl.msgId          		        
        
        	INNER JOIN ${FMEDHDR0F} def        
          		ON def.caRef = hdr.caRef

        	LEFT JOIN ( 
          		SELECT 
            		d1.CAREF,            
            		COUNT(1) AS TOTALCOUNT                                                                                          
				FROM ${FMEPINS3F} d3
				INNER JOIN ${FMEPINS1F} d1                     				
					ON  d1.caRef = d3.caRef              
 					AND d1.msgId = d3.msgId            
					AND d1.insId = d3.insId            
					AND d1.sts   = '30'                                    
				GROUP BY
					d1.CAREF
        		) AS CNT
        		ON  cnt.CAREF = def.CAREF 

        	LEFT JOIN ( 
          		SELECT 
            		d1.caRef,
            		SUM(COALESCE(d1.qty, 0)) AS TOTALQTY                                                                                                      
				FROM ${FMEPINS1F} d1
				INNER JOIN ${FMEPINS3F} d3
				ON d3.caRef = d1.caRef 
					AND d3.msgId = d1.msgId
					AND d3.insId = d1.insId
				WHERE 
					d1.sts = '30'
				GROUP BY
					d1.caRef
        		) AS QTY
        		ON  qty.caRef = def.caRef
        
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

         	WHERE hdr.caRef = '${caRef}' `;
    	console.log(hdrSqlCmd);

    	const dtlSqlCmd = `
        	SELECT DISTINCT
          		hdr.CAREF,          
          		TRIM(dtl.IDNTYCRDNB) AS IDNTYCRDNB,          
          		TRIM(CAST(dtl.KDPWBNFID AS CHAR(18))) AS KDPWBNFID,
          		TRIM(TRIM(shd.SHLDSURNM)  || ' ' || TRIM(shd.SHLDFRSTNM) || ' ' || TRIM(shd.SHLDNM)) AS RghtsHldrNm,                    	
          		TRIM(TRIM(prx.PRXYNM) || ' ' || TRIM(prx.PRXYSURNM)   || ' ' || TRIM(prx.PRXYFRSTNM)) AS PrxyNm,
          		TRIM(prx.PRXYASTRT) AS StrtNm,  
          		TRIM(prx.PRXYABLD) AS BldgNb,
          		TRIM(prx.PRXYAPCD) AS PstCd,
          		TRIM(prx.PRXYATNM) AS TwnNm,
          		TRIM(prx.PRXYACTY) AS Ctry,
				dtl.qty,
				TRIM(prx.PRXYNPIDTP) AS prxynpIdTp, 
				TRIM(prx.PRXYNPID) AS prxynpId,
				TRIM(prx.PRXYTP) AS prxyTp,
				TRIM(prx.PRXYPRSTP) AS prxyprsTp,				
				TRIM(prx.PRXYLPLEI) AS prxylpLei,
				TRIM(prx.PRXYLPBIC) AS prxylpBic,
				TRIM(prx.PRXYLPCID) AS prxyLpcId      

        	FROM ${FMEPINS0F} hdr 
  
        	INNER JOIN ${FMEPINS1F} dtl
          		ON hdr.caRef = dtl.caRef
          		AND hdr.msgId = dtl.msgId
          		AND hdr.mbr = dtl.ACCTOWNRID 
          
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
					SELECT MIN(shdo.shldId) AS shldid
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
        
        	INNER JOIN ${FMEPINS3F} prx
          		ON dtl.caRef = prx.caRef 
          		AND dtl.msgId = prx.msgId      
          		AND dtl.insId = prx.insId   
  
        	WHERE hdr.caRef='${caRef}' AND dtl.sts = '30' `;
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
      		let hdrResult = rs.map(item => mapHdrFields(item));
			hdrResult = hdrResult[0];
			  
      		if (hdrResult === undefined) {        
				log.error(`/securityProxiesList Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
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
				
				let dtlResult = rs.map(item => mapDtlFields(item));
				
				if (dtlResult === undefined || dtlResult.length === 0) {        
					dtlResult = [];	
				 	log.error(`/securityProxiesList Brak szczegółów zdarzenia ${caRef}`);
				 	res.status(httpStatus.OK).json([]);
				 	res.end();
				 	return;
				}

				const MtgGnlInf = {
					IssrCd: hdrResult.IssrCd,
					IssrNm: hdrResult.IssrNm,
					MtgTp: hdrResult.MtgTp,
					MtgDt: hdrResult.MtgDt,
					MtgTm: hdrResult.MtgTm,
					EntitlmntFxgDt: hdrResult.EntitlmntFxgDt
				};

        		const Prxy = dtlResult.map(item => ({
            		IdKDPW: item.IdKDPW,
            		RghtsHldrNm: item.RghtsHldrNm,
            		IdntyCardNb: item.IdntyCardNb,
            		PrxyNm: item.PrxyNm,
            		PrxyAdr: {
              			StrtNm: item.StrtNm,
              			BldgNb: item.BldgNb,
              			PstCd: item.PstCd,
              			TwnNm: item.TwnNm,
              			Ctry: item.Ctry
		            },
            		PrxyId: {
              			IdTp: item.PrxyprsTp === 'NATU' ? item.IdTp: item.PrxylpcId,
              			Id: item.PrxyprsTp === 'NATU' ? item.Id: (item.PrxylpLei === '' ? item.PrxylpBic : item.PrxylpLei)						  
            		},
            		PrxyQty: item.PrxyQty
          		}));

        		const prxyDtls = {
          			TtlNbOfSctiesPrxy: hdrResult.TtlNbOfSctiesPrxy,
          			TtlNbOfPrxy: hdrResult.TtlNbOfPrxy,
          			Prxy
        		};

        		const Result = {
          			MtgGnlInf: MtgGnlInf,
          			PrxyDtls: prxyDtls
        		};

        		res.status(httpStatus.OK).json(Result);
        		res.end();
      		});
    });
  });
}

module.exports = registerRoutes;
