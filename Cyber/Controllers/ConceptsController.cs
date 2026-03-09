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
public class ConceptsController : ControllerBase
{
    private readonly DatabaseService _db;

    public ConceptsController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        var sql = "SELECT * FROM ACCOUNTING_CONCEPTS WHERE IS_ACTIVE = 1 ORDER BY NAME";
        var concepts = conn.Query<AccountingConcept>(sql).ToList();

        // Populate mappings
        foreach(var concept in concepts)
        {
            var mapSql = "SELECT * FROM CONCEPT_ACCOUNT_MAPPINGS WHERE CONCEPT_ID = :id ORDER BY POSITION";
            concept.Mappings = conn.Query<ConceptMapping>(mapSql, new { id = concept.Id }).ToList();
        }

        return Ok(concepts);
    }

    [HttpPost]
    public IActionResult Create([FromBody] AccountingConcept concept)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();

        try {
            // Header
            var sql = @"INSERT INTO ACCOUNTING_CONCEPTS 
                (ID, CODE, NAME, CONCEPT_TYPE, DESCRIPTION, IS_ACTIVE) 
                VALUES (:Id, :Code, :Name, :ConceptType, :Description, :IsActive)";
            
            // Adjust booleans for Oracle (1/0)
            conn.Execute(sql, new {
                concept.Id,
                concept.Code,
                concept.Name,
                concept.ConceptType,
                concept.Description,
                IsActive = concept.IsActive ? 1 : 0
            }, transaction);

            // Details
            var sqlMap = @"INSERT INTO CONCEPT_ACCOUNT_MAPPINGS 
                (ID, CONCEPT_ID, ACCOUNT_CODE, MOVEMENT_TYPE, POSITION, IS_MAIN, DESCRIPTION) 
                VALUES (:Id, :ConceptId, :AccountCode, :MovementType, :Position, :IsMain, :Description)";

            int pos = 1;
            foreach(var map in concept.Mappings)
            {
                map.Id = Guid.NewGuid().ToString();
                map.ConceptId = concept.Id;
                map.Position = pos++;
                
                conn.Execute(sqlMap, new {
                    map.Id,
                    map.ConceptId,
                    map.AccountCode,
                    map.MovementType,
                    map.Position,
                    IsMain = map.IsMain ? 1 : 0,
                    map.Description
                }, transaction);
            }

            transaction.Commit();
            return Ok(concept);

        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }
}
