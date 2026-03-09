using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Dapper;
using Cyber.Services;
using System.Data;

namespace Cyber.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AsientosController : ControllerBase
{
    private readonly DatabaseService _db;

    public AsientosController(DatabaseService db)
    {
        _db = db;
    }

    [HttpPost("setup")]
    [AllowAnonymous]
    public IActionResult SetupTables()
    {
        using var conn = _db.GetConnection();
        conn.Open();
        try {
            // 1. SECUENCIAS
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO_DET START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}
            
            // SECUENCIAS HISTORIAL
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO_HIST START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO_DET_HIST START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}

            // 2. TABLAS PRINCIPALES
            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO (
                        ASI_ID NUMBER(10) NOT NULL PRIMARY KEY,
                        ASI_NUMERO VARCHAR2(20) UNIQUE NOT NULL,
                        ASI_FECHA DATE DEFAULT SYSDATE,
                        ASI_DESCRIPCION VARCHAR2(500),
                        ASI_ESTADO VARCHAR2(20) DEFAULT 'BORRADOR',
                        ASI_TOTAL_DEBITO NUMBER(18,2) DEFAULT 0,
                        ASI_TOTAL_CREDITO NUMBER(18,2) DEFAULT 0,
                        USUARIO_ID VARCHAR2(50),
                        FECHA_CREACION DATE DEFAULT SYSDATE,
                        VERSION NUMBER(5) DEFAULT 1,
                        USUARIO_MODIFICACION VARCHAR2(50),
                        FECHA_MODIFICACION DATE
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO_DETALLE (
                        DET_ID NUMBER(10) NOT NULL PRIMARY KEY,
                        ASI_ID NUMBER(10) NOT NULL,
                        CUENTA_CODIGO VARCHAR2(20) NOT NULL,
                        TERCERO_ID VARCHAR2(20),
                        DET_DESCRIPCION VARCHAR2(500),
                        DET_DEBITO NUMBER(18,2) DEFAULT 0,
                        DET_CREDITO NUMBER(18,2) DEFAULT 0,
                        CONSTRAINT FK_ASI_DET FOREIGN KEY (ASI_ID) REFERENCES ASIENTO(ASI_ID) ON DELETE CASCADE
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            // 3. TABLAS HISTORIAL (AUDITORÍA)
            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO_HISTORIAL (
                        HIST_ID NUMBER(10) PRIMARY KEY,
                        ASI_ID NUMBER(10),
                        VERSION NUMBER(5),
                        ASI_NUMERO VARCHAR2(20),
                        ASI_FECHA DATE,
                        ASI_DESCRIPCION VARCHAR2(500),
                        ASI_ESTADO VARCHAR2(20),
                        ASI_TOTAL_DEBITO NUMBER(18,2),
                        ASI_TOTAL_CREDITO NUMBER(18,2),
                        USUARIO_ID VARCHAR2(50),
                        FECHA_CREACION DATE,
                        FECHA_ARCHIVADO DATE DEFAULT SYSDATE,
                        MOTIVO_CAMBIO VARCHAR2(200)
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO_DETALLE_HIST (
                        HIST_DET_ID NUMBER(10) PRIMARY KEY,
                        HIST_ID NUMBER(10),
                        CUENTA_CODIGO VARCHAR2(20),
                        TERCERO_ID VARCHAR2(20),
                        DET_DESCRIPCION VARCHAR2(500),
                        DET_DEBITO NUMBER(18,2),
                        DET_CREDITO NUMBER(18,2)
                    )");
            } catch (Exception ex) { if(!ex.Message.Contains("ORA-00955")) throw; }

            // 4. TRIGGERS PRIMARY
            try {
                conn.Execute(@"
                    CREATE OR REPLACE TRIGGER TRG_ASIENTO_ID
                    BEFORE INSERT ON ASIENTO FOR EACH ROW
                    BEGIN SELECT SEQ_ASIENTO.NEXTVAL INTO :new.ASI_ID FROM dual; END;");
                
                conn.Execute(@"
                    CREATE OR REPLACE TRIGGER TRG_ASIENTO_DET_ID
                    BEFORE INSERT ON ASIENTO_DETALLE FOR EACH ROW
                    BEGIN SELECT SEQ_ASIENTO_DET.NEXTVAL INTO :new.DET_ID FROM dual; END;");
            } catch {}

            return Ok(new { success = true, message = "Tablas de Asientos y Auditoría creadas (Oracle 11g)." });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("migrate")]
    [AllowAnonymous]
    public IActionResult Migrate()
    {
        using var conn = _db.GetConnection();
        conn.Open();
        try {
            // 1. Add Columns to ASIENTO if missing
            try { conn.Execute("ALTER TABLE ASIENTO ADD (VERSION NUMBER(5) DEFAULT 1, USUARIO_MODIFICACION VARCHAR2(50), FECHA_MODIFICACION DATE)"); } catch {}

            // 2. Add DET_BASE to DETAILS
            try { conn.Execute("ALTER TABLE ASIENTO_DETALLE ADD (DET_BASE NUMBER(18,2) DEFAULT 0)"); } catch {}
            try { conn.Execute("ALTER TABLE ASIENTO_DETALLE_HIST ADD (DET_BASE NUMBER(18,2) DEFAULT 0)"); } catch {}

            // 3. Create History Tables (if not exist)
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO_HIST START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}
            try { conn.Execute("CREATE SEQUENCE SEQ_ASIENTO_DET_HIST START WITH 1 INCREMENT BY 1 NOCACHE"); } catch {}

            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO_HISTORIAL (
                        HIST_ID NUMBER(10) PRIMARY KEY,
                        ASI_ID NUMBER(10),
                        VERSION NUMBER(5),
                        ASI_NUMERO VARCHAR2(20),
                        ASI_FECHA DATE,
                        ASI_DESCRIPCION VARCHAR2(500),
                        ASI_ESTADO VARCHAR2(20),
                        ASI_TOTAL_DEBITO NUMBER(18,2),
                        ASI_TOTAL_CREDITO NUMBER(18,2),
                        USUARIO_ID VARCHAR2(50),
                        FECHA_CREACION DATE,
                        FECHA_ARCHIVADO DATE DEFAULT SYSDATE,
                        MOTIVO_CAMBIO VARCHAR2(200)
                    )");
            } catch {}

            try {
                conn.Execute(@"
                    CREATE TABLE ASIENTO_DETALLE_HIST (
                        HIST_DET_ID NUMBER(10) PRIMARY KEY,
                        HIST_ID NUMBER(10),
                        CUENTA_CODIGO VARCHAR2(20),
                        TERCERO_ID VARCHAR2(20),
                        DET_DESCRIPCION VARCHAR2(500),
                        DET_DEBITO NUMBER(18,2),
                        DET_CREDITO NUMBER(18,2)
                    )");
            } catch {}

            return Ok(new { success = true, message = "Migración completada." });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        var sql = "SELECT * FROM ASIENTO ORDER BY ASI_ID DESC FETCH FIRST 50 ROWS ONLY";
        return Ok(conn.Query(sql));
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        using var conn = _db.GetConnection();
        var asiento = conn.QueryFirstOrDefault("SELECT * FROM ASIENTO WHERE ASI_ID = :id", new { id });
        if (asiento == null) return NotFound();

        var detalles = conn.Query("SELECT * FROM ASIENTO_DETALLE WHERE ASI_ID = :id", new { id });
        var historial = conn.Query("SELECT * FROM ASIENTO_HISTORIAL WHERE ASI_ID = :id ORDER BY VERSION DESC", new { id });
        
        return Ok(new { asiento, detalles, historial });
    }

    [HttpPost]
    public IActionResult Create([FromBody] AsientoRequest req)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var trans = conn.BeginTransaction();
        try {
            var userId = "ADMIN"; // TODO: claims

            var insertSql = @"INSERT INTO ASIENTO (ASI_NUMERO, ASI_FECHA, ASI_DESCRIPCION, ASI_ESTADO, ASI_TOTAL_DEBITO, ASI_TOTAL_CREDITO, USUARIO_ID, VERSION)
                            VALUES (:Numero, :Fecha, :Descripcion, 'BORRADOR', :TotalDebito, :TotalCredito, :UsuarioId, 1)";
            
            conn.Execute(insertSql, new {
                req.Numero,
                req.Fecha,
                req.Descripcion,
                req.TotalDebito,
                req.TotalCredito,
                UsuarioId = userId
            }, trans);

            var asiId = conn.ExecuteScalar<int>("SELECT ASI_ID FROM ASIENTO WHERE ASI_NUMERO = :Numero", new { req.Numero }, trans);

            var sqlDet = @"INSERT INTO ASIENTO_DETALLE (ASI_ID, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE)
                           VALUES (:AsiId, :Cuenta, :Tercero, :Desc, :Debito, :Credito, :Base)";

            foreach(var det in req.Detalles) {
                conn.Execute(sqlDet, new {
                    AsiId = asiId,
                    Cuenta = det.CuentaCodigo,
                    Tercero = det.TerceroId,
                    Desc = det.Descripcion ?? req.Descripcion,
                    Debito = det.Debito,
                    Credito = det.Credito,
                    Base = det.Base
                }, trans);
            }

            trans.Commit();
            return Ok(new { success = true, id = asiId });
        } catch (Exception ex) {
            trans.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] AsientoRequest req)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var trans = conn.BeginTransaction();
        try {
            var userId = "ADMIN"; // TODO

            // 1. Get Current Data
            var current = conn.QueryFirstOrDefault("SELECT * FROM ASIENTO WHERE ASI_ID = :id", new { id }, trans);
            if (current == null) return NotFound();

            // 2. Archive to History
            var histId = conn.ExecuteScalar<int>("SELECT SEQ_ASIENTO_HIST.NEXTVAL FROM dual", transaction: trans);
            
            conn.Execute(@"
                INSERT INTO ASIENTO_HISTORIAL (HIST_ID, ASI_ID, VERSION, ASI_NUMERO, ASI_FECHA, ASI_DESCRIPCION, ASI_ESTADO, 
                                             ASI_TOTAL_DEBITO, ASI_TOTAL_CREDITO, USUARIO_ID, FECHA_CREACION, MOTIVO_CAMBIO)
                VALUES (:HistId, :AsiId, :Version, :Numero, :Fecha, :Desc, :Estado, :Debito, :Credito, :User, :FecCre, 'CORRECCION')",
                new {
                    HistId = histId,
                    AsiId = current.ASI_ID,
                    Version = current.VERSION,
                    Numero = current.ASI_NUMERO,
                    Fecha = current.ASI_FECHA,
                    Desc = current.ASI_DESCRIPCION,
                    Estado = current.ASI_ESTADO,
                    Debito = current.ASI_TOTAL_DEBITO,
                    Credito = current.ASI_TOTAL_CREDITO,
                    User = current.USUARIO_ID,
                    FecCre = current.FECHA_CREACION
                }, trans);

            // Archive Details
            conn.Execute(@"
                INSERT INTO ASIENTO_DETALLE_HIST (HIST_DET_ID, HIST_ID, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE)
                SELECT SEQ_ASIENTO_DET_HIST.NEXTVAL, :HistId, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE
                FROM ASIENTO_DETALLE WHERE ASI_ID = :AsiId",
                new { HistId = histId, AsiId = id }, trans);

            // 3. Update Current Record (Increment Version)
            conn.Execute(@"
                UPDATE ASIENTO SET 
                    ASI_FECHA = :Fecha,
                    ASI_DESCRIPCION = :Desc,
                    ASI_TOTAL_DEBITO = :Debito,
                    ASI_TOTAL_CREDITO = :Credito,
                    VERSION = VERSION + 1,
                    USUARIO_MODIFICACION = :User,
                    FECHA_MODIFICACION = SYSDATE
                WHERE ASI_ID = :id",
                new {
                    Fecha = req.Fecha,
                    Desc = req.Descripcion,
                    Debito = req.TotalDebito,
                    Credito = req.TotalCredito,
                    User = userId,
                    id
                }, trans);

            // 4. Replace Details
            conn.Execute("DELETE FROM ASIENTO_DETALLE WHERE ASI_ID = :id", new { id }, trans);

            var sqlDet = @"INSERT INTO ASIENTO_DETALLE (ASI_ID, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE)
                           VALUES (:AsiId, :Cuenta, :Tercero, :Desc, :Debito, :Credito, :Base)";

            foreach(var det in req.Detalles) {
                conn.Execute(sqlDet, new {
                    AsiId = id,
                    Cuenta = det.CuentaCodigo,
                    Tercero = det.TerceroId,
                    Desc = det.Descripcion ?? req.Descripcion,
                    Debito = det.Debito,
                    Credito = det.Credito,
                    Base = det.Base
                }, trans);
            }

            trans.Commit();
            return Ok(new { success = true, version = current.VERSION + 1 });

        } catch (Exception ex) {
            trans.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/anular")]
    public IActionResult Anulate(int id, [FromBody] dynamic body)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var trans = conn.BeginTransaction();
        try {
            var motivo = (string)body.motivo ?? "ANULACIÓN MANUAL";
            var userId = "ADMIN";

            // Archive Current
            var current = conn.QueryFirstOrDefault("SELECT * FROM ASIENTO WHERE ASI_ID = :id", new { id }, trans);
            if (current == null) return NotFound();

             var histId = conn.ExecuteScalar<int>("SELECT SEQ_ASIENTO_HIST.NEXTVAL FROM dual", transaction: trans);
            
            conn.Execute(@"
                INSERT INTO ASIENTO_HISTORIAL (HIST_ID, ASI_ID, VERSION, ASI_NUMERO, ASI_FECHA, ASI_DESCRIPCION, ASI_ESTADO, 
                                             ASI_TOTAL_DEBITO, ASI_TOTAL_CREDITO, USUARIO_ID, FECHA_CREACION, MOTIVO_CAMBIO)
                VALUES (:HistId, :AsiId, :Version, :Numero, :Fecha, :Desc, :Estado, :Debito, :Credito, :User, :FecCre, :Motivo)",
                new {
                    HistId = histId,
                    AsiId = current.ASI_ID,
                    Version = current.VERSION,
                    Numero = current.ASI_NUMERO,
                    Fecha = current.ASI_FECHA,
                    Desc = current.ASI_DESCRIPCION,
                    Estado = current.ASI_ESTADO,
                    Debito = current.ASI_TOTAL_DEBITO,
                    Credito = current.ASI_TOTAL_CREDITO,
                    User = current.USUARIO_ID,
                    FecCre = current.FECHA_CREACION,
                    Motivo = motivo
                }, trans);
            
             // Archive Details
            conn.Execute(@"
                INSERT INTO ASIENTO_DETALLE_HIST (HIST_DET_ID, HIST_ID, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE)
                SELECT SEQ_ASIENTO_DET_HIST.NEXTVAL, :HistId, CUENTA_CODIGO, TERCERO_ID, DET_DESCRIPCION, DET_DEBITO, DET_CREDITO, DET_BASE
                FROM ASIENTO_DETALLE WHERE ASI_ID = :AsiId",
                new { HistId = histId, AsiId = id }, trans);

            // Update Status
            conn.Execute("UPDATE ASIENTO SET ASI_ESTADO = 'ANULADO', VERSION = VERSION + 1, USUARIO_MODIFICACION = :User, FECHA_MODIFICACION = SYSDATE WHERE ASI_ID = :id", 
                new { User = userId, id }, trans);
            
            trans.Commit();
            return Ok(new { success = true });
        } catch (Exception ex) {
            trans.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    // Models
    public class AsientoRequest {
        public string Numero { get; set; }
        public DateTime Fecha { get; set; }
        public string Descripcion { get; set; }
        public decimal TotalDebito { get; set; }
        public decimal TotalCredito { get; set; }
        public List<DetalleRequest> Detalles { get; set; }
    }

    public class DetalleRequest {
        public string CuentaCodigo { get; set; }
        public string TerceroId { get; set; }
        public string Descripcion { get; set; }
        public decimal Debito { get; set; }
        public decimal Credito { get; set; }
        public decimal Base { get; set; }
    }
}
