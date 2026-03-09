using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Dapper;
using Cyber.Services;

namespace Cyber.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly DatabaseService _db;

    public ReportesController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet("balance-prueba")]
    public IActionResult BalancePrueba([FromQuery] DateTime? inicio, [FromQuery] DateTime? fin)
    {
        using var conn = _db.GetConnection();
        var sql = @"
            SELECT 
                d.CUENTA_CODIGO,
                c.CUENNOM AS NOMBRE_CUENTA,
                SUM(d.DET_DEBITO) AS TOTAL_DEBITO,
                SUM(d.DET_CREDITO) AS TOTAL_CREDITO,
                (SUM(d.DET_DEBITO) - SUM(d.DET_CREDITO)) AS SALDO_NETO
            FROM ASIENTO_DETALLE d
            JOIN ASIENTO a ON d.ASI_ID = a.ASI_ID
            LEFT JOIN CUENTA c ON TO_CHAR(c.CUENCOR) = d.CUENTA_CODIGO -- Adjusted Join Condition based on Schema
            WHERE a.ASI_ESTADO = 'APROBADO' OR a.ASI_ESTADO = 'BORRADOR' -- Include Drafts for now
            AND (a.ASI_FECHA >= :Inicio OR :Inicio IS NULL)
            AND (a.ASI_FECHA <= :Fin OR :Fin IS NULL)
            GROUP BY d.CUENTA_CODIGO, c.CUENNOM
            ORDER BY d.CUENTA_CODIGO";
        
        // Note: Joining CUENTA might be tricky if keys mismatch (varchar vs number). 
        // Assuming CUENCOR is the main ID
        
        try {
            var data = conn.Query(sql, new { Inicio = inicio, Fin = fin });
            return Ok(data);
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }
}
