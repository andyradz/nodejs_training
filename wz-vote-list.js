/* eslint-disable no-mixed-spaces-and-tabs */
/**  
 * Struktura komunikatu: Wykaz informacji o
 * sposobie realizacji głosów (seev.vot.001.01)
 * 
 * Wykaz informacji o sposobie realizacji głosów
 * 
 * 2020-10-14 Andrzej Radziszewski
 * Mantis(9455)
 * Dodanie do wykazu głosów z uchwał nie określonych jeszcze przez spółkę
 * 
 * 2021-02-04 Andrzej Radziszewski
 * Zadanie projektowe SRD(KSH_WZ_V06)
 * Zlecenie od Szymona Ludwikowskiego (email 03.02.2021)
 */

const db = require("../lib/db");
const regex = require('../lib/regex');
const log = require("../lib/log");
const globals = require("../cfg/globals");
const httpStatus = require('http-status-codes');
const dics = require("../lib/dics");

const FACTOR_ZERO    = 0;
const FACTOR_ONE     = 1;
const FACTOR_ISSUER  = -1;
const INS_STS_30     = 30;

const mapHdrFields = ({
	CACD: MtgTp,
  	ISSUER: IssrCd,
  	FULLNM: IssrNm,
  	MEETDT: MtgDt,
  	MEETTM: MtgTm,
  	RCDDT: EntitlmntFxgDt  
}) => ({
  	IssrCd,
  	IssrNm,
	MtgTp: MtgTp === '' ? MtgTp : dics.CorpActionTypesDesc.get(MtgTp),
  	MtgDt,
  	MtgTm,
  	EntitlmntFxgDt  
});

const mapDtlFields = ({
  	MSGID: MsgId,
	INSID: InsId,
	SHLDID: ShldId,
  	ISSRLABL: IssrLabl,
  	TTLNBOFVOTES: TtlNbOfVotes,
  	TTLNBOFVOTESFOR: TtlNbOfVotesFor,
  	TTLNBOFVOTESAGNST: TtlNbOfVotesAgnst,
  	TTLNBOFVOTESABSTN: TtlNbOfVotesAbstn,
  	KDPWBNFID: IdKDPW,
  	RGHTSHLDRNM: RghtsHldrNm,  
  	IDNTYCRDNB: IdntyCardNb, 
  	NBOFSCTIES: NbOfScties,   
  	NBOFVOTES: NbOfVotes,
  	NBOFVOTESFOR: NbOfVotesFor,
  	NBOFVOTESAGNST: NbOfVotesAgnst,
  	NBOFVOTESABSTN: NbOfVotesAbstn  
}) => ({
  	MsgId,
	InsId,
	ShldId,
  	IssrLabl,
  	TtlNbOfVotes: TtlNbOfVotes === '' ? '0' : TtlNbOfVotes,
  	TtlNbOfVotesFor: TtlNbOfVotesFor === '' ? '0' : TtlNbOfVotesFor,
  	TtlNbOfVotesAgnst: TtlNbOfVotesAgnst === '' ? '0' : TtlNbOfVotesAgnst,
  	TtlNbOfVotesAbstn: TtlNbOfVotesAbstn === '' ? '0' : TtlNbOfVotesAbstn,
  	IdKDPW: IdKDPW === '' ? '000' : IdKDPW,
  	RghtsHldrNm,
  	IdntyCardNb,
  	NbOfScties: NbOfScties === '' ? '0' : NbOfScties,
  	NbOfVotes: NbOfVotes === '' ? '0' : NbOfVotes,
  	NbOfVotesFor: NbOfVotesFor === '' ? '0' : NbOfVotesFor,
  	NbOfVotesAgnst: NbOfVotesAgnst === '' ? '0' : NbOfVotesAgnst,
  	NbOfVotesAbstn: NbOfVotesAbstn === '' ? '0' : NbOfVotesAbstn   
});

