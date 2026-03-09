using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Dapper;
using Cyber.Services;
using Cyber.Models;

namespace Cyber.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CuentasController : ControllerBase
{
    private readonly DatabaseService _db;

    public CuentasController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet("schema")]
    [AllowAnonymous]
    public IActionResult GetSchema()
    {
        using var conn = _db.GetConnection();
        try {
            var columns = conn.Query<dynamic>(@"
                SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
                FROM user_tab_columns 
                WHERE table_name = 'CUENTA'
                ORDER BY COLUMN_ID");
            
            return Ok(new { 
                table = "CUENTA",
                columns = columns 
            });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message, stack = ex.StackTrace });
        }
    }

    [HttpPost("create-table-script")]
    [AllowAnonymous]
    public IActionResult CreateTable()
    {
        using var conn = _db.GetConnection();
        conn.Open();
        try {
            var sql = @"
            CREATE TABLE CUENTA
            (
              CD_TPO_PUC        NUMBER(3)                   NOT NULL,
              CUENCOR           NUMBER(6)                   NOT NULL,
              CUENCLA           NUMBER(1),
              CUENGRU           NUMBER(1),
              CUENCUE           NUMBER(2),
              CUENSUB           NUMBER(2),
              CUENAX1           NUMBER(2),
              CUENAX2           NUMBER(3),
              CUENNOM           VARCHAR2(200 BYTE),
              CUENFCOD          NUMBER(5),
              CUENSIG           CHAR(1 BYTE),
              CUENDCH           NUMBER(1),
              AJSTBLE_INFLCION  CHAR(1 BYTE),
              AJSTE_CRDTO       NUMBER(5),
              AJSTE_DBTO        NUMBER(5),
              CMPRTMNTO_FSCAL   NUMBER(5,3),
              TIPFCOD           NUMBER(5),
              REGTICOD          NUMBER(5),
              C_TRCRO           CHAR(1 BYTE),
              C_AFCTBLE         CHAR(1 BYTE),
              C_CHQUE           CHAR(1 BYTE),
              C_DCMNTO          CHAR(1 BYTE),
              C_FCHA            CHAR(1 BYTE),
              C_CNTRO_CSTO      CHAR(1 BYTE),
              CUENCAT           NUMBER(3),
              CRPAUTM           NUMBER(2),
              CUENAX3           NUMBER(3),
              HMLGCION_1        VARCHAR2(20 BYTE),
              HMLGCION_2        VARCHAR2(20 BYTE),
              TPO_CTA           INTEGER,
              NMBRE_HMLGCION_1  VARCHAR2(30 BYTE),
              NMBRE_HMLGCION_2  VARCHAR2(80 BYTE),
              FCHA_RGSTRO       DATE,
              C_BASE            CHAR(1 BYTE),
              NRO_CUENTA        NUMBER(14),
              NRO_CUENTA_NIF    VARCHAR2(14 BYTE),
              NMBRE_CTA_NIF     VARCHAR2(80 BYTE),
              HMLGCION_3        VARCHAR2(20 BYTE),
              NMBRE_HMLGCION_3  VARCHAR2(80 BYTE)
            )";
            
            conn.Execute(sql);
            return Ok(new { success = true, message = "Table CUENTA created successfully" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("tables")]
    [AllowAnonymous]
    public IActionResult GetTables()
    {
        using var conn = _db.GetConnection();
        try {
            var tables = conn.Query<string>("SELECT table_name FROM user_tables ORDER BY table_name");
            return Ok(new { tables = tables });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        try {
            // Select all columns with Dapper matching aliases
            var sql = @"
                SELECT 
                    CD_TPO_PUC as CdTpoPuc, CUENCOR as Cuencor, CUENCLA as Cuencla, CUENGRU as Cuengru, 
                    CUENCUE as Cuencue, CUENSUB as Cuensub, CUENAX1 as Cuenax1, CUENAX2 as Cuenax2, 
                    CUENNOM as Cuennom, CUENFCOD as Cuenfcod, CUENSIG as Cuensig, CUENDCH as Cuendch, 
                    AJSTBLE_INFLCION as AjstbleInflcion, AJSTE_CRDTO as AjsteCrdto, AJSTE_DBTO as AjsteDbto, 
                    CMPRTMNTO_FSCAL as CmprtmntoFscal, TIPFCOD as Tipfcod, REGTICOD as Regticod, 
                    C_TRCRO as CTrcro, C_AFCTBLE as CAfctble, C_CHQUE as CChque, C_DCMNTO as CDcmnto, 
                    C_FCHA as CFcha, C_CNTRO_CSTO as CCntroCsto, CUENCAT as Cuencat, CRPAUTM as Crpautm, 
                    CUENAX3 as Cuenax3, HMLGCION_1 as Hmlgcion1, HMLGCION_2 as Hmlgcion2, HMLGCION_3 as Hmlgcion3, 
                    NMBRE_HMLGCION_1 as NmbreHmlgcion1, NMBRE_HMLGCION_2 as NmbreHmlgcion2, NMBRE_HMLGCION_3 as NmbreHmlgcion3,
                    TPO_CTA as TpoCta, FCHA_RGSTRO as FchaRgstro, C_BASE as CBase, NRO_CUENTA as NroCuenta, 
                    NRO_CUENTA_NIF as NroCuentaNif, NMBRE_CTA_NIF as NmbreCtaNif
                FROM CUENTA 
                ORDER BY CUENCOR";
            
            var cuentas = conn.Query<Cuenta>(sql);
            return Ok(cuentas);
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        using var conn = _db.GetConnection();
        try {
            var sql = @"
                SELECT 
                    CD_TPO_PUC as CdTpoPuc, CUENCOR as Cuencor, CUENCLA as Cuencla, CUENGRU as Cuengru, 
                    CUENCUE as Cuencue, CUENSUB as Cuensub, CUENAX1 as Cuenax1, CUENAX2 as Cuenax2, 
                    CUENNOM as Cuennom, CUENFCOD as Cuenfcod, CUENSIG as Cuensig, CUENDCH as Cuendch, 
                    AJSTBLE_INFLCION as AjstbleInflcion, AJSTE_CRDTO as AjsteCrdto, AJSTE_DBTO as AjsteDbto, 
                    CMPRTMNTO_FSCAL as CmprtmntoFscal, TIPFCOD as Tipfcod, REGTICOD as Regticod, 
                    C_TRCRO as CTrcro, C_AFCTBLE as CAfctble, C_CHQUE as CChque, C_DCMNTO as CDcmnto, 
                    C_FCHA as CFcha, C_CNTRO_CSTO as CCntroCsto, CUENCAT as Cuencat, CRPAUTM as Crpautm, 
                    CUENAX3 as Cuenax3, HMLGCION_1 as Hmlgcion1, HMLGCION_2 as Hmlgcion2, HMLGCION_3 as Hmlgcion3, 
                    NMBRE_HMLGCION_1 as NmbreHmlgcion1, NMBRE_HMLGCION_2 as NmbreHmlgcion2, NMBRE_HMLGCION_3 as NmbreHmlgcion3,
                    TPO_CTA as TpoCta, FCHA_RGSTRO as FchaRgstro, C_BASE as CBase, NRO_CUENTA as NroCuenta, 
                    NRO_CUENTA_NIF as NroCuentaNif, NMBRE_CTA_NIF as NmbreCtaNif
                FROM CUENTA WHERE CUENCOR = :id";
                
            var cuenta = conn.QueryFirstOrDefault<Cuenta>(sql, new { id });
            
            if (cuenta == null) return NotFound();
            return Ok(cuenta);
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public IActionResult Create([FromBody] Cuenta cuenta)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            // Set defaults and mandatory fields logic
            if (!cuenta.CdTpoPuc.HasValue) cuenta.CdTpoPuc = 1;
            if (cuenta.FchaRgstro == null) cuenta.FchaRgstro = DateTime.Now;

            // Full Insert
            var sql = @"INSERT INTO CUENTA (
                CD_TPO_PUC, CUENCOR, CUENCLA, CUENGRU, CUENCUE, CUENSUB, CUENAX1, CUENAX2, 
                CUENNOM, CUENFCOD, CUENSIG, CUENDCH, AJSTBLE_INFLCION, AJSTE_CRDTO, AJSTE_DBTO, 
                CMPRTMNTO_FSCAL, TIPFCOD, REGTICOD, C_TRCRO, C_AFCTBLE, C_CHQUE, C_DCMNTO, 
                C_FCHA, C_CNTRO_CSTO, CUENCAT, CRPAUTM, CUENAX3, HMLGCION_1, HMLGCION_2, 
                TPO_CTA, NMBRE_HMLGCION_1, NMBRE_HMLGCION_2, FCHA_RGSTRO, C_BASE, NRO_CUENTA, 
                NRO_CUENTA_NIF, NMBRE_CTA_NIF, HMLGCION_3, NMBRE_HMLGCION_3
            ) VALUES (
                :CdTpoPuc, :Cuencor, :Cuencla, :Cuengru, :Cuencue, :Cuensub, :Cuenax1, :Cuenax2, 
                :Cuennom, :Cuenfcod, :Cuensig, :Cuendch, :AjstbleInflcion, :AjsteCrdto, :AjsteDbto, 
                :CmprtmntoFscal, :Tipfcod, :Regticod, :CTrcro, :CAfctble, :CChque, :CDcmnto, 
                :CFcha, :CCntroCsto, :Cuencat, :Crpautm, :Cuenax3, :Hmlgcion1, :Hmlgcion2, 
                :TpoCta, :NmbreHmlgcion1, :NmbreHmlgcion2, :FchaRgstro, :CBase, :NroCuenta, 
                :NroCuentaNif, :NmbreCtaNif, :Hmlgcion3, :NmbreHmlgcion3
            )";
            
            conn.Execute(sql, cuenta, transaction);
            transaction.Commit();
            return Ok(new { success = true, cuenta });
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] Cuenta cuenta)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            // Full Update
            var sql = @"UPDATE CUENTA SET 
                CD_TPO_PUC = :CdTpoPuc,
                CUENCLA = :Cuencla, CUENGRU = :Cuengru, CUENCUE = :Cuencue, 
                CUENSUB = :Cuensub, CUENAX1 = :Cuenax1, CUENAX2 = :Cuenax2, 
                CUENNOM = :Cuennom, CUENFCOD = :Cuenfcod, CUENSIG = :Cuensig, 
                CUENDCH = :Cuendch, AJSTBLE_INFLCION = :AjstbleInflcion, 
                AJSTE_CRDTO = :AjsteCrdto, AJSTE_DBTO = :AjsteDbto, 
                CMPRTMNTO_FSCAL = :CmprtmntoFscal, TIPFCOD = :Tipfcod, 
                REGTICOD = :Regticod, C_TRCRO = :CTrcro, C_AFCTBLE = :CAfctble, 
                C_CHQUE = :CChque, C_DCMNTO = :CDcmnto, C_FCHA = :CFcha, 
                C_CNTRO_CSTO = :CCntroCsto, CUENCAT = :Cuencat, CRPAUTM = :Crpautm, 
                CUENAX3 = :Cuenax3, HMLGCION_1 = :Hmlgcion1, HMLGCION_2 = :Hmlgcion2, 
                TPO_CTA = :TpoCta, NMBRE_HMLGCION_1 = :NmbreHmlgcion1, 
                NMBRE_HMLGCION_2 = :NmbreHmlgcion2, C_BASE = :CBase, 
                NRO_CUENTA = :NroCuenta, NRO_CUENTA_NIF = :NroCuentaNif, 
                NMBRE_CTA_NIF = :NmbreCtaNif, HMLGCION_3 = :Hmlgcion3, 
                NMBRE_HMLGCION_3 = :NmbreHmlgcion3
                WHERE CUENCOR = :Cuencor";
            
            // Ensure consistency between URL id and body object
            cuenta.Cuencor = id; 
            
            var affected = conn.Execute(sql, cuenta, transaction);

            if (affected == 0) {
                transaction.Rollback();
                return NotFound();
            }
            
            transaction.Commit();
            return Ok(cuenta);
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            var affected = conn.Execute("DELETE FROM CUENTA WHERE CUENCOR = :id", new { id }, transaction);
            
            if (affected == 0) {
                transaction.Rollback();
                return NotFound();
            }
            
            transaction.Commit();
            return Ok(new { success = true });
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("seed")]
    [AllowAnonymous]
    public IActionResult SeedData()
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            var cuentas = new[] {
                new { Cuencor = 1, Cuencla = 1, Cuengru = 0, Cuencue = 0, Cuensub = 0, Cuenax1 = 0, Cuenax2 = 0, Cuenax3 = 0, Cuennom = "ACTIVO", Cuensig = "D", CAfctble = "N", NroCuenta = 1L },
                new { Cuencor = 11, Cuencla = 1, Cuengru = 1, Cuencue = 0, Cuensub = 0, Cuenax1 = 0, Cuenax2 = 0, Cuenax3 = 0, Cuennom = "DISPONIBLE", Cuensig = "D", CAfctble = "N", NroCuenta = 11L },
                new { Cuencor = 1105, Cuencla = 1, Cuengru = 1, Cuencue = 5, Cuensub = 0, Cuenax1 = 0, Cuenax2 = 0, Cuenax3 = 0, Cuennom = "CAJA", Cuensig = "D", CAfctble = "S", NroCuenta = 1105L },
                new { Cuencor = 110505, Cuencla = 1, Cuengru = 1, Cuencue = 5, Cuensub = 5, Cuenax1 = 0, Cuenax2 = 0, Cuenax3 = 0, Cuennom = "CAJA GENERAL", Cuensig = "D", CAfctble = "S", NroCuenta = 110505L }
            };

            foreach (var c in cuentas) {
                var sql = @"INSERT INTO CUENTA 
                    (CD_TPO_PUC, CUENCOR, CUENCLA, CUENGRU, CUENCUE, CUENSUB, CUENAX1, CUENAX2, CUENAX3, CUENNOM, CUENSIG, C_AFCTBLE, NRO_CUENTA, FCHA_RGSTRO) 
                    VALUES 
                    (1, :Cuencor, :Cuencla, :Cuengru, :Cuencue, :Cuensub, :Cuenax1, :Cuenax2, :Cuenax3, :Cuennom, :Cuensig, :CAfctble, :NroCuenta, SYSDATE)";
                
                conn.Execute(sql, c, transaction);
            }

            transaction.Commit();
            return Ok(new { success = true, message = $"Se insertaron {cuentas.Length} cuentas del PUC" });
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message, stack = ex.StackTrace });
        }
    }
}
