using System.Data;
using Microsoft.Data.Sqlite;
using Oracle.ManagedDataAccess.Client;
using Dapper;
using Microsoft.Extensions.Configuration;
using BCrypt.Net;

namespace Cyber.Services;

public class DatabaseService
{
    private readonly string _oracleConnStr;
    private readonly string _sqliteConnStr = "Data Source=cyber.db";
    private bool _useSqlite = false;

    public DatabaseService(IConfiguration configuration)
    {
        _oracleConnStr = configuration.GetConnectionString("OracleConnection");
        CheckConnection();
    }

    private void CheckConnection()
    {
        try
        {
            using var conn = new OracleConnection(_oracleConnStr);
            conn.Open();
            _useSqlite = false;
            Console.WriteLine("--> [SUCCESS] Oracle 11g connected on Port 1522.");
            InitializeDatabase();
        }
        catch (Exception ex)
        {
            _useSqlite = true;
            Console.WriteLine($" --> Oracle Connection Failed (1522): {ex.Message}");
            InitializeDatabase();
        }
    }

    private void InitializeDatabase()
    {
        using var conn = GetConnection();
        
        try {
            if (_useSqlite)
            {
                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS USERS (
                        ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        USERNAME TEXT UNIQUE,
                        PASSWORD TEXT,
                        EMAIL TEXT,
                        ROLE TEXT,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS CHART_OF_ACCOUNTS (
                        ID TEXT PRIMARY KEY,
                        CODE TEXT NOT NULL UNIQUE,
                        NAME TEXT NOT NULL,
                        ACCOUNT_TYPE TEXT NOT NULL,
                        ""LEVEL"" INTEGER NOT NULL,
                        PARENT_CODE TEXT,
                        NATURE TEXT NOT NULL,
                        ACCEPTS_MOVEMENT INTEGER DEFAULT 0,
                        DESCRIPTION TEXT,
                        IS_ACTIVE INTEGER DEFAULT 1,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS JOURNAL_ENTRIES (
                        ID TEXT PRIMARY KEY,
                        ENTRY_NUMBER TEXT NOT NULL UNIQUE,
                        ENTRY_DATE DATETIME NOT NULL,
                        DESCRIPTION TEXT NOT NULL,
                        REFERENCE TEXT,
                        STATUS TEXT DEFAULT 'DRAFT',
                        TOTAL_DEBIT DECIMAL(15,2) DEFAULT 0,
                        TOTAL_CREDIT DECIMAL(15,2) DEFAULT 0,
                        CREATED_BY TEXT,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
                        POSTED_AT DATETIME,
                        VOIDED_AT DATETIME
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS JOURNAL_ENTRY_DETAILS (
                        ID TEXT PRIMARY KEY,
                        JOURNAL_ENTRY_ID TEXT NOT NULL,
                        LINE_NUMBER INTEGER NOT NULL,
                        ACCOUNT_CODE TEXT NOT NULL,
                        DESCRIPTION TEXT,
                        DEBIT_AMOUNT DECIMAL(15,2) DEFAULT 0,
                        CREDIT_AMOUNT DECIMAL(15,2) DEFAULT 0,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(JOURNAL_ENTRY_ID) REFERENCES JOURNAL_ENTRIES(ID) ON DELETE CASCADE
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS ACCOUNTING_CONCEPTS (
                        ID TEXT PRIMARY KEY,
                        CODE TEXT NOT NULL UNIQUE,
                        NAME TEXT NOT NULL,
                        CONCEPT_TYPE TEXT NOT NULL,
                        DESCRIPTION TEXT,
                        IS_ACTIVE INTEGER DEFAULT 1,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS CONCEPT_ACCOUNT_MAPPINGS (
                        ID TEXT PRIMARY KEY,
                        CONCEPT_ID TEXT NOT NULL,
                        ACCOUNT_CODE TEXT NOT NULL,
                        MOVEMENT_TYPE TEXT NOT NULL,
                        POSITION INTEGER NOT NULL,
                        IS_MAIN INTEGER DEFAULT 0,
                        DESCRIPTION TEXT,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(CONCEPT_ID) REFERENCES ACCOUNTING_CONCEPTS(ID) ON DELETE CASCADE
                    )");

                conn.Execute(@"
                    CREATE TABLE IF NOT EXISTS PROVIDERS (
                        ID TEXT PRIMARY KEY,
                        NIT TEXT UNIQUE,
                        NAME TEXT NOT NULL,
                        EMAIL TEXT,
                        PHONE TEXT,
                        ADDRESS TEXT,
                        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");
            }
            else
            {
                // Oracle 11g creation logic
                conn.Execute(@"
                DECLARE
                    v_count NUMBER;
                BEGIN
                    -- Table USERS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'USERS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE USERS (
                            ID NUMBER PRIMARY KEY,
                            USERNAME VARCHAR2(100) UNIQUE,
                            PASSWORD VARCHAR2(255),
                            EMAIL VARCHAR2(150),
                            ROLE VARCHAR2(50),
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )';
                        EXECUTE IMMEDIATE 'CREATE SEQUENCE USERS_SEQ START WITH 1 INCREMENT BY 1';
                        EXECUTE IMMEDIATE 'CREATE OR REPLACE TRIGGER USERS_TRG 
                            BEFORE INSERT ON USERS FOR EACH ROW 
                            BEGIN IF :NEW.ID IS NULL THEN SELECT USERS_SEQ.NEXTVAL INTO :NEW.ID FROM DUAL; END IF; END;';
                    END IF;

                    -- Table CHART_OF_ACCOUNTS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'CHART_OF_ACCOUNTS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE CHART_OF_ACCOUNTS (
                            ID VARCHAR2(50) PRIMARY KEY,
                            CODE VARCHAR2(50) NOT NULL UNIQUE,
                            NAME VARCHAR2(200) NOT NULL,
                            ACCOUNT_TYPE VARCHAR2(50) NOT NULL,
                            ""LEVEL"" NUMBER NOT NULL,
                            PARENT_CODE VARCHAR2(50),
                            NATURE VARCHAR2(20) NOT NULL,
                            ACCEPTS_MOVEMENT NUMBER(1) DEFAULT 0,
                            DESCRIPTION VARCHAR2(500),
                            IS_ACTIVE NUMBER(1) DEFAULT 1,
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )';
                    END IF;

                    -- Table JOURNAL_ENTRIES
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'JOURNAL_ENTRIES';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE JOURNAL_ENTRIES (
                            ID VARCHAR2(50) PRIMARY KEY,
                            ENTRY_NUMBER VARCHAR2(50) NOT NULL UNIQUE,
                            ENTRY_DATE TIMESTAMP NOT NULL,
                            DESCRIPTION VARCHAR2(1000) NOT NULL,
                            REFERENCE VARCHAR2(100),
                            STATUS VARCHAR2(20) DEFAULT ''DRAFT'',
                            TOTAL_DEBIT NUMBER(15,2) DEFAULT 0,
                            TOTAL_CREDIT NUMBER(15,2) DEFAULT 0,
                            CREATED_BY VARCHAR2(50),
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            POSTED_AT TIMESTAMP,
                            VOIDED_AT TIMESTAMP
                        )';
                    END IF;

                    -- Table JOURNAL_ENTRY_DETAILS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'JOURNAL_ENTRY_DETAILS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE JOURNAL_ENTRY_DETAILS (
                            ID VARCHAR2(50) PRIMARY KEY,
                            JOURNAL_ENTRY_ID VARCHAR2(50) NOT NULL,
                            LINE_NUMBER NUMBER(5) NOT NULL,
                            ACCOUNT_CODE VARCHAR2(50) NOT NULL,
                            DESCRIPTION VARCHAR2(1000),
                            DEBIT_AMOUNT NUMBER(15,2) DEFAULT 0,
                            CREDIT_AMOUNT NUMBER(15,2) DEFAULT 0,
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT FK_JED_HEADER FOREIGN KEY (JOURNAL_ENTRY_ID) REFERENCES JOURNAL_ENTRIES(ID) ON DELETE CASCADE
                        )';
                    END IF;

                    -- Table ACCOUNTING_CONCEPTS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'ACCOUNTING_CONCEPTS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE ACCOUNTING_CONCEPTS (
                            ID VARCHAR2(50) PRIMARY KEY,
                            CODE VARCHAR2(20) NOT NULL UNIQUE,
                            NAME VARCHAR2(255) NOT NULL,
                            CONCEPT_TYPE VARCHAR2(50) NOT NULL,
                            DESCRIPTION VARCHAR2(1000),
                            IS_ACTIVE NUMBER(1) DEFAULT 1,
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )';
                    END IF;

                    -- Table CONCEPT_ACCOUNT_MAPPINGS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'CONCEPT_ACCOUNT_MAPPINGS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE CONCEPT_ACCOUNT_MAPPINGS (
                            ID VARCHAR2(50) PRIMARY KEY,
                            CONCEPT_ID VARCHAR2(50) NOT NULL,
                            ACCOUNT_CODE VARCHAR2(50) NOT NULL,
                            MOVEMENT_TYPE VARCHAR2(10) NOT NULL,
                            POSITION NUMBER(5) NOT NULL,
                            IS_MAIN NUMBER(1) DEFAULT 0,
                            DESCRIPTION VARCHAR2(1000),
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT FK_CAM_CONCEPT FOREIGN KEY (CONCEPT_ID) REFERENCES ACCOUNTING_CONCEPTS(ID) ON DELETE CASCADE
                        )';
                    END IF;

                    -- Table PROVIDERS
                    SELECT count(*) INTO v_count FROM user_tables WHERE table_name = 'PROVIDERS';
                    IF v_count = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE TABLE PROVIDERS (
                            ID VARCHAR2(50) PRIMARY KEY,
                            NIT VARCHAR2(20) UNIQUE,
                            NAME VARCHAR2(200) NOT NULL,
                            EMAIL VARCHAR2(150),
                            PHONE VARCHAR2(50),
                            ADDRESS VARCHAR2(200),
                            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )';
                    END IF;
                END;");
            }
                
            // Default Admin User
            int userCount = 0;
            try {
                userCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM USERS");
            } catch {
                // If it fails, table might still be creating or some 11g delay
            }

            if (userCount == 0)
            {
                var hash = BCrypt.Net.BCrypt.HashPassword("admin123");
                conn.Execute("INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES (:u, :p, :e, :r)", 
                    new { u = "admin", p = hash, e = "admin@cyber.com", r = "Admin" });
                Console.WriteLine("--> Default Admin created: admin / admin123");
            }
        } catch (Exception ex) {
            Console.WriteLine($"--> DB Init Error: {ex.Message}");
        }
    }

    public IDbConnection GetConnection()
    {
        if (_useSqlite) return new SqliteConnection(_sqliteConnStr);
        return new OracleConnection(_oracleConnStr);
    }

    public string GetDbType() => _useSqlite ? "SQLite (Fallback)" : "Oracle 11g (Active)";

    public string TestConnection()
    {
        try
        {
            using var conn = GetConnection();
            conn.Open();
            return $"OK: {GetDbType()}";
        }
        catch (Exception ex)
        {
            return $"FAIL: {ex.Message}";
        }
    }
}