const registerRoutes = router => {

	/*
   	* WYKAZ INFORMACJI O SPOSOBIE REALIZACJI GŁOSÓW – TRYB PODSTAWOWY I ROZSZERZONY    
   	*/
  	router.get("/votesActionModeList", (req, res) => {
    	const caRef = req.query.CARef;
    	log.log(`/votesActionModeList caRef=${caRef} `);

    	if (!regex.caRefRegEx.test(caRef)) {
      		log.log(`/votesActionModeList CAREF ${caRef} parameter error`);
      		res.status(httpStatus.BAD_REQUEST).json([]);
      		res.end();
      		return;
    	}

    	const FMEDHDR0F = `MECA${globals.def.envId}.FMEDHDR0L0`;
    	const FMEPINS0F = `MECA${globals.def.envId}.FMEPINS0L0`;
    	const FMEPINS1F = `MECA${globals.def.envId}.FMEPINS1L0`;
    	const FMEPINS2F = `MECA${globals.def.envId}.FMEPINS2L0`;
    	const FMEPINS4F = `MECA${globals.def.envId}.FMEPINS4L0`;
    	const FREGCON0F = `MLBD${globals.def.envId}.FREGCON0L0`;
		const FINSTIT0F = `MSRD${globals.def.envId}.FINSTIT0L0`;		
		const FFINSTR0F = `MLBD${globals.def.envId}.FFINSTR0L0`;
		const FMEPVTR0F = `MECA${globals.def.envId}.FMEPVTR0l0`;		
    	
    	const hdrSqlCmd = `
        	SELECT DISTINCT 
	        	def.caref,
	        	def.cacd,
          		def.issuer,
          		TRIM(con.fullnm) AS FULLNM,
         		hdr.meetdt,
	        	SUBSTR(LPAD(hdr.meetTm, 8, '0'), 1, 2) || ':' ||    
         		SUBSTR(LPAD(hdr.meetTm, 8, '0'), 4, 2) || ':' ||                   
	        	SUBSTR(LPAD(hdr.meetTm, 8, '0'), 7, 2) MEETTM,         
         		def.rcddt        	
         		
        	FROM ${FMEPINS0F} hdr 

        	INNER JOIN ${FMEPINS1F} dtl
          		ON hdr.caRef = dtl.caRef 
          		AND hdr.msgId = dtl.msgId          		        
        
        	INNER JOIN ${FMEDHDR0F} def        
          		ON def.caRef = hdr.caRef

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

			 WHERE hdr.CAREF = '${caRef}' 
			       AND dtl.sts = '${INS_STS_30}' `;
    	console.log(hdrSqlCmd);

		const dtlSqlCmd = `
		WITH CTE_ISIN AS (
			SELECT DISTINCT
				fin.eligdt,
				fin.isin,
				fin.fintp,
				fin.cfi 
			FROM ${FFINSTR0F} fin 
			ORDER BY eligdt DESC                        
		),
		CTE_VTR AS (
			SELECT DISTINCT 
				fin.eligdt,
				fin.isin,
				fin.vtngratio
			FROM ${FMEPVTR0F} fin 
			ORDER BY fin.eligdt DESC                        
		),
		CTE_VOTE AS (
			SELECT DISTINCT
				vot.CAREF,
				vot.MSGID, 
				vot.INSID, 
				vot.VOTEID,
				CASE
					WHEN LOCATE('(PL)',vot.ISSLABEL) > 0 THEN SUBSTR(vot.ISSLABEL, 1, LOCATE(' (PL)', TRIM(vot.ISSLABEL)))
					WHEN LOCATE('(EN)',vot.ISSLABEL) > 0 THEN SUBSTR(vot.ISSLABEL, 1, LOCATE(' (EN)', TRIM(vot.ISSLABEL)))
					ELSE TRIM(vot.ISSLABEL)
				END AS IssrLabl, 
				vot.VOTETP, 
				vot.VOTEQTY,
				vot.VOTECD
			FROM 
				${FMEPINS4F} vot
			WHERE TRIM(vot.ISSLABEL) != ''
			UNION
			SELECT DISTINCT
				vot.CAREF,
				vot.MSGID, 
				vot.INSID, 
				vot.VOTEID,
				'Nowe uchwały walnego zgromadzenia' AS IssrLabl, 			
				vot.VOTETP, 
				dtl.qty AS VOTEQTY,
				vot.VOTECD
			FROM 
			${FMEPINS4F} vot
			LEFT JOIN ${FMEPINS1F} dtl
				ON  vot.caRef = dtl.caRef
				AND vot.msgId = dtl.msgId
				AND vot.insId = dtl.insId

			WHERE TRIM(vot.ISSLABEL) = '' 
				AND dtl.sts = '${INS_STS_30}'
		)				
			SELECT DISTINCT
				TRIM(data.CAREF) AS caRef,
				TRIM(data.msgId) AS msgId,
				TRIM(data.insId) AS insId,				
				TRIM(data.IssrLabl) AS IssrLabl,
				TRIM(CAST(SUM(COALESCE(data.TtlNbOfVotes, 0)) AS CHAR(18))) AS TtlNbOfVotes,
				TRIM(CAST(SUM(COALESCE(data.TtlNbOfVotesFor, 0)) AS CHAR(18))) AS TtlNbOfVotesFor,
				TRIM(CAST(SUM(COALESCE(data.TtlNbOfVotesAgnst, 0)) AS CHAR(18))) AS TtlNbOfVotesAgnst,
				TRIM(CAST(SUM(COALESCE(data.TtlNbOfVotesAbstn, 0)) AS CHAR(18))) AS TtlNbOfVotesAbstn,	
				TRIM(CAST(data.KDPWBNFID AS CHAR(18))) AS KDPWBNFID,
				TRIM(data.IDNTYCRDNB) AS IDNTYCRDNB,
				TRIM(data.RghtsHldrNm) AS RghtsHldrNm,                    	          
				TRIM(CAST(SUM(COALESCE(data.NbOfScties, 0)) AS CHAR(18))) AS NbOfScties,
				TRIM(CAST(SUM(COALESCE(data.NbOfVotes, 0)) AS CHAR(18))) AS NbOfVotes,
				TRIM(CAST(SUM(COALESCE(data.NbOfVotesFor, 0)) AS CHAR(18))) AS NbOfVotesFor,          
				TRIM(CAST(SUM(COALESCE(data.NbOfVotesAgnst, 0)) AS CHAR(18))) AS NbOfVotesAgnst,
				TRIM(CAST(SUM(COALESCE(data.NbOfVotesAbstn, 0)) AS CHAR(18))) AS NbOfVotesAbstn,
				data.shldId,
				data.factor  
				FROM (		
					SELECT DISTINCT          
						hdr.CAREF,
						dtl.msgId,
						dtl.insId,				
						TRIM(vot.IssrLabl) AS IssrLabl,
						qtyall.qty AS TtlNbOfVotes,
						qtyfor.qty AS TtlNbOfVotesFor,
						qtyags.qty AS TtlNbOfVotesAgnst,
						qtybst.qty AS TtlNbOfVotesAbstn,	
						TRIM(dtl.KDPWBNFID) AS KDPWBNFID,
						TRIM(TRIM(shd.SHLDNM) || ' ' ||  TRIM(shd.SHLDSURNM) || ' ' || TRIM(shd.SHLDFRSTNM)) AS RghtsHldrNm,                    	          
						TRIM(dtl.IDNTYCRDNB) AS IDNTYCRDNB,
						qty.qty AS NbOfScties,
						qtyall1.qty * (CASE WHEN finstr.factor <> ${FACTOR_ISSUER} THEN finstr.factor ELSE vtr.factor END) AS NbOfVotes,
						qtyall2.qty * (CASE WHEN finstr.factor <> ${FACTOR_ISSUER} THEN finstr.factor ELSE vtr.factor END) AS NbOfVotesFor,          
						qtyall3.qty * (CASE WHEN finstr.factor <> ${FACTOR_ISSUER} THEN finstr.factor ELSE vtr.factor END) AS NbOfVotesAgnst,
						qtyall4.qty * (CASE WHEN finstr.factor <> ${FACTOR_ISSUER} THEN finstr.factor ELSE vtr.factor END) AS NbOfVotesAbstn,
						shd.shldId,
						finstr.factor	            

					FROM ${FMEPINS0F} hdr         
					
					INNER JOIN ${FMEDHDR0F} nag
						ON nag.caRef = hdr.caRef
	
					INNER JOIN ${FMEPINS1F} dtl
						ON hdr.caRef = dtl.caRef
						AND hdr.msgId = dtl.msgId			    
					
					INNER JOIN CTE_VOTE vot
						ON vot.caRef = dtl.caRef
						AND vot.msgId = dtl.msgId
						AND vot.insid = dtl.insid 	  									       

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
						
						LEFT JOIN (
							SELECT
								fin.isin,
								fin.eligdt,
								CASE
							   		WHEN fin.finTp IN('ESB','ESF','ESR') AND length(fin.cfi) >= 3 AND (SUBSTRING(fin.cfi,3,1) ='N' OR SUBSTRING(fin.cfi,3,1) ='n') THEN ${FACTOR_ZERO}
							   		WHEN fin.finTp IN('ESB', 'ESF') THEN ${FACTOR_ONE}							
							   		ELSE ${FACTOR_ISSUER}
								END AS factor									
							FROM CTE_ISIN fin 
							) AS finstr
								ON finstr.isin = hdr.isin 
								AND finstr.eligdt = (SELECT MAX(eligdt) FROM CTE_ISIN WHERE isin = finstr.isin AND eligdt <= nag.rcdDt)

						LEFT JOIN (
							SELECT 
								vtr.isin,
								vtr.eligdt,
								COALESCE(vtr.vtngratio,0) AS factor
							FROM
								CTE_VTR vtr
						) AS vtr
							ON vtr.isin = hdr.isin 
							AND vtr.eligdt = (SELECT MAX(eligdt) FROM CTE_VTR WHERE isin = vtr.isin AND eligdt <= nag.rcdDt)		
						
					LEFT JOIN (
						SELECT
							d4.caRef,
							d4.IssrLabl, 
							SUM(d4.VOTEQTY) AS QTY
						FROM CTE_VOTE d4
						INNER JOIN ${FMEPINS1F} d1
							ON  d1.caref = d4.caref 
							AND d1.msgid = d4.msgid 
							AND d1.insid = d4.insid
						WHERE d4.voteTp <> '' AND d1.sts = '${INS_STS_30}'
						GROUP BY d4.caRef, d4.IssrLabl
					) AS QTYALL
						ON  QTYALL.caRef = dtl.caRef
							AND QTYALL.IssrLabl = vot.IssrLabl								  	            										  	            						
	
					LEFT JOIN (
						SELECT
							d4.caRef, 
							d4.IssrLabl,
							SUM(d4.VOTEQTY) AS QTY 
						FROM CTE_VOTE d4
						INNER JOIN ${FMEPINS1F} d1
							ON  d1.caref = d4.caref 
							AND d1.msgid = d4.msgid 
							AND d1.insid = d4.insid
						WHERE d4.VOTETP = 'CFOR' AND d1.sts = '${INS_STS_30}'
						GROUP BY d4.caRef, d4.IssrLabl
					) AS QTYFOR
						ON QTYFOR.caRef = dtl.caRef          						  	  
							AND QTYFOR.IssrLabl = vot.IssrLabl

					LEFT JOIN (
						SELECT 
							d4.caRef, 
							d4.IssrLabl,
							SUM(d4.VOTEQTY) AS QTY 
						FROM CTE_VOTE d4
						INNER JOIN ${FMEPINS1F} d1
							ON  d1.caref = d4.caref 
							AND d1.msgid = d4.msgid 
							AND d1.insid = d4.insid
						WHERE d4.VOTETP = 'CAGS' AND d1.sts = '${INS_STS_30}'
						GROUP BY d4.caRef, d4.IssrLabl
					) AS QTYAGS 
						ON QTYAGS.caRef = dtl.caRef 				  
						AND QTYAGS.IssrLabl = vot.IssrLabl
	
					LEFT JOIN (
						SELECT 
							d4.caRef, 
							d4.IssrLabl,
							SUM(d4.VOTEQTY) AS QTY
						FROM CTE_VOTE d4
						INNER JOIN ${FMEPINS1F} d1
							ON  d1.caref = d4.caref 
							AND d1.msgid = d4.msgid 
							AND d1.insid = d4.insid
						WHERE d4.VOTETP = 'ABST' AND d1.sts = '${INS_STS_30}'
						GROUP BY d4.caRef, d4.IssrLabl
						) AS QTYBST 
						ON QTYBST.caRef = dtl.caRef        		   				
						AND QTYBST.IssrLabl = vot.IssrLabl

					LEFT JOIN (
						SELECT d4.caRef, d4.msgid, d4.insid, d4.IssrLabl, SUM(d4.VOTEQTY) AS QTY
						FROM CTE_VOTE d4
						INNER JOIN ${FMEPINS1F} d1
							ON  d1.caref = d4.caref 
							AND d1.msgid = d4.msgid 
							AND d1.insid = d4.insid
						WHERE d4.voteTp <> '' AND d1.sts = '${INS_STS_30}'
						GROUP BY d4.caRef, d4.msgid, d4.insid, d4.IssrLabl
						) AS QTYALL1
						ON  QTYALL1.caRef = dtl.caRef
						AND QTYALL1.msgid = dtl.msgid 
						AND QTYALL1.insid = dtl.insid
						AND QTYALL1.IssrLabl = vot.IssrLabl
	
					LEFT JOIN (
						SELECT caRef, msgid, insid, IssrLabl, VOTEQTY AS QTY FROM CTE_VOTE
						WHERE VOTETP = 'CFOR'        		
						) AS QTYALL2
						ON QTYALL2.caRef = dtl.caRef
						AND QTYALL2.msgid = dtl.msgid 
						AND QTYALL2.insid = dtl.insid 
						AND QTYALL2.IssrLabl = vot.IssrLabl
	
					LEFT JOIN (
						SELECT caRef, msgid, insid, IssrLabl, VOTEQTY AS QTY FROM CTE_VOTE 
						WHERE VOTETP = 'CAGS'        		
						) AS QTYALL3
						ON QTYALL3.caRef = dtl.caRef
						AND QTYALL3.msgid = dtl.msgid 
						AND QTYALL3.insid = dtl.insid 
						AND QTYALL3.IssrLabl = vot.IssrLabl
	
					LEFT JOIN (
						SELECT caRef, msgid, insid, IssrLabl, VOTEQTY AS QTY FROM CTE_VOTE
						WHERE VOTETP = 'ABST'        		
						) AS QTYALL4
						ON QTYALL4.caRef = dtl.caRef
						AND QTYALL4.msgid = dtl.msgid 
						AND QTYALL4.insid = dtl.insid 
						AND QTYALL4.ISSRLABL = vot.ISSRLABL
	
					LEFT JOIN (
						SELECT caRef, msgid,insid, SUM(QTY) AS QTY FROM ${FMEPINS1F} 
						GROUP BY caRef,msgid,insid
						) AS QTY
						ON QTY.caRef = dtl.caRef
						AND QTY.msgid = dtl.msgid	
						AND QTY.insid = dtl.insid
			
					WHERE hdr.caRef = '${caRef}' 
						AND vot.voteTp  <> ''						
						AND dtl.sts     = '${INS_STS_30}')
						AS DATA	

				WHERE (data.NbOfVotesFor > 0 OR data.NbOfVotesAgnst > 0 OR data.NbOfVotesAbstn > 0)						

				GROUP BY
					data.caref,
					data.msgId,
					data.insId,				
					data.IssrLabl,			
					data.kdpwbnfid,
					data.idntycrdnb,
					data.rghtsHldrNm,                	          												
					data.shldId,
					data.factor
					`;      
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
				log.error(`/votesActionModeList Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
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
				log.error(`/votesActionModeList Brak szczegółów zdarzenia ${caRef}`);
				res.status(httpStatus.OK).json([]);
				res.end();
				return;
			}

			let disResult = [];  
			const map = new Map();
			for (const item of dtlResult) {
				if(!map.has(item.IssrLabl)) {
					map.set(item.IssrLabl, true);    // set any value to Map
				  	disResult.push(item);
			  	}
		  	}  

        	const mtgGnlInf = {
          		IssrCd: hdrResult.IssrCd,
          		IssrNm: hdrResult.IssrNm,
          		MtgTp: hdrResult.MtgTp,
          		MtgDt: hdrResult.MtgDt,
          		MtgTm: hdrResult.MtgTm,
          		EntitlmntFxgDt: hdrResult.EntitlmntFxgDt
        	};

        	const VotePerAgndRsltn = disResult.map(item => ({
            	IssrLabl: item.IssrLabl,
            	TtlNbOfVotes: item.TtlNbOfVotes,
            	TtlNbOfVotesFor: item.TtlNbOfVotesFor,
            	TtlNbOfVotesAgnst: item.TtlNbOfVotesAgnst,
            	TtlNbOfVotesAbstn: item.TtlNbOfVotesAbstn,
            	VoteInstrDtls: {
              		VoteInstr: dtlResult.filter(elem => (elem.IssrLabl === item.IssrLabl 												
                                                )).map(dtl => ({						
						IdKDPW: dtl.IdKDPW,						
                  		RghtsHldrNm: dtl.RghtsHldrNm,
                  		IdntyCardNb: dtl.IdntyCardNb,
                  		NbOfScties: dtl.NbOfScties,
                  		NbOfVotes: dtl.NbOfVotes,
                  		NbOfVotesFor: dtl.NbOfVotesFor,
                  		NbOfVotesAgnst: dtl.NbOfVotesAgnst,
                  		NbOfVotesAbstn: dtl.NbOfVotesAbstn  
                	}))               
            	}
          	}));        

        	const VoteDtls = {
          		VotePerAgndRsltn          
        	};

        	const result = {
          		MtgGnlInf: mtgGnlInf,
          		VoteDtls: VoteDtls
        	};

        	res.status(httpStatus.OK).json(result);
        	res.end();
      	});
    });
  });
}
module.exports = registerRoutes;