using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Cyber.Models;
using Cyber.Services;
using Dapper;

namespace Cyber.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TercerosController : ControllerBase
{
    private readonly DatabaseService _db;

    public TercerosController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        var sql = "SELECT * FROM TERCERO ORDER BY TERCNOM";
        var terceros = conn.Query<Tercero>(sql);
        return Ok(terceros);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(string id)
    {
        using var conn = _db.GetConnection();
        var tercero = conn.QueryFirstOrDefault<Tercero>("SELECT * FROM TERCERO WHERE TERCCOD = :id", new { id });
        if (tercero == null) return NotFound();
        return Ok(tercero);
    }

    [HttpGet("test-columns")]
    [AllowAnonymous]
    public IActionResult TestColumns()
    {
        using var conn = _db.GetConnection();
        try {
            var columns = conn.Query<dynamic>(@"
                SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
                FROM user_tab_columns 
                WHERE table_name = 'TERCERO' 
                ORDER BY COLUMN_ID");
            return Ok(columns);
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public IActionResult Create([FromBody] Tercero tercero)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            // Set default values for required fields if not provided
            if (!tercero.TiptCod.HasValue) tercero.TiptCod = 1; // Default tipo identificación
            if (!tercero.RegiCod.HasValue) tercero.RegiCod = 1; // Default régimen
            if (!tercero.TpoTrcro.HasValue) tercero.TpoTrcro = 1; // Default tipo tercero
            
            var sql = @"INSERT INTO TERCERO 
                (TERCCOD, TIPTCOD, TERCNOM, TERCAPEL, TERCNOM2, TERCAPEL2, MAIL, DIRCCION, TLFNO, CDAD, REGICOD, TPO_TRCRO) 
                VALUES 
                (:TercCod, :TiptCod, :TercNom, :TercApel, :TercNom2, :TercApel2, :Mail, :Dirccion, :Tlfno, :Cdad, :RegiCod, :TpoTrcro)";
            
            conn.Execute(sql, tercero, transaction);
            transaction.Commit();
            return Ok(new { success = true, tercero });
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message, stack = ex.StackTrace });
        }
    }

    [HttpPost("test-create")]
    [AllowAnonymous]
    public IActionResult TestCreate([FromBody] Tercero tercero)
    {
        using var conn = _db.GetConnection();
        try {
            // Set default values for required fields if not provided
            if (!tercero.TiptCod.HasValue) tercero.TiptCod = 1; // Default tipo identificación
            if (!tercero.RegiCod.HasValue) tercero.RegiCod = 1; // Default régimen
            if (!tercero.TpoTrcro.HasValue) tercero.TpoTrcro = 1; // Default tipo tercero
            
            // First, let's see what columns exist
            var columns = conn.Query<string>("SELECT COLUMN_NAME FROM user_tab_columns WHERE table_name = 'TERCERO'").ToList();
            
            // Log what we're trying to insert
            var debugInfo = new {
                receivedData = tercero,
                availableColumns = columns,
                sqlToExecute = "INSERT INTO TERCERO (TERCCOD, TIPTCOD, TERCNOM, TERCAPEL, TERCNOM2, TERCAPEL2, MAIL, DIRCCION, TLFNO, CDAD, REGICOD, TPO_TRCRO) VALUES (:TercCod, :TiptCod, :TercNom, :TercApel, :TercNom2, :TercApel2, :Mail, :Dirccion, :Tlfno, :Cdad, :RegiCod, :TpoTrcro)"
            };
            
            var sql = @"INSERT INTO TERCERO 
                (TERCCOD, TIPTCOD, TERCNOM, TERCAPEL, TERCNOM2, TERCAPEL2, MAIL, DIRCCION, TLFNO, CDAD, REGICOD, TPO_TRCRO) 
                VALUES 
                (:TercCod, :TiptCod, :TercNom, :TercApel, :TercNom2, :TercApel2, :Mail, :Dirccion, :Tlfno, :Cdad, :RegiCod, :TpoTrcro)";
            
            conn.Execute(sql, tercero);
            return Ok(new { success = true, message = "Tercero creado exitosamente", tercero, debugInfo });
        } catch (Exception ex) {
            return BadRequest(new { 
                error = ex.Message, 
                innerException = ex.InnerException?.Message,
                stack = ex.StackTrace,
                receivedData = tercero
            });
        }
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] Tercero tercero)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        try {
            var sql = @"UPDATE TERCERO SET 
                TERCNOM = :TercNom,
                TERCAPEL = :TercApel,
                TERCNOM2 = :TercNom2,
                TERCAPEL2 = :TercApel2,
                MAIL = :Mail,
                DIRCCION = :Dirccion,
                TLFNO = :Tlfno,
                CDAD = :Cdad,
                TIPTCOD = :TiptCod,
                TPO_TRCRO = :TpoTrcro
                WHERE TERCCOD = :id";
            
            var affected = conn.Execute(sql, new {
                tercero.TercNom,
                tercero.TercApel,
                tercero.TercNom2,
                tercero.TercApel2,
                tercero.Mail,
                tercero.Dirccion,
                tercero.Tlfno,
                tercero.Cdad,
                tercero.TiptCod,
                tercero.TpoTrcro,
                id
            }, transaction);

            if (affected == 0) {
                transaction.Rollback();
                return NotFound();
            }
            
            transaction.Commit();
            return Ok(tercero);
        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        using var conn = _db.GetConnection();
        try {
            var affected = conn.Execute("DELETE FROM TERCERO WHERE TERCCOD = :id", new { id });
            if (affected == 0) return NotFound();
            return Ok(new { message = "Tercero eliminado" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }
}
