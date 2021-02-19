/**
 * Struktura komunikatu: Wykaz osób uprawnionych do
 * udziału w walnym zgromadzeniu (seev.lst.001.01)
 * 
 * Wykaz osób uprawnionych do udziału w walnym zgromadzeniuu
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
  CAREF: caRef,
  ISIN: Isin,
  MSGID: MsgId,
  INSID: InsId,	
  SHLDID: ShldId,	
	MBR: KDPWMmbId,
  FULLNM: KDPWMmbNm,
  STREET: StrtNm,
	BLDGNBR: BldgNb, 
	FLATNBR: FlatNb,
	ZIPCODE: PstCd,
	CITY: TwnNm,
  COUNTRY: Ctry,
  KDPWBNFID: IdKDPW,
  RGHTSHLDRNM: RghtsHldrNm,
  IDNTYCRDNB: IdntyCardNb,
  SHLDASTRT: ShldaStrt,
	SHLDABLD: ShldaBld,
	SHLDAPCD: ShldaPcd,
	SHLDATNM: ShldatNm,
  SHLDACTY: ShldaCty,
  IDTP: IdTp,
  ID: Id,
	PRTCPTTP: PrtcptTp,
	QTY: ShrhldgQty,
  ADDTLTXT: AddtlTxt
}) => ({  
  caRef,
  Isin,
  MsgId,
  InsId, 
  ShldId,   
  KDPWMmbId,
  KDPWMmbNm,
  StrtNm,
  BldgNb,
  FlatNb,
  PstCd,
  TwnNm,
  Ctry,
  IdKDPW: IdKDPW === '' ? '000' : IdKDPW,
  RghtsHldrNm,
  IdntyCardNb,
  ShldaStrt,
	ShldaBld,
	ShldaPcd,
	ShldatNm,
  ShldaCty,
  IdTp: IdTp === "" ? IdTp : dics.PersonIdentityType.get(IdTp),
  Id,
  PrtcptTp: PrtcptTp === "" ? PrtcptTp : dics.ShareholderType.get(PrtcptTp),
  ShrhldgQty: ShrhldgQty === '' ? '0' : ShrhldgQty,
  AddtlTxt
});

const registerRoutes = router => {

  /*
   * WYKAZ OSÓB UPRAWNIONYCH DO UDZIAŁU W WALNYM ZGROMADZENIU – TRYB PODSTAWOWY I ROZSZERZONY    
   */
  router.get("/rghtsHldrsList", (req, res) => {
    const caRef = req.query.CARef;
    log.log(`/rghtsHldrsList caRef=${caRef} `);

    if (!regex.caRefRegEx.test(caRef)) {
      log.log(`/rghtsHldrsList CAREF ${caRef} parameter error`);
      res.status(httpStatus.BAD_REQUEST).json([]);
      res.end();
      return;
    }
    
    const FMEDHDR0F = `MECA${globals.def.envId}.FMEDHDR0L0`;
    const FMEPINS0F = `MECA${globals.def.envId}.FMEPINS0L0`;
    const FMEPINS1F = `MECA${globals.def.envId}.FMEPINS1L0`;
    const FMEPINS2F = `MECA${globals.def.envId}.FMEPINS2L0`;    
    const FADRCON0F = `MLBD${globals.def.envId}.FADRCON0L0`;
    const FFINSTR0F = `MLBD${globals.def.envId}.FFINSTR0L0`;
    const FREGCON0F = `MLBD${globals.def.envId}.FREGCON0L0`;
    const FINSTIT0F = `MSRD${globals.def.envId}.FINSTIT0L0`;

    const hdrSqlCmd = `
        SELECT 
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
            AND hdr.mbr = dtl.acctOwnrId    

        INNER JOIN ${FMEDHDR0F} def        
            ON def.caRef = hdr.caRef

        LEFT JOIN ( 
            SELECT issuer,
                SUM(TOTALISSUE) AS TOTALISSUE                                                                                            
            FROM ${FFINSTR0F}          
            WHERE FINTP = 'ESB'                                                                                                                                            
	        GROUP BY ISSUER                                              

	      ) AS ISIN
	        ON ISIN.issuer = def.ISSUER

        LEFT JOIN ( 
            SELECT CAREF,
                SUM(QTY) AS TOTALQTY,
                COUNT(1) AS TOTALCOUNT                                                                                          
            FROM ${FMEPINS1F}
	        GROUP BY CAREF
        ) AS QTY
        ON  qty.CAREF = def.CAREF 
        
        LEFT JOIN(
            SELECT o.ID, r.FULLNM
            FROM ${FINSTIT0F} o
            INNER JOIN ${FREGCON0F} r on r.ID = o.CONTRID
            WHERE o.ELIGDT = (SELECT MAX(i.ELIGDT) FROM ${FINSTIT0F} i WHERE i.ID = o.ID)
        ) AS CON ON CON.ID = def.ISSUER

         WHERE hdr.caRef = '${caRef}' `;
    console.log(hdrSqlCmd);          

    const dtlSqlCmd = `
      SELECT DISTINCT
	      ins0.caref,
	      ins0.msgid,
        ins1.insid,
        ins2.shldId,		
	      ins0.isin,
	      ins0.mbr,
	      TRIM(con.fullNm) AS fullNm,
	      TRIM(adr.STREET) AS STREET,
	      TRIM(adr.BLDGNBR) AS BLDGNBR, 
	      TRIM(adr.FLATNBR) AS FLATNBR,
	      TRIM(adr.ZIPCODE) AS ZIPCODE,
	      TRIM(adr.CITY) AS CITY,
	      TRIM(adr.country) AS COUNTRY,
	      TRIM(CAST(ins1.KDPWBNFID AS CHAR(18))) AS KDPWBNFID,
	      TRIM(TRIM(ins2.SHLDNM) || ' ' ||  TRIM(ins2.SHLDSURNM)  || ' ' || TRIM(ins2.SHLDFRSTNM)) AS RghtsHldrNm,
	      TRIM(ins1.IDNTYCRDNB) AS IDNTYCRDNB,
	      TRIM(ins2.SHLDASTRT) AS SHLDASTRT,
	      TRIM(ins2.SHLDABLD) AS SHLDABLD,
	      TRIM(ins2.SHLDAPCD) AS SHLDAPCD,
	      TRIM(ins2.SHLDATNM) AS SHLDATNM,
	      TRIM(ins2.SHLDACTY) AS SHLDACTY,
	      TRIM(ins2.SHLDNPIDTP) AS IdTp,
	      TRIM(ins2.SHLDNPID) AS Id,
	      TRIM(ins1.PRTCPTTP) AS PRTCPTTP,
	      ins1.qty,
        '' AS AddtlTxt      
        
      FROM ${FMEPINS0F} ins0

      INNER JOIN ${FMEPINS1F} ins1
        ON ins1.caRef = ins0.caRef
        AND ins1.msgid = ins0.msgId

      INNER JOIN ${FMEPINS2F} ins2
        ON ins2.caRef = ins1.caRef 
        AND ins2.msgId = ins1.msgId      
        AND ins2.insId = ins1.insId	

      LEFT JOIN(
	      SELECT o.ID, r.FULLNM, r.id as adrid
	      FROM ${FINSTIT0F} o
	      INNER JOIN ${FREGCON0F} r on r.ID = o.CONTRID
	      WHERE o.ELIGDT = (SELECT MAX(i.ELIGDT) FROM ${FINSTIT0F} i WHERE i.ID = o.ID)
	            AND r.eligDt = (SELECT MAX(i.ELIGDT) FROM ${FREGCON0F} i WHERE i.ID = r.ID)	
      ) AS CON ON CON.ID = ins0.mbr

      LEFT JOIN(
	      SELECT a.id, a.street,  a.BLDGNBR, a.FLATNBR, a.ZIPCODE, a.CITY, a.country
	      FROM ${FADRCON0F} a
	      WHERE a.ELIGDT = (SELECT MAX(i.ELIGDT) FROM ${FADRCON0F} i WHERE i.ID = a.id AND a.tp = 'ADMI')  AND a.tp = 'ADMI'			
      ) AS ADR ON ADR.ID = con.adrid 

      WHERE ins0.caRef = '${caRef}' AND ins1.sts = '30' 
      ORDER BY ins0.caref,
              ins0.msgid,
              ins1.insid,
              ins2.shldId,		
              ins0.isin `;    
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
        log.error(`/rghtsHldrsList Brak zarejestrowanego zdarzenia o identyfikatorze ${caRef}`);
        res.status(httpStatus.OK).json([]);
        res.end();
        return;
      }
      
      const mtgGnlInf = {
          IssrCd: hdrResult.IssrCd,
          IssrNm: hdrResult.IssrNm,
          MtgTp: hdrResult.MtgTp,
          MtgDt: hdrResult.MtgDt,
          MtgTm: hdrResult.MtgTm,
          EntitlmntFxgDt: hdrResult.EntitlmntFxgDt
      };              	  	 	  	  	        
      
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
          log.error(`/rghtsHldrsList Brak szczegółów zdarzenia ${caRef}`);
          res.status(httpStatus.OK).json([]);
          res.end();
          return;
        }

        let disResult = [];  
        const map = new Map();
        for (const item of dtlResult) {
          if(!map.has(item.Isin)){
              map.set(item.Isin, item);    // set any value to Map
              disResult.push(item);
          }
      }                
	  
	  let uniqData = [];
	  for (const item of dtlResult) {		
        if(!uniqData.find(a => (a.KDPWMmbId === item['KDPWMmbId'] && a.Isin === item['Isin']))){
          uniqData.push(item);   
        }		         
      }   	  
	
        const prtcptnMtdGnlInf = {
          TtlNbOfBearerSctiesKDPW: hdrResult.TtlNbOfBearerSctiesKDPW,  
          TtlNbOfSctiesRegd: hdrResult.TtlNbOfSctiesRegd,
          TtlNbOfShrhldgRegd: hdrResult.TtlNbOfShrhldgRegd,
          KDPWList: {
            FinInstrmStmt: disResult                                                       
                           .map(item => ({
                Isin: item.Isin,                
                StmtForMmb: uniqData.filter((elem =>                                             
											 elem.Isin === item.Isin	
                                            )).map(dtl => ({
                                                 KDPWMmbId: dtl.KDPWMmbId,
                                                 KDPWMmbNm: dtl.KDPWMmbNm,
                                                 KDPWMmbPstlAdr: {
                                                    StrtNm: dtl.StrtNm,
                                                    BldgNb: dtl.BldgNb + ' ' + dtl.FlatNb,                                                  
                                                    PstCd: dtl.PstCd,
                                                    TwnNm: dtl.TwnNm,
                                                    Ctry: dtl.Ctry
                                                  },
                                                   RghtsHldrDtls: dtlResult.filter(hld => (																					
                                                                                  hld.KDPWMmbId === dtl.KDPWMmbId                                                                                  
                                                                                  && hld.Isin === dtl.Isin 																				  																			   
                                                                                  )).map(hlddtl => ({            
                                                                              IdKDPW: hlddtl.IdKDPW,
                                                                              RghtsHldrNm: hlddtl.RghtsHldrNm,
                                                                              IdntyCardNb: hlddtl.IdntyCardNb,
                                                                              RghtsHldrAdr: {
                                                                              StrtNm: hlddtl.ShldaStrt,
                                                                              BldgNb: hlddtl.ShldaBld,                                                  
                                                                              PstCd: hlddtl.ShldaPcd,
                                                                              TwnNm: hlddtl.ShldatNm,
                                                                              Ctry: hlddtl.ShldaCty},
                                                                              RghtsHldrId: {
                                                                                IdTp: hlddtl.IdTp,
                                                                                Id: hlddtl.Id},
                                                                              PrtcpntTp: hlddtl.PrtcptTp,
                                                                              ShrhldgQty: hlddtl.ShrhldgQty,
                                                                              AddtlTxt: hlddtl.AddtlTxt}))
              }))                
          })),                 
      }};

        const result = { MtgGnlInf: mtgGnlInf,
                         PrtcptnMtdGnlInf: prtcptnMtdGnlInf };
		
        res.status(httpStatus.OK).json(result);
        res.end();
      });      
    });      
  });
}

module.exports = registerRoutes;
