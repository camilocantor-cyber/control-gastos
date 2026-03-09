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
public class JournalController : ControllerBase
{
    private readonly DatabaseService _db;

    public JournalController(DatabaseService db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        using var conn = _db.GetConnection();
        var sql = "SELECT * FROM JOURNAL_ENTRIES ORDER BY ENTRY_DATE DESC, ENTRY_NUMBER DESC";
        var entries = conn.Query<JournalEntry>(sql);
        return Ok(entries);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(string id)
    {
        using var conn = _db.GetConnection();
        // Master
        var entry = conn.QueryFirstOrDefault<JournalEntry>("SELECT * FROM JOURNAL_ENTRIES WHERE ID = :id", new { id });
        if (entry == null) return NotFound();

        // Details
        var detailsSql = @"
            SELECT d.*, c.NAME as AccountName 
            FROM JOURNAL_ENTRY_DETAILS d 
            LEFT JOIN CHART_OF_ACCOUNTS c ON d.ACCOUNT_CODE = c.CODE 
            WHERE d.JOURNAL_ENTRY_ID = :id 
            ORDER BY d.LINE_NUMBER";
        
        var details = conn.Query<JournalLine>(detailsSql, new { id });
        entry.Details = details.ToList();

        return Ok(entry);
    }

    [HttpPost]
    public IActionResult Create([FromBody] JournalEntry entry)
    {
        using var conn = _db.GetConnection();
        conn.Open();
        using var transaction = conn.BeginTransaction();
        
        try {
            // 1. Generate Number (Simple Year-Sequence Logic)
            var yearPrefix = DateTime.Now.Year.ToString();
            // Note: In real production, use DB sequence or atomic counter. Here we do a simple max check for MVP.
            var lastNum = conn.ExecuteScalar<string>("SELECT MAX(ENTRY_NUMBER) FROM JOURNAL_ENTRIES WHERE ENTRY_NUMBER LIKE :p", new { p = $"{yearPrefix}-%" });
            
            int nextSeq = 1;
            if (!string.IsNullOrEmpty(lastNum))
            {
                var parts = lastNum.Split('-');
                if (parts.Length > 1 && int.TryParse(parts[1], out int currentSeq))
                {
                    nextSeq = currentSeq + 1;
                }
            }
            entry.EntryNumber = $"{yearPrefix}-{nextSeq:D6}";
            entry.Status = "DRAFT";
            entry.EntryDate = DateTime.Now;

            // 2. Validate Balance
            decimal totalDebit = entry.Details.Sum(d => d.DebitAmount);
            decimal totalCredit = entry.Details.Sum(d => d.CreditAmount);

            if (totalDebit != totalCredit)
            {
                return BadRequest(new { error = $"Entry is not balanced. Debit: {totalDebit}, Credit: {totalCredit}" });
            }

            entry.TotalDebit = totalDebit;
            entry.TotalCredit = totalCredit;

            // 3. Insert Header
            var sqlHeader = @"INSERT INTO JOURNAL_ENTRIES 
                (ID, ENTRY_NUMBER, ENTRY_DATE, DESCRIPTION, REFERENCE, STATUS, TOTAL_DEBIT, TOTAL_CREDIT, CREATED_BY)
                VALUES 
                (:Id, :EntryNumber, :EntryDate, :Description, :Reference, :Status, :TotalDebit, :TotalCredit, :CreatedBy)";
            
            conn.Execute(sqlHeader, new {
                entry.Id,
                entry.EntryNumber,
                entry.EntryDate,
                entry.Description,
                entry.Reference,
                entry.Status,
                entry.TotalDebit,
                entry.TotalCredit,
                CreatedBy = User.Identity?.Name ?? "System"
            }, transaction);

            // 4. Insert Details
            var sqlDetail = @"INSERT INTO JOURNAL_ENTRY_DETAILS 
                (ID, JOURNAL_ENTRY_ID, LINE_NUMBER, ACCOUNT_CODE, DESCRIPTION, DEBIT_AMOUNT, CREDIT_AMOUNT)
                VALUES 
                (:Id, :JournalEntryId, :LineNumber, :AccountCode, :Description, :DebitAmount, :CreditAmount)";

            int lineNum = 1;
            foreach (var line in entry.Details)
            {
                line.Id = Guid.NewGuid().ToString();
                line.JournalEntryId = entry.Id;
                line.LineNumber = lineNum++;
                
                conn.Execute(sqlDetail, new {
                    line.Id,
                    line.JournalEntryId,
                    line.LineNumber,
                    line.AccountCode,
                    line.Description,
                    line.DebitAmount,
                    line.CreditAmount
                }, transaction);
            }

            transaction.Commit();
            return Ok(entry);

        } catch (Exception ex) {
            transaction.Rollback();
            return BadRequest(new { error = ex.Message });
        }
    }
}
