using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Dapper;
using Cyber.Services;
using System.Data;

namespace Cyber.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ConceptosController : ControllerBase
{
    private readonly DatabaseService _db;

    public ConceptosController(DatabaseService db)
    {
        _db = db;
    }

    [HttpPost("setup")]
    [AllowAnonymous]
    public IActionResult Setup()
    {
        using var conn = _db.GetConnection();
        conn.Open();
        try {
            // SEQUENCES
            try { conn.Execute("CREATE SEQUENCE SEQ_CONCEPTO START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}
            try { conn.Execute("CREATE SEQUENCE SEQ_CONCEPTO_DET START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}

            // TABLES
            try {
                conn.Execute(@"
                    CREATE TABLE CONCEPTO (
                        CON_ID NUMBER(10) NOT NULL PRIMARY KEY,
                        CON_CODIGO VARCHAR2(20) UNIQUE NOT NULL,
                        CON_NOMBRE VARCHAR2(100) NOT NULL,
                        CON_TIPO VARCHAR2(20) -- INGRESO, GASTO, MIXTO
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            try {
                conn.Execute(@"
                    CREATE TABLE CONCEPTO_DETALLE (
                        CONDET_ID NUMBER(10) NOT NULL PRIMARY KEY,
                        CON_ID NUMBER(10) NOT NULL,
                        CUENTA_CODIGO VARCHAR2(20) NOT NULL,
                        NATURALEZA VARCHAR2(1) NOT NULL, -- D (Debito) / C (Credito)
                        PORCENTAJE NUMBER(5,2) DEFAULT 0, -- 100% o parcial
                        CONSTRAINT FK_CON_DET FOREIGN KEY (CON_ID) REFERENCES CONCEPTO(CON_ID) ON DELETE CASCADE
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            // TRIGGERS
            try {
                conn.Execute(@"
                    CREATE OR REPLACE TRIGGER TRG_CONCEPTO_ID BEFORE INSERT ON CONCEPTO FOR EACH ROW
                    BEGIN SELECT SEQ_CONCEPTO.NEXTVAL INTO :new.CON_ID FROM dual; END;");
                
                conn.Execute(@"
                    CREATE OR REPLACE TRIGGER TRG_CONCEPTO_DET_ID BEFORE INSERT ON CONCEPTO_DETALLE FOR EACH ROW
                    BEGIN SELECT SEQ_CONCEPTO_DET.NEXTVAL INTO :new.CONDET_ID FROM dual; END;");
            } catch {}

            return Ok(new { success = true, message = "Tablas de Conceptos Creadas" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        return Ok(conn.Query("SELECT * FROM CONCEPTO ORDER BY CON_NOMBRE"));
    }

    [HttpPost]
    public IActionResult Create([FromBody] ConceptoRequest req)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var trans = conn.BeginTransaction();
        try {
            conn.Execute("INSERT INTO CONCEPTO (CON_CODIGO, CON_NOMBRE, CON_TIPO) VALUES (:Codigo, :Nombre, :Tipo)", 
                new { req.Codigo, req.Nombre, req.Tipo }, trans);
            
            trans.Commit();
             return Ok(new { success = true });
        } catch (Exception ex) {
            trans.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    public class ConceptoRequest {
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public string Tipo { get; set; }
    }
}
