export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface Organization {
    id: string;
    name: string;
    plan: UserPlan;
    created_at: string;
    settings?: Record<string, any>;
    logo_url?: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'turista' | 'kommandant';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    organization_id?: string;
    available_organizations?: { id: string, name: string, role: UserRole, logo_url?: string }[];
    permissions?: string[]; // List of specific capability keys (e.g. 'access_reports')
    dashboard_widgets?: string[]; // List of widget IDs to display
}

export interface RoleCapability {
    id: string;
    role_name: UserRole | string;
    capability: string;
    description?: string;
}

export interface RoleDashboardConfig {
    id: string;
    role_name: UserRole | string;
    widget_id: string;
    order_index: number;
}

export type WorkflowStatus = 'draft' | 'active' | 'archived';

export interface WorkflowCategory {
    id: string;
    organization_id: string;
    name: string;
    color: string;
    created_at?: string;
}

export interface Workflow {
    id: string;
    organization_id: string;
    name: string;
    description: string;
    created_at: string;
    created_by: string;
    status: WorkflowStatus;
    version?: string;
    parent_id?: string;
    name_template?: string;
    is_public?: boolean;
    category_id?: string | null;
    category?: WorkflowCategory;
    details?: WorkflowDetail[]; // List of available master-detail folders for this workflow
    organizations?: { name: string };
}

export interface WorkflowDetail {
    id: string;
    workflow_id: string;
    name: string;
    description?: string;
    form_columns?: number;
    fields: FieldDefinition[];
    actions: AutomatedAction[];
}

export interface WorkflowTemplate {
    id: string;
    organization_id: string;
    workflow_id: string;
    name: string;
    file_path: string;
    file_size: number;
    created_at: string;
    created_by: string;
}

export type ActivityType = 'start' | 'task' | 'decision' | 'end' | 'subprocess' | 'wait' | 'sync';


export interface Transition {
    id: string;
    workflow_id: string;
    source_id: string;
    target_id: string;
    condition?: string;
    target_name?: string;
}

export type ProcessStatus = 'active' | 'completed' | 'cancelled' | 'waiting' | 'waiting_subprocess';

export interface ProcessInstance {
    id: string;
    organization_id: string;
    workflow_id: string;
    name: string;
    status: ProcessStatus;
    current_activity_id: string;
    created_at: string;
    created_by: string;
    assigned_user_id?: string;
    assigned_department_id?: string;
    assigned_position_id?: string;
    process_number?: number;
    parent_process_id?: string;
    waiting_subprocess_id?: string;
    wait_until?: string;
    wait_condition?: string;
}

export interface ProcessHistory {
    id: string;
    process_id: string;
    activity_id: string;
    action: 'started' | 'completed' | 'commented';
    comment?: string;
    data?: any;
    created_at: string;
    user_id: string;
}

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'provider' | 'select' | 'email' | 'currency' | 'textarea' | 'phone' | 'grid' | 'lookup' | 'location' | 'consecutivo' | 'label' | 'accordion' | 'attachment';

export interface GridColumn {
    id: string;
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    width?: string;
    options?: string[]; // For select type within grid
}

export interface FieldDefinition {
    id: string;
    activity_id: string;
    name: string;
    label?: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    description?: string;
    options?: string[]; // For select type, stored as JSON string or array
    min_value?: number;
    max_value?: number;
    max_length?: number;
    regex_pattern?: string;
    source_activity_id?: string;
    source_field_name?: string;
    order_index?: number;
    visibility_condition?: string; // Logic to show/hide field based on other field values
    default_value?: string;
    is_readonly?: boolean;
    // Database synchronization mapping
    db_column?: string;
    db_type?: string;
    db_nullable?: boolean;
    db_is_primary_key?: boolean;
    // For Grid type
    grid_columns?: GridColumn[]; // Columns for master-detail
    // For Lookup type
    lookup_entity?: string; // e.g., 'providers', 'users', 'departments'
    lookup_endpoint?: string; // In case we want external API lookups
    lookup_config?: {
        type: 'rest' | 'database';
        // Options for REST API
        url?: string;
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        search_param?: string;
        result_path?: string;

        // Options for Database Catalog Search
        table_name?: string;
        search_column?: string;

        // Shared options
        display_fields?: string[];
        value_field?: string;
        mapping?: Record<string, string>; // Maps response/row column names to current target form field names
    };
    consecutive_mask?: string; // e.g. "CON-EH1-YYYY-MM-####" for consecutivo type
    consecutive_id?: string; // Optional name for a specific sequence (e.g. "FACTURA_VENTA")
    location_mode?: 'coordinates' | 'postal_code'; // For location type
    parent_accordion_id?: string; // ID of the accordion field this field belongs to
    is_global_header?: boolean; // If true, this field will be shown as context in all subsequent activities
    rows?: number; // For textarea type, number of rows to display
    attachment_accept?: string; // For attachment type, e.g. ".pdf,.docx" or "image/*"
}

export interface ActivityField {
    id: string;
    process_id: string;
    activity_id: string;
    field_name: string;
    value: string;
}

