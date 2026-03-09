using Microsoft.AspNetCore.Mvc;
using Cyber.Models;
using Cyber.Services;
using Dapper;

namespace Cyber.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{   
    private readonly DatabaseService _db;
    private readonly AuthService _auth;

    public UsersController(DatabaseService db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpGet("login-debug")]
    public IActionResult LoginDebug(string u, string p)
    {
        try {
            using var conn = _db.GetConnection();
            var user = conn.QueryFirstOrDefault<User>("SELECT ID as Id, USERNAME as Username, PASSWORD_HASH as Password, EMAIL as Email, ROLE as Role, CREATED_AT as CreatedAt FROM USERS WHERE USERNAME = :u", new { u = u });
            if (user == null) return Unauthorized(new { error = "User not found" });
            if (!BCrypt.Net.BCrypt.Verify(p, user.Password)) return Unauthorized(new { error = "Invalid password" });
            return Ok(new { token = _auth.GenerateToken(user), user = new { user.Username, user.Email, user.Role } });
        } catch (Exception ex) {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        try {
            if (request == null) return BadRequest(new { error = "Null request" });

            using var conn = _db.GetConnection();
            var user = conn.QueryFirstOrDefault<User>("SELECT ID as Id, USERNAME as Username, PASSWORD_HASH as Password, EMAIL as Email, ROLE as Role, CREATED_AT as CreatedAt FROM USERS WHERE USERNAME = :u", new { u = request.Username });

            if (user == null)
            {
                return Unauthorized(new { error = "User not found" });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
            {
                return Unauthorized(new { error = "Invalid password" });
            }

            var token = _auth.GenerateToken(user);
            return Ok(new { token, user = new { user.Username, user.Email, user.Role } });
        } catch (Exception ex) {
            return StatusCode(500, new { error = "Oracle Error: " + ex.Message });
        }
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] User user)
    {
        user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
        using var conn = _db.GetConnection();
        try {
            var sql = "INSERT INTO USERS (USERNAME, PASSWORD_HASH, EMAIL, ROLE) VALUES (:Username, :Password, :Email, :Role)";
            conn.Execute(sql, user);
            return Ok(new { message = "User registered successfully" });
        } catch (Exception ex) {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { 
            database = _db.GetDbType(), 
            connection = _db.TestConnection(), 
            status = "Online" 
        });
    }

    [HttpGet("tercero-schema")]
    public IActionResult GetTerceroSchema()
    {
        try {
            using var conn = _db.GetConnection();
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
}
