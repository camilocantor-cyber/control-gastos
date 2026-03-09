using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Cyber.Models;
using Cyber.Services;
using Dapper;
using System.Collections.Generic;
using System.Linq;

namespace Cyber.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PUCController : ControllerBase
{
    private readonly DatabaseService _db;

    public PUCController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        var accounts = conn.Query<ChartOfAccount>("SELECT * FROM CHART_OF_ACCOUNTS ORDER BY CODE");
        return Ok(accounts);
    }

    [HttpGet("{code}")]
    public IActionResult GetByCode(string code)
    {
        using var conn = _db.GetConnection();
        var account = conn.QueryFirstOrDefault<ChartOfAccount>("SELECT * FROM CHART_OF_ACCOUNTS WHERE CODE = :c", new { c = code });
        if (account == null) return NotFound();
        return Ok(account);
    }

    [HttpPost]
    public IActionResult Create([FromBody] ChartOfAccount account)
    {
        using var conn = _db.GetConnection();
        try {
            // Validation: Hierarchy
            if (!string.IsNullOrEmpty(account.ParentCode))
            {
                var parent = conn.QueryFirstOrDefault("SELECT CODE FROM CHART_OF_ACCOUNTS WHERE CODE = :p", new { p = account.ParentCode });
                if (parent == null) return BadRequest(new { error = $"Parent account '{account.ParentCode}' does not exist." });
            }

            // Validation: Level 1-3 shouldn't accept movements by default (Business Rule)
            if (account.Level <= 3 && account.AcceptsMovement)
            {
                return BadRequest(new { error = "Major accounts (Level 1-3) usually do not accept direct movements." });
            }

            var sql = @"INSERT INTO CHART_OF_ACCOUNTS (ID, CODE, NAME, ACCOUNT_TYPE, LEVEL, PARENT_CODE, NATURE, ACCEPTS_MOVEMENT, DESCRIPTION, IS_ACTIVE) 
                        VALUES (:Id, :Code, :Name, :AccountType, :Level, :ParentCode, :Nature, :AcceptsMovement, :Description, :IsActive)";
            conn.Execute(sql, new {
                account.Id,
                account.Code,
                account.Name,
                account.AccountType,
                account.Level,
                account.ParentCode,
                account.Nature,
                AcceptsMovement = account.AcceptsMovement ? 1 : 0,
                account.Description,
                IsActive = account.IsActive ? 1 : 0
            });
            return Ok(account);
        } catch (Exception ex) {
            if (ex.Message.Contains("UNIQUE") || ex.Message.Contains("ORA-00001"))
                return BadRequest(new { error = $"The account code '{account.Code}' already exists." });
            
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] ChartOfAccount account)
    {
        using var conn = _db.GetConnection();
        try {
            var sql = @"UPDATE CHART_OF_ACCOUNTS SET 
                        NAME = :Name, 
                        ACCOUNT_TYPE = :AccountType, 
                        LEVEL = :Level, 
                        PARENT_CODE = :ParentCode, 
                        NATURE = :Nature, 
                        ACCEPTS_MOVEMENT = :AcceptsMovement, 
                        DESCRIPTION = :Description, 
                        IS_ACTIVE = :IsActive 
                        WHERE ID = :Id";
            conn.Execute(sql, new {
                account.Name,
                account.AccountType,
                account.Level,
                account.ParentCode,
                account.Nature,
                AcceptsMovement = account.AcceptsMovement ? 1 : 0,
                account.Description,
                IsActive = account.IsActive ? 1 : 0,
                Id = id
            });
            return Ok(new { message = "Updated successfully" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        using var conn = _db.GetConnection();
        try {
            // Validation: Cannot delete if has children
            var account = conn.QueryFirstOrDefault<ChartOfAccount>("SELECT CODE FROM CHART_OF_ACCOUNTS WHERE ID = :Id", new { Id = id });
            if (account != null)
            {
                var childrenCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM CHART_OF_ACCOUNTS WHERE PARENT_CODE = :p", new { p = account.Code });
                if (childrenCount > 0) return BadRequest(new { error = "Cannot delete an account that has sub-accounts." });
            }

            conn.Execute("DELETE FROM CHART_OF_ACCOUNTS WHERE ID = :Id", new { Id = id });
            return Ok(new { message = "Deleted successfully" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }
}