export interface ProcessDetailRow {
    id: string;
    detail_id: string;
    created_at: string;
    created_by: string;
    data: Record<string, any>;
}

export type AssignmentType = 'manual' | 'position' | 'department' | 'department_and_position' | 'specific_user' | 'creator';
export type AssignmentStrategy = 'manual' | 'workload' | 'efficiency' | 'random' | 'claim' | 'cost' | 'skills' | 'shift' | 'weighted';

export type AutomatedActionType = 'none' | 'webhook' | 'soap' | 'finance' | 'email' | 'whatsapp' | 'document_generation';
export type ActionExecutionTiming = 'on_save_row' | 'on_submit_activity' | 'manual';

export interface AutomatedAction {
    id: string;
    type: AutomatedActionType;
    name: string;
    condition?: string;
    stop_on_failure?: boolean;
    execution_timing?: ActionExecutionTiming; // Specifically useful for actions inside Details
    config: {
        steps?: {
            id: string;
            url: string;
            method: string;
            headers?: Record<string, string>;
            body?: string;
            auth_type?: 'none' | 'bearer' | 'basic';
            auth_token?: string;
            output_variable?: string;
        }[];
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        auth_type?: 'none' | 'bearer' | 'basic';
        auth_token?: string;
        output_variable?: string;
        finance_url?: string;
        api_key?: string;
        amount?: string;
        description?: string;
        movement_type?: 'expense' | 'income';
        category?: string;
        provider?: string;
        concept_id?: string;
        email_from?: string;
        email_to?: string;
        email_cc?: string;
        email_subject?: string;
        email_body?: string;
        email_smtp_host?: string;
        email_smtp_port?: string;
        email_smtp_user?: string;
        email_smtp_pass?: string;
        email_smtp_secure?: boolean;
        whatsapp_number?: string;
        whatsapp_message?: string;
        whatsapp_provider?: 'evolution' | 'ultramsg' | 'meta' | 'generic';
        whatsapp_api_url?: string;
        whatsapp_token?: string;
        document_generation_template_id?: string;
        document_generation_filename_pattern?: string;
        document_generation_type?: 'generic' | 'template';
        document_generation_format?: 'pdf' | 'docx' | 'xlsx';
        document_generation_include_logo?: boolean;
    };
}

// Single updated Activity interface
export interface Activity {
    id: string;
    workflow_id: string;
    name: string;
    description?: string;
    type: ActivityType;
    x_pos: number;
    y_pos: number;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    sync_table?: string;
    fields?: FieldDefinition[];
    associated_details?: string[]; // IDs of WorkflowDetails linked to this activity
    detail_cardinalities?: Record<string, { mode: 'none' | '1_to_many' | 'min_x', min_items?: number, read_only?: boolean }>;
    due_date_hours?: number;
    sla_alert_hours?: number;
    enable_supervisor_alerts?: boolean;
    form_columns?: number;
    assignment_type?: AssignmentType;
    assignment_strategy?: AssignmentStrategy;
    assigned_position_id?: string;
    assigned_department_id?: string;
    assigned_user_id?: string;
    actions?: AutomatedAction[];
    is_public?: boolean;
    folder_completion_rule?: 'none' | 'and' | 'or';
    folder_completion_ids?: string[];
    require_save_before_folders?: boolean;
    subprocess_config?: {
        workflow_id: string;
        input_mapping: Record<string, string>;
        output_mapping: Record<string, string>;
    };
    wait_config?: {
        type: 'time' | 'condition';
        duration_hours?: number;
        target_date_field?: string;
        condition?: string;
    };
    sync_config?: {
        mode: 'synchronous' | 'async_single' | 'async_multiple';
    };
}

export interface Provider {
    id: string;
    organization_id: string;
    name: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    address?: string;
    created_at: string;
}

// Organizational Chart Types
export interface Department {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    parent_department_id?: string;
    allocation_percentage?: number; // % de reparto de ingresos
    allocation_rules?: string; // Reglas personalizadas de reparto
    created_at: string;
    updated_at: string;
}

export interface Position {
    id: string;
    organization_id: string;
    department_id?: string;
    title: string;
    description?: string;
    level: number;
    reports_to_position_id?: string;
    hourly_rate?: number;
    created_at: string;
    updated_at: string;
}

export interface EmployeePosition {
    id: string;
    user_id: string;
    position_id: string;
    is_primary: boolean;
    start_date: string;
    end_date?: string;
    created_at: string;
}

export interface DepartmentWithChildren extends Department {
    children?: DepartmentWithChildren[];
    positions?: Position[];
}

export interface PositionWithEmployees extends Position {
    employees?: {
        user_id: string;
        user_name?: string;
        user_email?: string;
        is_primary: boolean;
    }[];
    department?: Department;
}

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'custom_days';

export interface ScheduledProcess {
    id: string;
    organization_id: string;
    workflow_id: string;
    name: string;
    scheduled_at: string;
    is_recurring: boolean;
    recurrence_pattern: RecurrencePattern;
    recurrence_interval?: number; // e.g., every 8 days
    last_run_at?: string;
    created_at: string;
    created_by: string;
    status: 'pending' | 'cancelled' | 'active';
}
